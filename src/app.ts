import { io } from './websocket-adapter';
import { config, loadConfig, createConfigFile } from './config';
import { initFileStore } from './store/fileStore';
import { authMiddleware } from './middleware/auth';
import { authRouter } from './routers/auth';
import { configRouter } from './routers/config';
import { filesRouter } from './routers/files';
import { quotaRouter } from './routers/quota';
import { json, type ServerContext } from './utils/vanilla-http';

// Initialize services
initFileStore();
createConfigFile();

/**
 * Main Vanilla Request Handler
 */
export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const ctx: ServerContext = {
    params: {},
    url,
  };

  // 1. Logger (Simple)
  console.log(`${req.method} ${url.pathname}`);

  // 2. CORS (Simple)
  const defaultHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Auth-Token',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: defaultHeaders });
  }

  // 3. Static Files (Equivalent to serveStatic)
  if (url.pathname.startsWith('/uploads/')) {
    const filePath = `.${url.pathname}`;
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file, { 
        headers: {
          ...defaultHeaders,
          'Content-Type': file.type,
        }
      });
    }
  }

  // 5. Auth Middleware (Global)
  // Note: In a real app, you might want to exclude some routes from auth.
  const authError = await authMiddleware(req, ctx);
  if (authError) {
    // Apply CORS to auth error
    for (const [key, value] of Object.entries(defaultHeaders)) {
      authError.headers.set(key, value);
    }
    return authError;
  }

  // 6. Routing
  const routerRes = await authRouter(req, ctx) 
    || await configRouter(req, ctx)
    || await filesRouter(req, ctx)
    || await quotaRouter(req, ctx);

  if (routerRes) {
    // Apply CORS headers to router response
    for (const [key, value] of Object.entries(defaultHeaders)) {
      routerRes.headers.set(key, value);
    }
    return routerRes;
  }

  return json({ code: 404, message: 'Not Found',info: "API is running" }, 404);
}

// Export IO and config for server.ts compatibility
export { io, config, loadConfig };
