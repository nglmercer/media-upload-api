import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { io } from './websocket-adapter'
import { config, loadConfig } from './config'
import { authMiddleware } from './middleware/auth'

// Import routers
import { configRouter } from './routers/config'
import { authRouter } from './routers/auth'
import { filesRouter } from './routers/files'
import { quotaRouter } from './routers/quota'

// Initialize file store
import { initFileStore } from './store/fileStore'
initFileStore()

// Create default config file if it doesn't exist
import { createConfigFile } from './config'
import { serve } from 'bun'
createConfigFile()

/**
 * Create and configure the Hono application
 * This can be imported without starting the server
 */
export function createApp(): Hono {
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

  // Mount file routes
  app.route('/api/files', filesRouter)

  // Mount quota routes
  app.route('/api/quota', quotaRouter)

  return app
}

// Export WebSocket IO for external use
export { io }

// Export config utilities
export { config, loadConfig }

// Default export for convenience (e.g., bun run, testing)
const app = createApp()
serve({
  fetch: app.fetch,
  port: '3001',
})
//export default app
