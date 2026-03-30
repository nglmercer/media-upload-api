import { register, login, validateSession, logout } from "./auth";
import { users, sessions } from "./schema";

const PORT = 5000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:5173",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function handleRegister(req: Request) {
  try {
    const body = await req.json();
    const result = await register(body.email, body.username, body.password);

    return new Response(JSON.stringify(result), {
      status: result.success ? 201 : 400,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Error en el servidor",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
}

async function handleLogin(req: Request) {
  try {
    const body = await req.json();
    const result = await login(body.email, body.password);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 401,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Error en el servidor",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
}

async function handleValidate(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const sessionId = authHeader?.replace("Bearer ", "");

  if (!sessionId) {
    return new Response(
      JSON.stringify({
        valid: false,
        message: "No session provided",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }

  const result = await validateSession(sessionId);

  return new Response(JSON.stringify(result), {
    status: result.valid ? 200 : 401,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

async function handleLogout(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const sessionId = authHeader?.replace("Bearer ", "");

  if (!sessionId) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "No session provided",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }

  const result = await logout(sessionId);

  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 400,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (url.pathname === "/api/auth/register" && req.method === "POST") {
      return handleRegister(req);
    }

    if (url.pathname === "/api/auth/login" && req.method === "POST") {
      return handleLogin(req);
    }

    if (url.pathname === "/api/auth/validate" && req.method === "GET") {
      return handleValidate(req);
    }

    if (url.pathname === "/api/auth/logout" && req.method === "POST") {
      return handleLogout(req);
    }

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    return new Response("Ruta no encontrada", {
      status: 404,
      headers: corsHeaders,
    });
  },
});

console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
console.log(`📁 Tablas creadas:`, {
  users: "users",
  sessions: "sessions",
  loginAttempts: "login_attempts",
});
