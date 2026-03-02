/**
 * Discovery Service Integration Module
 * 
 * Provides a clean interface for initializing and managing the Discovery service
 * with environment variable configuration support.
 */

import { Discovery } from './index.js';

export interface DiscoveryConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  multicastAddress: string;
  multicastPort: number;
  heartbeatInterval: number;
  offlineTimeout: number;
  setupHooks: boolean;
}

export interface DiscoveryEnvConfig {
  DISCOVERY_ENABLED?: string;
  DISCOVERY_SERVICE_NAME?: string;
  DISCOVERY_SERVICE_VERSION?: string;
  DISCOVERY_MULTICAST_ADDRESS?: string;
  DISCOVERY_MULTICAST_PORT?: string;
  DISCOVERY_HEARTBEAT_INTERVAL?: string;
  DISCOVERY_OFFLINE_TIMEOUT?: string;
  DISCOVERY_SETUP_HOOKS?: string;
}

/**
 * Get Discovery configuration from environment variables
 */
export function getDiscoveryConfig(env: Partial<DiscoveryEnvConfig> = process.env as Partial<DiscoveryEnvConfig>): DiscoveryConfig {
  return {
    enabled: env.DISCOVERY_ENABLED === undefined ? true : env.DISCOVERY_ENABLED.toLowerCase() === 'true',
    serviceName: env.DISCOVERY_SERVICE_NAME || 'media-upload-api',
    serviceVersion: env.DISCOVERY_SERVICE_VERSION || '1.0.0',
    multicastAddress: env.DISCOVERY_MULTICAST_ADDRESS || '239.255.255.250',
    multicastPort: parseInt(env.DISCOVERY_MULTICAST_PORT || '54321', 10),
    heartbeatInterval: parseInt(env.DISCOVERY_HEARTBEAT_INTERVAL || '5000', 10),
    offlineTimeout: parseInt(env.DISCOVERY_OFFLINE_TIMEOUT || '15000', 10),
    setupHooks: env.DISCOVERY_SETUP_HOOKS !== undefined 
      ? env.DISCOVERY_SETUP_HOOKS.toLowerCase() === 'true' 
      : true,
  };
}

/**
 * Initialize the Discovery service
 */
export async function initDiscovery(port: number, config?: DiscoveryConfig): Promise<Discovery | null> {
  const discoveryConfig = config || getDiscoveryConfig();
  
  if (!discoveryConfig.enabled) {
    console.log('[Discovery] Service discovery is disabled (DISCOVERY_ENABLED=false)');
    return null;
  }
  
  const discovery = new Discovery(
    {
      name: discoveryConfig.serviceName,
      version: discoveryConfig.serviceVersion,
      schema: 'http',
    },
    port,
    {
      multicastAddress: discoveryConfig.multicastAddress,
      multicastPort: discoveryConfig.multicastPort,
      heartbeatInterval: discoveryConfig.heartbeatInterval,
      offlineTimeout: discoveryConfig.offlineTimeout,
      setupHooks: discoveryConfig.setupHooks,
    }
  );
  
  // Set up event handlers
  discovery.on('online', (service) => {
    console.log(`[Discovery] Service online: ${service.name} (${service.id}) at ${service.ip}:${service.port}`);
  });
  
  discovery.on('offline', (service) => {
    console.log(`[Discovery] Service offline: ${service.name} (${service.id})`);
  });
  
  discovery.on('error', (err) => {
    console.error('[Discovery] Error:', err.message);
  });
  
  try {
    await discovery.start();
    console.log(`[Discovery] Service discovery started (service: ${discoveryConfig.serviceName}, port: ${discoveryConfig.multicastPort})`);
    return discovery;
  } catch (error) {
    console.warn('[Discovery] Failed to start service discovery:', error);
    return null;
  }
}

/**
 * Stop the Discovery service
 */
export function stopDiscovery(discovery: Discovery | null): void {
  if (discovery) {
    discovery.stop();
  }
}

/**
 * Create a graceful shutdown handler for Discovery
 */
export function createDiscoveryShutdownHandler(discovery: Discovery | null): () => void {
  return () => {
    console.log('Stopping Discovery service...');
    stopDiscovery(discovery);
  };
}
