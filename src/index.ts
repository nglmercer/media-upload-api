import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { mediaRouter } from './routers/media'
import { draftsRouter } from './routers/drafts'
import { mediaStorage } from './store/mediaStore'
import { upgradeWebSocket, websocket } from 'hono/bun'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { ServerWebSocket } from 'bun';
import { io, type WebSocketData } from './websocket-adapter';
import { emitter } from './Emitter';
import { loadConfig, createConfigFile, saveConfig } from './config'

createConfigFile()
const config = loadConfig()
const app = new Hono()

app.use(logger())
app.use(cors({
  origin: '*',
}))

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

// Serve uploaded files
app.use('/uploads/*', async (c, next) => {
  await next()
  const path = c.req.path
  if (path.endsWith('.m3u8') || path.endsWith('.ts')) {
    const newHeaders = new Headers(c.res.headers)

    if (path.endsWith('.m3u8')) {
      newHeaders.set('Content-Type', 'application/vnd.apple.mpegurl')
    } else if (path.endsWith('.ts')) {
      newHeaders.set('Content-Type', 'video/MP2T')
    }

    c.res = new Response(c.res.body, {
      status: c.res.status,
      statusText: c.res.statusText,
      headers: newHeaders
    })
  }
})
app.use('/uploads/*', serveStatic({ root: './' }))

// Mount media routes
app.route('/api/media', mediaRouter)
app.route('/api/drafts', draftsRouter)



io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
  })
})

app.get(
  '/ws',
  upgradeWebSocket((c) => {
    return {
      onOpen: (event, ws) => {
        // Usamos ws.raw para pasar el objeto nativo de Bun al adaptador
        io.handleOpen(ws.raw as ServerWebSocket<WebSocketData>);
      },

      onMessage: (event, ws) => {
        // Usamos ws.raw aquí también
        io.handleMessage(ws.raw as ServerWebSocket<WebSocketData>, event.data.toString());
      },
      onClose: (event, ws) => {
        // Y aquí también
        io.handleClose(ws.raw as ServerWebSocket<WebSocketData>, event.code, event.reason);
      },
      onError: (event, ws) => {
        console.error('Error de WebSocket:', event)
        // Opcional: notificar al adaptador si tienes un manejador de errores
        // io.handleError(ws.raw, event.error);
      }
    }
  })
)

try {
  const server = Bun.serve({
    fetch: app.fetch,
    port: config.port,
    websocket,
  });
  console.log(`Server running on port ${server.port}`);
  saveConfig({
    port: server.port,
  })
} catch (error) {
  const server = Bun.serve({
    fetch: app.fetch,
    port: 0,
    websocket,
  });
  saveConfig({
    port: server.port,
  })
}
