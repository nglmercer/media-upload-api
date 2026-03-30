import { ServerWebSocket } from 'bun'
import { io, type WebSocketData } from './websocket-adapter'
import { loadConfig, saveConfig } from './config'
import { handleRequest } from './app'

// Import Discovery (optional)
import { type Discovery as DiscoveryType } from './discover'
import { initDiscovery } from './discover/init'
import loginHtml from '../public/index.html'
import componentHtml from '../client/index.html'
/**
 * Start the HTTP/WebSocket server
 * @param options - Server options
 * @returns The running Bun server instance
 */
export function startServer(options?: { port?: number }): ReturnType<typeof Bun.serve> {
  const serverConfig = loadConfig()
  const port = options?.port ?? serverConfig.port

  // WebSocket handling
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`)
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`)
    })
  })

  let discoveryInstance: DiscoveryType | null = null

  // Helper function for Bun.serve config
  const createServeOptions = (p: number) => ({
    port: p,
    fetch(req: Request, server: ReturnType<typeof Bun.serve>) {
      const url = new URL(req.url);

      // Handle WebSocket upgrade
      if (url.pathname === '/ws') {
        if (server.upgrade(req, {
          data: {
            id: '', // Will be set in handleOpen
            socket: null // Will be set in handleOpen
          }
        })) {
          return; // Successful upgrade
        }
        return new Response('WebSocket upgrade failed', { status: 400 });
      }

      // Handle HTTP requests
      return handleRequest(req);
    },
    websocket: {
      open(ws: ServerWebSocket<WebSocketData>) {
        io.handleOpen(ws);
      },
      message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
        io.handleMessage(ws, message.toString());
      },
      close(ws: ServerWebSocket<WebSocketData>, code: number, reason: string) {
        io.handleClose(ws, code, reason);
      },
      drain(ws: ServerWebSocket<WebSocketData>) {
        // Handle backpressure if needed
      }
    },
    routes: {
      "/": loginHtml,
      "/components": componentHtml,
    }
  });

  // Start server
  let server: ReturnType<typeof Bun.serve>
  
  try {
    server = Bun.serve(createServeOptions(port))
    const actualPort = server.port as number
    console.log(`Server running on port ${actualPort}`)
    saveConfig({ port: actualPort })
    initDiscovery(actualPort).then(instance => { discoveryInstance = instance })
  } catch (error) {
    // Fallback: start on random available port
    server = Bun.serve(createServeOptions(0))
    const actualPort = server.port as number
    saveConfig({ port: actualPort })
    console.log(`Server running on random port ${actualPort}`)
    initDiscovery(actualPort).then(instance => { discoveryInstance = instance })
  }

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('Shutting down server...')
    if (discoveryInstance) {
      discoveryInstance.stop()
    }
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  return server
}

// Auto-start when run directly with Bun
// @ts-ignore - Bun supports import.meta.main
if (typeof import.meta !== 'undefined' && import.meta.main) {
  startServer()
}
