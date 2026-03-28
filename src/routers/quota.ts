import { quotaManager } from "../services/quota-manager";
import { getAuth } from "../middleware/auth";
import { json, type ServerContext } from "../utils/vanilla-http";

/**
 * GET /api/quota - Get quota for current user
 */
async function getQuota(req: Request, ctx: ServerContext) {
  const auth = getAuth(ctx);
  const quota = await quotaManager.getUserQuota(auth.userId);
  return json(quota);
}

/**
 * Main Quota Router
 */
export async function quotaRouter(req: Request, ctx: ServerContext): Promise<Response | null> {
  const { pathname } = ctx.url;
  const { method } = req;

  if (pathname === '/api/quota' && method === 'GET') {
    return getQuota(req, ctx);
  }

  if (pathname === '/api/quota/global' && method === 'GET') {
    const quota = await quotaManager.getGlobalQuota();
    return json(quota);
  }

  return null;
}
