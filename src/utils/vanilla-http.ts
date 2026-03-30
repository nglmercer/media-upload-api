/**
 * Vanilla HTTP Utilities for Bun
 * 
 * Provides lightweight helpers for common tasks without Hono dependencies.
 */

export interface ServerContext {
  params: Record<string, string>;
  url: URL;
  auth?: any;
  [key: string]: any;
}

/**
 * Helper to create a JSON response
 */
export function json(data: any, status: number = 200) {
  return Response.json(data, { status });
}

/**
 * Helper to produce a 404 response
 */
export function notFound(message: string = 'Not Found') {
  return json({ error: message }, 404);
}

/**
 * Helper to produce a 403 response
 */
export function forbidden(message: string = 'Forbidden') {
  return json({ error: message }, 403);
}

/**
 * Helper to produce a 401 response
 */
export function unauthorized(message: string = 'Unauthorized') {
  return json({ error: message }, 401);
}

/**
 * Simple path pattern matcher
 * Supports :param syntax
 * Example: /api/files/:id matches /api/files/123
 */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].substring(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }

  return params;
}

/**
 * Simple middleware runner
 */
export type VanillaHandler = (req: Request, ctx: ServerContext) => Promise<Response | null | void>;

export async function runMiddleware(
  req: Request, 
  ctx: ServerContext, 
  middlewares: VanillaHandler[]
): Promise<Response | null> {
  for (const mw of middlewares) {
    const res = await mw(req, ctx);
    if (res instanceof Response) return res;
  }
  return null;
}
