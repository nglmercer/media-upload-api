/**
 * Media Upload API - Entry Point
 * 
 * This file serves as the main entry point for the application.
 * It re-exports the app and server for flexibility.
 * 
 * Usage:
 * - bun run src/index.ts    - Start the server
 * - bun run src/server.ts   - Alternative entry point
 * - Import app from './app' - Get the Hono app without starting server
 */

export { handleRequest, io, config, loadConfig } from './app'
export { startServer } from './server'

// Start server when run directly
import { startServer } from './server'
startServer()
