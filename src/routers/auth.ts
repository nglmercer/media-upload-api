import { getAuth } from "../middleware/auth";
import { json, type ServerContext } from "../utils/vanilla-http";

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

  if (method !== 'GET') return null;

  switch (pathname) {
    case '/api/auth/validate':
      return validateHandler(req, ctx);
    case '/api/auth/info':
      return infoHandler(req, ctx);
    case '/api/auth/permissions':
      return permissionsHandler(req, ctx);
    default:
      return null;
  }
}
