import type { Context, Next } from "hono";
import { config, Permission, type Permission as PermissionType } from "../config";

// ============================================================================
// Auth Context Type
// ============================================================================

export interface AuthContext {
  authenticated: boolean;
  userId: string | null;
  permissions: PermissionType[];
  tokenLabel: string | null;
}

// ============================================================================
// Auth Middleware
// ============================================================================

export const authMiddleware = async (c: Context, next: Next) => {
  const oauthConfig = config.getOAuth();

  // If OAuth disabled, allow all (but mark as unauthenticated with all permissions)
  if (!oauthConfig.enabled) {
    c.set('auth', {
      authenticated: false,
      userId: null,
      permissions: Object.values(Permission),
      tokenLabel: null,
    });
    await next();
    return;
  }

  // If token auth disabled, allow all
  if (!oauthConfig.tokenAuth.enabled) {
    c.set('auth', {
      authenticated: false,
      userId: null,
      permissions: Object.values(Permission),
      tokenLabel: null,
    });
    await next();
    return;
  }

  // Extract token from header or query
  const token = c.req.header('X-Auth-Token') 
    || c.req.query('token')
    || c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  // Validate token
  const tokenInfo = config.verifyToken(token);
  if (!tokenInfo) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  // Set auth context
  c.set('auth', {
    authenticated: true,
    userId: tokenInfo.userId,
    permissions: tokenInfo.permissions,
    tokenLabel: tokenInfo.label,
  });

  await next();
};

// ============================================================================
// Permission Check Helper
// ============================================================================

export const requirePermission = (...required: PermissionType[]) => {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth') as AuthContext;
    
    const hasPermission = required.every(p => 
      auth.permissions.includes(p)
    );
    
    if (!hasPermission) {
      return c.json({ 
        error: 'Insufficient permissions',
        required,
        has: auth.permissions,
      }, 403);
    }
    
    await next();
  };
};

// ============================================================================
// Get Auth Context Helper
// ============================================================================

export function getAuth(c: Context): AuthContext {
  return c.get('auth') as AuthContext || {
    authenticated: false,
    userId: null,
    permissions: [],
    tokenLabel: null,
  };
}
