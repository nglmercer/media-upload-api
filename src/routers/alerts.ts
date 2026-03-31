import { getAuth } from "../middleware/auth";
import { json, type ServerContext } from "../utils/vanilla-http";
import { config, Permission } from "../config";
import alertsHtml from "../public/alerts.html";

/**
 * GET /api/alerts/play - Generate an alert playback URL
 */
async function generateAlertUrl(req: Request, ctx: ServerContext) {
  const auth = getAuth(ctx);
  if (!auth.authenticated) return json({ error: 'Authentication required' }, 401);

  const url = new URL(req.url);
  const params = url.searchParams;
  
  const video = params.get('video') || '';
  const audio = params.get('audio') || '';
  const image = params.get('image') || '';
  const duration = params.get('duration') || '5000';
  const volume = params.get('volume') || '1';
  const muted = params.get('muted') === 'true';

  // Construct the playback URL
  const baseUrl = config.getServer().baseUrl || `${url.protocol}//${url.host}`;
  const playbackUrl = new URL('/alerts/player', baseUrl);
  
  if (video) playbackUrl.searchParams.set('v', video);
  if (audio) playbackUrl.searchParams.set('a', audio);
  if (image) playbackUrl.searchParams.set('i', image);
  playbackUrl.searchParams.set('d', duration);
  playbackUrl.searchParams.set('vol', volume);
  if (muted) playbackUrl.searchParams.set('m', '1');
  
  // Add token for access
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') || params.get('token');
  if (token) {
    playbackUrl.searchParams.set('token', token);
  }

  return json({ url: playbackUrl.toString() });
}

/**
 * Main Alerts Router
 */
export async function alertsRouter(req: Request, ctx: ServerContext): Promise<Response | null> {
  const { pathname } = ctx.url;
  const { method } = req;

  if (pathname === '/api/alerts/url' && method === 'GET') {
    return generateAlertUrl(req, ctx);
  }

  if (pathname === '/api/alerts/trigger' && method === 'POST') {
    const auth = getAuth(ctx);
    if (!auth.authenticated) return json({ error: 'Authentication required' }, 401);

    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    const { video, audio, image, duration, volume, muted } = body;
    console.log('[AlertRouter] Triggering alert with:', { video, audio, image });
    
    // Emit to all connected clients
    import('../websocket-adapter').then(({ io }) => {
      io.emit('play-alert', {
        v: video,
        a: audio,
        i: image,
        d: duration || 5000,
        vol: volume || 1,
        m: muted === true
      });
    });

    return json({ success: true, message: 'Alert triggered' });
  }
  return null;
}
