import { getAuth } from "../middleware/auth";
import { json, type ServerContext } from "../utils/vanilla-http";
import { register, login, logout } from "../db/auth";

/**
 * POST /api/auth/register - Register a new user
 */
async function registerHandler(req: Request) {
  try {
    const body = await req.json();
    const result = await register(body.email, body.username, body.password);
    return json(result, result.success ? 201 : 400);
  } catch (error) {
    return json({ success: false, message: "Invalid request body" }, 400);
  }
}

/**
 * POST /api/auth/login - Login and get session
 */
async function loginHandler(req: Request) {
  try {
    const body = await req.json();
    const identifier = body.identifier || body.email || body.username;
    const result = await login(identifier, body.password);
    return json(result, result.success ? 200 : 401);
  } catch (error) {
    return json({ success: false, message: "Invalid request body" }, 400);
  }
}

/**
 * POST /api/auth/logout - Logout current session
 */
async function logoutHandler(req: Request, ctx: ServerContext) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ||
                ctx.url.searchParams.get("token") ||
                req.headers.get("X-Auth-Token");

  if (!token) {
    return json({ success: false, message: "No session token provided" }, 400);
  }

  const result = await logout(token);
  return json(result);
}

/**
 * GET /api/auth/validate - Validate current token
 */
async function validateHandler(req: Request, ctx: ServerContext) {
  const auth = getAuth(ctx);
  
  if (!auth.authenticated) {
    return json({ 
      valid: false, 
      message: 'No authentication' 
    });
  }
  
  return json({ 
    valid: true, 
    userId: auth.userId 
  });
}

/**
 * GET /api/auth/info - Get authenticated user info
 */
async function infoHandler(req: Request, ctx: ServerContext) {
  const auth = getAuth(ctx);
  
  if (!auth.authenticated) {
    return json({ 
      authenticated: false,
      message: 'Not authenticated' 
    });
  }
  
  return json({
    authenticated: true,
    userId: auth.userId,
    label: auth.tokenLabel,
    permissions: auth.permissions,
  });
}

/**
 * GET /api/auth/permissions - Get current permissions
 */
async function permissionsHandler(req: Request, ctx: ServerContext) {
  const auth = getAuth(ctx);
  
  return json({
    permissions: auth.permissions,
  });
}

/**
 * Main Auth Router (Vanilla Switch-case)
 */
export async function authRouter(req: Request, ctx: ServerContext): Promise<Response | null> {
  const { pathname } = ctx.url;
  const { method } = req;

  // Authentication Routes
  if (method === 'POST') {
    switch (pathname) {
      case '/api/auth/register':
        return registerHandler(req);
      case '/api/auth/login':
        return loginHandler(req);
      case '/api/auth/logout':
        return logoutHandler(req, ctx);
    }
  }

  if (method === 'GET') {
    switch (pathname) {
      case '/api/auth/validate':
        return validateHandler(req, ctx);
      case '/api/auth/info':
        return infoHandler(req, ctx);
      case '/api/auth/permissions':
        return permissionsHandler(req, ctx);
    }
  }

  return null;
}
