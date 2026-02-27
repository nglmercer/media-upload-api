import { Hono } from "hono";
import { quotaManager } from "../services/quota-manager";
import { getAuth } from "../middleware/auth";
import { Permission } from "../config";

const quotaRouter = new Hono();

// GET /api/quota - Get current user's quota
quotaRouter.get('/', async (c) => {
  const auth = getAuth(c);
  
  if (!auth.permissions.includes(Permission.READ)) {
    return c.json({ error: 'Read permission required' }, 403);
  }

  const quota = await quotaManager.getUserQuota(auth.userId);
  return c.json(quota);
});

// GET /api/quota/global - Get global quota stats
quotaRouter.get('/global', async (c) => {
  const auth = getAuth(c);
  
  if (!auth.permissions.includes(Permission.READ)) {
    return c.json({ error: 'Read permission required' }, 403);
  }

  const quota = await quotaManager.getGlobalQuota();
  return c.json(quota);
});

export { quotaRouter };
