import { config, Permission, type Permission as PermissionType } from "../config";
import { getAuth } from "../middleware/auth";
import { json, matchPath, type ServerContext } from "../utils/vanilla-http";

// Helper to check admin permission
function isAdmin(permissions: PermissionType[]): boolean {
  return permissions.includes(Permission.ADMIN);
}

/**
 * GET /api/config - Get public configuration (non-sensitive)
 */
async function getConfig(req: Request, ctx: ServerContext) {
  const serverConfig = config.getServer();
  const oauthConfig = config.getOAuth();
  const quotaConfig = config.getQuota();

  const publicConfig = {
    oauth: {
      enabled: oauthConfig.enabled,
      tokenAuthEnabled: oauthConfig.tokenAuth.enabled,
    },
    quota: {
      defaults: quotaConfig.defaults,
    },
    server: {
      maxFileSizeBytes: serverConfig.maxFileSizeBytes,
      allowedMimeTypes: serverConfig.allowedMimeTypes,
    },
  };

  return json(publicConfig);
}

/**
 * GET /api/config/server - Get server configuration
 */
async function getServerConfig(req: Request, ctx: ServerContext) {
  const auth = getAuth(ctx);
  if (!isAdmin(auth.permissions)) return json({ error: 'Admin permission required' }, 403);
  return json(config.getServer());
}

/**
 * PUT /api/config - Update configuration
 */
async function updateConfig(req: Request, ctx: ServerContext) {
  const auth = getAuth(ctx);
  if (!isAdmin(auth.permissions)) return json({ error: 'Admin permission required' }, 403);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  try {
    config.update(body);
    return json({ message: 'Configuration updated successfully' });
  } catch (error) {
    return json({ error: 'Invalid configuration', details: String(error) }, 400);
  }
}

/**
 * POST /api/config/token - Add a new token (admin only)
 */
async function addToken(req: Request, ctx: ServerContext) {
  const auth = getAuth(ctx);
  if (!isAdmin(auth.permissions)) return json({ error: 'Admin permission required' }, 403);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.token || !body.userId || !body.label) {
    return json({ error: 'Missing required fields: token, userId, label' }, 400);
  }

  const existing = config.getTokenInfo(body.userId);
  if (existing) return json({ error: 'Token already exists for this userId' }, 409);

  try {
    config.addToken(body.token, {
      userId: body.userId,
      label: body.label,
      permissions: body.permissions || [Permission.READ, Permission.LIST],
      createdAt: Date.now(),
      expiresAt: body.expiresAt,
      quota: body.quota,
    });
    return json({ message: 'Token added successfully', userId: body.userId, label: body.label }, 201);
  } catch (error) {
    return json({ error: 'Failed to add token', details: String(error) }, 500);
  }
}

/**
 * DELETE /api/config/token/:userId - Remove a token (admin only)
 */
async function deleteToken(req: Request, ctx: ServerContext) {
  const auth = getAuth(ctx);
  const userId = ctx.params.userId;
  if (!isAdmin(auth.permissions)) return json({ error: 'Admin permission required' }, 403);
  const removed = config.removeToken(userId);
  return removed ? json({ message: `Token removed` }) : json({ error: 'Token not found' }, 404);
}

/**
 * Main Config Router
 */
export async function configRouter(req: Request, ctx: ServerContext): Promise<Response | null> {
  const { pathname } = ctx.url;
  const { method } = req;

  if (pathname === '/api/config') {
    if (method === 'GET') return getConfig(req, ctx);
    if (method === 'PUT') return updateConfig(req, ctx);
  }

  if (pathname === '/api/config/server' && method === 'GET') {
     return getServerConfig(req, ctx);
  }

  if (pathname === '/api/config/token' && method === 'POST') {
     return addToken(req, ctx);
  }
  
  if (pathname === '/api/config/tokens' && method === 'GET') {
    const auth = getAuth(ctx);
    if (!isAdmin(auth.permissions)) return json({ error: 'Admin permission required' }, 403);
    const oauthConfig = config.getOAuth();
    const tokens = oauthConfig.tokenAuth.tokens.map(({ token, ...info }) => info);
    return json({ tokens });
  }

  const tokenParams = matchPath('/api/config/token/:userId', pathname);
  if (tokenParams && method === 'DELETE') {
    ctx.params = { ...ctx.params, ...tokenParams };
    return deleteToken(req, ctx);
  }

  return null;
}
