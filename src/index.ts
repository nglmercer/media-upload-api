import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { upgradeWebSocket, websocket } from 'hono/bun'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { ServerWebSocket } from 'bun';
import { io, type WebSocketData } from './websocket-adapter';
import { config, loadConfig, createConfigFile, saveConfig } from './config'
import { authMiddleware } from './middleware/auth'

// Import routers
import { configRouter } from './routers/config'
import { authRouter } from './routers/auth'
import { filesRouter } from './routers/files'
import { quotaRouter } from './routers/quota'

// Import Discovery (optional, enabled by default via env var)
import { Discovery } from './discover';

// Initialize file store
import { initFileStore } from './store/fileStore'
initFileStore()

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

// Mount file routes
app.route('/api/files', filesRouter)

// Mount quota routes
app.route('/api/quota', quotaRouter)

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

// ============================================================================
// Discovery Service (optional, enabled by default via DISCOVERY_ENABLED env var)
// ============================================================================

interface DiscoveryConfig {
  enabled: boolean;
  serviceName?: string;
  serviceVersion?: string;
  multicastAddress?: string;
  multicastPort?: number;
}

function getDiscoveryConfig(): DiscoveryConfig {
  // Check for DISCOVERY_ENABLED env var (default: true)
  const envEnabled = process.env.DISCOVERY_ENABLED;
  const enabled = envEnabled === undefined ? true : envEnabled.toLowerCase() === 'true';
  
  return {
    enabled,
    serviceName: process.env.DISCOVERY_SERVICE_NAME || 'media-upload-api',
    serviceVersion: process.env.DISCOVERY_SERVICE_VERSION || '1.0.0',
    multicastAddress: process.env.DISCOVERY_MULTICAST_ADDRESS || '239.255.255.250',
    multicastPort: parseInt(process.env.DISCOVERY_MULTICAST_PORT || '54321', 10),
  };
}

let discoveryInstance: Discovery | null = null;

async function initDiscovery(port: number) {
  const discoveryConfig = getDiscoveryConfig();
  
  if (!discoveryConfig.enabled) {
    console.log('[Discovery] Service discovery is disabled (DISCOVERY_ENABLED=false)');
    return;
  }
  
  try {
    discoveryInstance = new Discovery(
      {
        name: discoveryConfig.serviceName,
        version: discoveryConfig.serviceVersion,
        schema: 'http',
      },
      port,
      {
        multicastAddress: discoveryConfig.multicastAddress,
        multicastPort: discoveryConfig.multicastPort,
        heartbeatInterval: 5000,
        offlineTimeout: 15000,
      }
    );
    
    // Set up event handlers
    discoveryInstance.on('online', (service) => {
      console.log(`[Discovery] Service online: ${service.name} (${service.id}) at ${service.ip}:${service.port}`);
    });
    
    discoveryInstance.on('offline', (service) => {
      console.log(`[Discovery] Service offline: ${service.name} (${service.id})`);
    });
    
    discoveryInstance.on('error', (err) => {
      console.error('[Discovery] Error:', err.message);
    });
    
    await discoveryInstance.start();
    console.log(`[Discovery] Service discovery started (service: ${discoveryConfig.serviceName}, port: ${discoveryConfig.multicastPort})`);
  } catch (error) {
    console.warn('[Discovery] Failed to start service discovery:', error);
  }
}

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
  
  // Initialize Discovery service after server starts
  const actualPort = server.port || serverConfig.port;
  initDiscovery(actualPort);
  
  // Handle graceful shutdown
  const shutdown = () => {
    console.log('Shutting down server...');
    if (discoveryInstance) {
      discoveryInstance.stop();
    }
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  
} catch (error) {
  const server = Bun.serve({
    fetch: app.fetch,
    port: 0,
    websocket,
  });
  saveConfig({
    port: server.port,
  })
  console.log(`Server running on random port ${server.port}`);
  
  // Initialize Discovery service after server starts
  const actualPort = server.port || serverConfig.port;
  initDiscovery(actualPort);
  
  // Handle graceful shutdown
  const shutdown = () => {
    console.log('Shutting down server...');
    if (discoveryInstance) {
      discoveryInstance.stop();
    }
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
