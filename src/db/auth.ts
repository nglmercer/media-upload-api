import { db } from "./db";
import { users, sessions, loginAttempts } from "./schema";
import { eq, or } from "drizzle-orm";
import { randomBytes } from "crypto";
/**const password = "super-secure-pa$$word";

const hash = await Bun.password.hash(password);
// => $argon2id$v=19$m=65536,t=2,p=1$tFq+9AVr1bfPxQdh6E8DQRhEXg/M/SqYCNu6gVdRRNs$GzJ8PuBi+K+BVojzPfS5mjnC8OpLGtv8KJqF99eP6a4

const isMatch = await Bun.password.verify(password, hash);
// => true
//  */
export async function register(
  email: string,
  username: string,
  password: string
) {
  try {
    if (!email || !username || !password) {
      throw new Error("Email, username y contraseña son requeridos");
    }

    if (password.length < 8) {
      throw new Error("La contraseña debe tener al menos 8 caracteres");
    }

    const existingEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingEmail.length > 0) {
      throw new Error("Este email ya está registrado");
    }

    const existingUsername = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUsername.length > 0) {
      throw new Error("Este nombre de usuario ya está registrado");
    }

    const passwordHash = await Bun.password.hash(password);

    const result = await db.insert(users).values({
      email,
      username,
      passwordHash,
    });

    return {
      success: true,
      message: "Usuario registrado exitosamente",
      result: result,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export async function login(identifier: string, password: string) {
  try {
    if (!identifier || !password) {
      throw new Error("Usuario/Email y contraseña son requeridos");
    }

    const user = await db
      .select()
      .from(users)
      .where(or(eq(users.email, identifier), eq(users.username, identifier)))
      .limit(1);

    if (user.length === 0) {
      await db.insert(loginAttempts).values({
        email: identifier,
        success: 0,
      });
      throw new Error("Credenciales inválidas");
    }

    const isPasswordValid = await Bun.password.verify(
      password,
      user[0].passwordHash
    );

    if (!isPasswordValid) {
      await db.insert(loginAttempts).values({
        email: identifier,
        success: 0,
      });
      throw new Error("Credenciales inválidas");
    }

    const sessionId = randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await db.insert(sessions).values({
      id: sessionId,
      userId: user[0].id,
      expiresAt,
    });

    await db.insert(loginAttempts).values({
      email: user[0].email,
      success: 1,
    });

    return {
      success: true,
      message: "Login exitoso",
      sessionId,
      userId: user[0].id,
      username: user[0].username,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export async function validateSession(sessionId: string) {
  try {
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (session.length === 0) {
      throw new Error("Sesión no válida");
    }

    if (session[0].expiresAt < Date.now()) {
      await db.delete(sessions).where(eq(sessions.id, sessionId));
      throw new Error("Sesión expirada");
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session[0].userId))
      .limit(1);

    return {
      valid: true,
      user: {
        id: user[0].id,
        email: user[0].email,
        username: user[0].username,
      },
    };
  } catch (error) {
    return {
      valid: false,
      message: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export async function logout(sessionId: string) {
  try {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return {
      success: true,
      message: "Logout exitoso",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
