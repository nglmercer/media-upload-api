import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { mediaStorage } from './store/mediaStore'
import { upgradeWebSocket, websocket } from 'hono/bun'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { ServerWebSocket } from 'bun';
import { io, type WebSocketData } from './websocket-adapter';
import { config, loadConfig, createConfigFile, saveConfig } from './config'
import { authMiddleware } from './middleware/auth'
import { configRouter } from './routers/config'
import { authRouter } from './routers/auth'

// Create default config file if it doesn't exist
createConfigFile()

const app = new Hono()

app.use(logger())
app.use(cors({
  origin: '*',
}))

app.get('/', (c) => {
  return c.text('Media Upload API')
})

// Serve uploaded files
app.use('/uploads/*', serveStatic({ root: './' }))

// Apply auth middleware globally
app.use('/*', authMiddleware)

// Mount config routes (public + admin)
app.route('/api/config', configRouter)

// Mount auth routes
app.route('/api/auth', authRouter)

// Media routes (legacy - to be replaced with files router)
import { mediaRouter } from './routers/media'
app.route('/api/media', mediaRouter)

// Drafts routes (to be removed)
import { draftsRouter } from './routers/drafts'
app.route('/api/drafts', draftsRouter)

// WebSocket handling
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
        io.handleOpen(ws.raw as ServerWebSocket<WebSocketData>);
      },
      onMessage: (event, ws) => {
        io.handleMessage(ws.raw as ServerWebSocket<WebSocketData>, event.data.toString());
      },
      onClose: (event, ws) => {
        io.handleClose(ws.raw as ServerWebSocket<WebSocketData>, event.code, event.reason);
      },
      onError: (event, ws) => {
        console.error('WebSocket error:', event)
      }
    }
  })
)

// Get server config
const serverConfig = loadConfig()

// Start server
try {
  const server = Bun.serve({
    fetch: app.fetch,
    port: serverConfig.port,
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
