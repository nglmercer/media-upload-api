import { config, Permission, type Permission as PermissionType } from "../config";
import { json, unauthorized, forbidden } from "../utils/vanilla-http";
import type { ServerContext } from "../utils/vanilla-http";

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
  const oauthConfig = config.getOAuth();
  const url = ctx.url;

  // If OAuth disabled, allow all (but mark as unauthenticated with all permissions)
  if (!oauthConfig.enabled || !oauthConfig.tokenAuth.enabled) {
    ctx.auth = {
      authenticated: false,
      userId: null,
      permissions: Object.values(Permission),
      tokenLabel: null,
    };
    return null;
  }

  // Extract token from header or query
  const token = req.headers.get('X-Auth-Token') 
    || url.searchParams.get('token')
    || req.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return unauthorized('Authentication required');
  }

  // Validate token
  const tokenInfo = config.verifyToken(token);
  if (!tokenInfo) {
    return unauthorized('Invalid or expired token');
  }

  // Set auth context
  ctx.auth = {
    authenticated: true,
    userId: tokenInfo.userId,
    permissions: tokenInfo.permissions,
    tokenLabel: tokenInfo.label,
  } as AuthContext;

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
