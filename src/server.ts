import { upgradeWebSocket, websocket } from 'hono/bun'
import { ServerWebSocket } from 'bun'
import { io, type WebSocketData } from './websocket-adapter'
import { loadConfig, saveConfig } from './config'
import { createApp } from './app'

// Import Discovery (optional, enabled by default via env var)
import { createDiscoveryShutdownHandler, type Discovery as DiscoveryType } from './discover'
import { initDiscovery } from './discover/init'

/**
 * Start the HTTP/WebSocket server
 * @param options - Server options
 * @returns The running Bun server instance
 */
export function startServer(options?: { port?: number }): ReturnType<typeof Bun.serve> {
  const serverConfig = loadConfig()
  const port = options?.port ?? serverConfig.port

  // Mount WebSocket handler to app
  const app = createApp()
  
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
          io.handleOpen(ws.raw as ServerWebSocket<WebSocketData>)
        },
        onMessage: (event, ws) => {
          io.handleMessage(ws.raw as ServerWebSocket<WebSocketData>, event.data.toString())
        },
        onClose: (event, ws) => {
          io.handleClose(ws.raw as ServerWebSocket<WebSocketData>, event.code, event.reason)
        },
        onError: (event, ws) => {
          console.error('WebSocket error:', event)
        },
      }
    })
  )

  let discoveryInstance: DiscoveryType | null = null

  // Start server
  let server: ReturnType<typeof Bun.serve>
  
  try {
    server = Bun.serve({
      fetch: app.fetch,
      port,
      websocket,
    })
    
    // Check if port was actually used (Bun might use random port if specified port is unavailable)
    const actualPort = server.port as number
    
    console.log(`Server running on port ${actualPort}`)
    saveConfig({ port: actualPort })
    
    // Initialize Discovery service after server starts
    initDiscovery(actualPort).then(instance => {
      discoveryInstance = instance
    })
    
  } catch (error) {
    // Fallback: start on random available port
    server = Bun.serve({
      fetch: app.fetch,
      port: 0, // Let the OS choose an available port
      websocket,
    })
    
    const actualPort = server.port as number
    saveConfig({ port: actualPort })
    console.log(`Server running on random port ${actualPort}`)
    
    // Initialize Discovery service after server starts
    initDiscovery(actualPort).then(instance => {
      discoveryInstance = instance
    })
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

// Export app creation for testing/custom server setups
export { createApp }

// Auto-start when run directly with Bun
// @ts-ignore - Bun supports import.meta.main
if (typeof import.meta !== 'undefined' && import.meta.main) {
  startServer()
}
