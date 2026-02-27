import { Hono } from "hono";
import { config, Permission, type Permission as PermissionType } from "../config";
import { getAuth, type AuthContext } from "../middleware/auth";

const configRouter = new Hono();

// Helper to check admin permission
function isAdmin(permissions: PermissionType[]): boolean {
  return permissions.includes(Permission.ADMIN);
}

// GET /api/config - Get public configuration (non-sensitive)
configRouter.get('/', async (c) => {
  const serverConfig = config.getServer();
  const oauthConfig = config.getOAuth();
  const quotaConfig = config.getQuota();

  // Return public-safe config (no tokens, no secrets)
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

  return c.json(publicConfig);
});

// GET /api/config/server - Get server configuration
configRouter.get('/server', async (c) => {
  const auth = getAuth(c);

  // Only admin can see full server config
  if (!isAdmin(auth.permissions)) {
    return c.json({ error: 'Admin permission required' }, 403);
  }

  return c.json(config.getServer());
});

// PUT /api/config - Update configuration
configRouter.put('/', async (c) => {
  const auth = getAuth(c);

  if (!isAdmin(auth.permissions)) {
    return c.json({ error: 'Admin permission required' }, 403);
  }

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  // Validate and update config
  try {
    config.update(body);
    return c.json({ message: 'Configuration updated successfully' });
  } catch (error) {
    return c.json({ error: 'Invalid configuration', details: String(error) }, 400);
  }
});

// POST /api/config/token - Add a new token (admin only)
configRouter.post('/token', async (c) => {
  const auth = getAuth(c);

  if (!isAdmin(auth.permissions)) {
    return c.json({ error: 'Admin permission required' }, 403);
  }

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  // Validate required fields
  if (!body.token || !body.userId || !body.label) {
    return c.json({ 
      error: 'Missing required fields: token, userId, label' 
    }, 400);
  }

  // Check if token already exists
  const existing = config.getTokenInfo(body.userId);
  if (existing) {
    return c.json({ error: 'Token already exists for this userId' }, 409);
  }

  try {
    config.addToken(body.token, {
      userId: body.userId,
      label: body.label,
      permissions: body.permissions || [Permission.READ, Permission.LIST],
      createdAt: Date.now(),
      expiresAt: body.expiresAt,
      quota: body.quota,
    });

    return c.json({ 
      message: 'Token added successfully',
      userId: body.userId,
      label: body.label,
    }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to add token', details: String(error) }, 500);
  }
});

// DELETE /api/config/token/:userId - Remove a token (admin only)
configRouter.delete('/token/:userId', async (c) => {
  const auth = getAuth(c);
  const userId = c.req.param('userId');

  if (!isAdmin(auth.permissions)) {
    return c.json({ error: 'Admin permission required' }, 403);
  }

  const removed = config.removeToken(userId);
  
  if (removed) {
    return c.json({ message: `Token for user ${userId} removed successfully` });
  } else {
    return c.json({ error: 'Token not found' }, 404);
  }
});

// GET /api/config/tokens - List all tokens (admin only, without actual tokens)
configRouter.get('/tokens', async (c) => {
  const auth = getAuth(c);

  if (!isAdmin(auth.permissions)) {
    return c.json({ error: 'Admin permission required' }, 403);
  }

  const oauthConfig = config.getOAuth();
  const tokens = oauthConfig.tokenAuth.tokens.map(({ token, ...info }) => info);

  return c.json({ tokens });
});

export { configRouter };
