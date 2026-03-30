import { config, Permission, type Permission as PermissionType } from "../config";
import { json, unauthorized } from "../utils/vanilla-http";
import type { ServerContext } from "../utils/vanilla-http";
import { validateSession } from "../db/auth";

// ============================================================================
// Auth Context Type (Exported)
// ============================================================================

export interface AuthContext {
  authenticated: boolean;
  userId: string | null;
  permissions: PermissionType[];
  tokenLabel: string | null;
}

/**
 * Vanilla Auth Middleware for Bun.serve
 * 
 * Returns a Response (error) or sets the 'auth' context in ctx.
 */
export const authMiddleware = async (req: Request, ctx: ServerContext): Promise<Response | null> => {
  const url = ctx.url;

  // Extract token from header or query
  const token = req.headers.get('X-Auth-Token') 
    || url.searchParams.get('token')
    || req.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    // If no token, we set as unauthenticated but continue
    ctx.auth = {
      authenticated: false,
      userId: null,
      permissions: [],
      tokenLabel: null,
    };
    return null;
  }

  // 1. Try to validate as User Session (SQLite)
  const sessionResult = await validateSession(token);
  if (sessionResult.valid && sessionResult.user) {
    ctx.auth = {
      authenticated: true,
      userId: String(sessionResult.user.id),
      permissions: Object.values(Permission), // Default permissions for logged users
      tokenLabel: sessionResult.user.username,
    } as AuthContext;
    return null;
  }

  // 2. Try to validate as Config-based token (Backward compatibility)
  const tokenInfo = config.verifyToken(token);
  if (tokenInfo) {
    ctx.auth = {
      authenticated: true,
      userId: tokenInfo.userId,
      permissions: tokenInfo.permissions,
      tokenLabel: tokenInfo.label,
    } as AuthContext;
    return null;
  }

  // If token was provided but is invalid, we still allow to proceed
  // but marked as NOT authenticated.
  ctx.auth = {
    authenticated: false,
    userId: null,
    permissions: [],
    tokenLabel: null,
  };
  return null;
};

/**
 * Permission Check Helper
 */
export const requirePermission = (...required: PermissionType[]) => {
  return async (req: Request, ctx: ServerContext): Promise<Response | null> => {
    const auth = ctx.auth as AuthContext;
    
    const hasPermission = required.every(p => 
      auth.permissions.includes(p)
    );
    
    if (!hasPermission) {
      return json({ 
        error: 'Insufficient permissions',
        required,
        has: auth.permissions,
      }, 403);
    }
    
    return null;
  };
};

/**
 * Helper to get Auth context from current request state
 */
export function getAuth(ctx: ServerContext): AuthContext {
  return ctx.auth as AuthContext || {
    authenticated: false,
    userId: null,
    permissions: [],
    tokenLabel: null,
  };
}
