/**
 * Configuration Module
 * 
 * Handles application configuration with environment variable resolution
 * and Zod-based validation.
 * 
 * Provides:
 * - Environment variable resolution (Vite and Node.js)
 * - Type-safe configuration with Zod schemas
 * - Helper functions for environment detection and URL building
 * - Factory functions for creating configurations
 * - Backend URL and WebSocket URL helpers
 * 
 * @module lib/config
 * @version 2.2.0
 */

import z from 'zod';
// Import constants
import { resolveBackendUrl, resolveWebSocketUrl } from '../src/client/utils';
export const EnvironmentSchema = z.enum(['development', 'production', 'test']);
export type Environment = z.infer<typeof EnvironmentSchema>;
export const ENVIRONMENT = {
  /** Default environment */
  DEFAULT: 'development' as const,
  
  /** Supported environments */
  SUPPORTED: ['development', 'production', 'test'] as const,
  
  /** Default locale */
  DEFAULT_LOCALE: 'es',
  
  /** Supported locales */
  SUPPORTED_LOCALES: ['es', 'en'] as const,
  
  /** Default media URLs - use relative path in production */
  MEDIA_URL: {
    DEFAULT: '/uploads',  // Relative URL for production (same origin)
    CDN: 'https://cdn.example.com',
  },
} as const;
export const ServiceName = {
  MEDIA_UPLOAD_API: 'media-upload-api',
  OVERLAY_SERVICE: 'overlay-service',
} as const;
export const AppConfigSchema = z.object({
  mediaUrl: z.string().default('/uploads'),  // Relative path for production
  baseMediaUrl: z.string().url().default('https://cdn.example.com'),
  environment: EnvironmentSchema.default('development'),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export interface FactoryOptions<T> {
  /** Partial data to merge with defaults */
  data?: Partial<T>;
  /** Whether to throw on validation failure (default: false) */
  throwOnError?: boolean;
  /** Context string for error messages */
  context?: string;
}
/**
 * Creates an AppConfig with validated defaults
 * 
 * @param options - Factory options
 * @returns Validated AppConfig instance
 */
export function createAppConfig(options?: FactoryOptions<AppConfig>): AppConfig {
  const result = AppConfigSchema.safeParse(options?.data || {});
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    if (options?.throwOnError) {
      throw new Error(`Invalid AppConfig: ${errors.join(', ')}`);
    }
    console.warn(`Invalid AppConfig, using defaults: ${errors.join(', ')}`);
    return AppConfigSchema.parse({});
  }
  return result.data;
}
/**
 * Attempts to get an environment variable value with fallback support
 * Tries multiple sources: Vite's import.meta.env, Node process.env
 * 
 * @param key - The environment variable key to look up
 * @param fallback - Default value if key is not found
 * @returns The resolved value or fallback
 */
function getEnvValue(key: string, fallback: string): string {
  // Try Vite's import.meta.env first
  try {
    const env = (import.meta as unknown as { env?: Record<string, string> }).env;
    if (env && typeof env === 'object' && key in env) {
      return env[key];
    }
  } catch {
    // import.meta.env might be unavailable in some contexts
  }
  
  // Fall back to Node.js process.env
  if (typeof process !== 'undefined' && process?.env && key in process.env) {
    return process.env[key] as string;
  }

  return fallback;
}

/**
 * Application configuration object
 * Uses Zod schema for type safety and validation
 * 
 * @example
 * ```typescript
 * // Access config values
 * console.log(appConfig.mediaUrl); // 'http://localhost:3001/media'
 * console.log(appConfig.environment); // 'development'
 * 
 * // Check environment
 * if (appConfig.environment === 'production') {
 *   // Production-specific logic
 * }
 * ```
 */
export const appConfig: AppConfig = createAppConfig({
  data: {
    mediaUrl: getEnvValue('VITE_MEDIA_URL', ENVIRONMENT.MEDIA_URL.DEFAULT),
    baseMediaUrl: getEnvValue('VITE_BASE_MEDIA_URL', ENVIRONMENT.MEDIA_URL.CDN),
    environment: getEnvValue('NODE_ENV', ENVIRONMENT.DEFAULT) as AppConfig['environment'],
  },
});

// Cache for discovered services
let discoveredServicesCache: Record<string, string> = {};

/**
 * ============================================
 * SERVICE DISCOVERY
 * ============================================
 */

/**
 * Fetches the list of known services from the backend discovery endpoint
 */
export async function discoverServices(): Promise<Record<string, string>> {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/webhook/discovery`);
    if (response.ok) {
      const data = await response.json();
      let services = data.services || {};
      
      discoveredServicesCache = services;
      return discoveredServicesCache;
    }
  } catch (err) {
    console.warn('[Discovery] Failed to fetch services:', err);
  }
  return discoveredServicesCache;
}

/**
 * Resolves a service URL by name
 * Priority: 
 * 1. Matching VITE_{NAME}_URL env var
 * 2. Gateway Proxy (for known services like media-upload-api)
 * 3. Discovered service from backend
 * 4. Default fallback (current backend)
 */
export function resolveServiceUrl(name: string, fallback?: string): string {
  // Try environment variable first (e.g., VITE_MEDIA_SERVICE_URL)
  const envKey = `VITE_${name.toUpperCase().replace(/-/g, '_')}_URL`;
  const envValue = getEnvValue(envKey, '');
  if (envValue) return envValue;

  // For known proxied services, ALWAYS use the gateway to maintain "Same IP" behavior
  // and avoid CORS issues with different ports.
  if (name === ServiceName.MEDIA_UPLOAD_API || name === 'media-upload-api') {
    return getBackendUrl();
  }

  // Try discovered services for other external services
  if (discoveredServicesCache[name]) {
    return discoveredServicesCache[name];
  }

  // Fallback to provided default or backend URL
  return fallback || getBackendUrl();
}

/**
 * ============================================
 * BACKEND URL HELPERS
 * ============================================
 */

/**
 * Get the backend HTTP URL
 * 
 * Resolves the backend server URL with proper fallback:
 * - In production: uses relative URL (same origin)
 * - In development: defaults to http://localhost:3001
 * 
 * @returns The backend HTTP URL
 */
export function getBackendUrl(): string {
  const envUrl = getEnvValue('VITE_BACKEND_URL', '');
  const resolvedUrl = resolveBackendUrl(envUrl);
  console.log("getBackendUrl",{envUrl, resolvedUrl});
  return resolvedUrl;
}

/**
 * Get the WebSocket URL for real-time alerts
 * 
 * @returns The WebSocket URL (ws:// or wss://)
 * @example
 * ```typescript
 * // For local development: ws://localhost:3001/ws
 * // For production: wss://your-backend.com/ws (or relative /ws)
 * ```
 */
export function getWebSocketUrl(): string {
  const backendUrl = getBackendUrl();
  return resolveWebSocketUrl(backendUrl);
}

/**
 * Get a full URL for a backend endpoint
 * 
 * @param path - The API path (e.g., '/webhook/save')
 * @returns The full URL
 */
export function getBackendEndpoint(path: string): string {
  const base = getBackendUrl();
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  
  // If base is empty (production with same origin), use relative URL
  if (!base) {
    return cleanPath;
  }
  
  return `${base}${cleanPath}`;
}

export function getEnvironment(): Environment {
  const env = typeof process !== 'undefined' ? process?.env?.NODE_ENV : undefined;
  const result = EnvironmentSchema.safeParse(env);
  return result.success ? result.data : ENVIRONMENT.DEFAULT;
}
/**
 * Checks if running in a specific environment
 * 
 * @param env - Environment to check against
 * @returns True if current environment matches
 */
export function isEnvironment(env: Environment): boolean {
  return getEnvironment() === env;
}
/**
 * ============================================
 * CONFIGURATION HELPERS
 * ============================================
 */

/**
 * Check if the application is running in development mode
 * 
 * @returns True if environment is 'development'
 */
export function isDevelopment(): boolean {
  return isEnvironment('development');
}

/**
 * Check if the application is running in production mode
 * 
 * @returns True if environment is 'production'
 */
export function isProduction(): boolean {
  return isEnvironment('production');
}

/**
 * Check if the application is running in test mode
 * 
 * @returns True if environment is 'test'
 */
export function isTest(): boolean {
  return isEnvironment('test');
}

/**
 * Get the full media URL for a given path
 * 
 * @param path - The relative path to the media file
 * @returns The full absolute URL
 */
export function getMediaUrl(path: string): string {
  // If already absolute URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  const mediaUrl = appConfig.mediaUrl;
  
  // If mediaUrl is empty (production), use uploads path relative
  if (!mediaUrl || mediaUrl === '') {
    return `/uploads/${cleanPath}`;
  }
  
  return `${mediaUrl}/${cleanPath}`;
}

/**
 * Get the CDN base URL for assets
 * 
 * @param path - Optional path to append
 * @returns The base CDN URL or full path if provided
 */
export function getCdnUrl(path?: string): string {
  if (!path) return appConfig.baseMediaUrl;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${appConfig.baseMediaUrl}/${cleanPath}`;
}

/**
 * Normalizes a media URL to a relative path if it belongs to the backend/media-upload-api
 * 
 * @param url - The URL to normalize
 * @returns The normalized relative path, or the original URL if not internal
 * @example 
 * normalizeMediaUrl('http://localhost:3001/uploads/image.png') -> '/uploads/image.png'
 */
export function normalizeMediaUrl(url: string | undefined): string | undefined {
  if (!url || typeof url !== 'string' || url === '') return url;

  // We only care about absolute URLs that start with http or https
  if (!url.startsWith('http')) return url;

  const backendUrl = getBackendUrl();
  const mediaUrl = appConfig.mediaUrl;
  
  // Also check discovered services (already resolved to origin if proxied)
  const discoveredMediaUrl = discoveredServicesCache['media-upload-api'];

  const internalBases = [backendUrl, mediaUrl, discoveredMediaUrl].filter(Boolean) as string[];

  // 1. Try to match known internal bases
  for (const base of internalBases) {
    if (url.startsWith(base)) {
      const path = url.slice(base.length);
      return path.startsWith('/') ? path : '/' + path;
    }
  }

  // 2. Try to match by URI parts: if it belongs to the same domain OR any /uploads/ or /api/ path
  // We should be careful not to normalize generic external URLs
  try {
    const urlObj = new URL(url);
    const backendObj = new URL(backendUrl);
    
    // If it's the same host (even different port) and starts with /api/ or /uploads/
    if (urlObj.hostname === backendObj.hostname && 
        (urlObj.pathname.startsWith('/api/') || urlObj.pathname.startsWith('/uploads/'))) {
      return urlObj.pathname + urlObj.search;
    }
    
    // If it's localhost or an IP address and starts with /api/ or /uploads/, 
    // it's VERY likely our internal service
    const isIpOrLocalhost = urlObj.hostname === 'localhost' || 
                           urlObj.hostname === '127.0.0.1' || 
                           /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(urlObj.hostname);
    
    if (isIpOrLocalhost && (urlObj.pathname.startsWith('/api/') || urlObj.pathname.startsWith('/uploads/'))) {
      return urlObj.pathname + urlObj.search;
    }
  } catch {
    // Not a valid absolute URL, return as is
  }

  return url;
}

/**
 * Denormalizes a media (relative) path to a full absolute URL using the current configuration
 * 
 * @param path - The path to denormalize
 * @returns The full absolute URL
 */
export function denormalizeMediaUrl(path: string | undefined): string | undefined {
  if (!path || typeof path !== 'string' || path === '') return path;
  
  // If already absolute, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Handle /api/ or /uploads/ paths
  if (path.startsWith('/') || path.startsWith('uploads/')) {
    const backendBase = getBackendUrl();
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return `${backendBase}${cleanPath}`;
  }

  return getMediaUrl(path);
}

/**
 * Recursively normalizes all media URLs in an object
 * 
 * @param data - The object to normalize
 * @returns A new object with normalized URLs
 */
export function normalizeAlertData<T>(data: T): T {
  if (!data || typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => normalizeAlertData(item)) as unknown as T;
  }

  const result = { ...data } as any;
  
  for (const key in result) {
    if (key === 'imageUrl' || key === 'soundUrl') {
      result[key] = normalizeMediaUrl(result[key]);
    } else if (typeof result[key] === 'object') {
      result[key] = normalizeAlertData(result[key]);
    }
  }
  
  return result;
}

/**
 * Recursively denormalizes all media URLs in an object
 * 
 * @param data - The object to denormalize
 * @returns A new object with absolute URLs
 */
export function denormalizeAlertData<T>(data: T): T {
  if (!data || typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => denormalizeAlertData(item)) as unknown as T;
  }

  const result = { ...data } as any;
  
  for (const key in result) {
    if (key === 'imageUrl' || key === 'soundUrl') {
      result[key] = denormalizeMediaUrl(result[key]);
    } else if (typeof result[key] === 'object') {
      result[key] = denormalizeAlertData(result[key]);
    }
  }
  
  return result;
}

/**
 * Reload configuration from environment
 * Useful when environment variables change at runtime
 * 
 * @returns New AppConfig instance
 */
export function reloadConfig(): AppConfig {
  return createAppConfig({
    data: {
      mediaUrl: getEnvValue('VITE_MEDIA_URL', ENVIRONMENT.MEDIA_URL.DEFAULT),
      baseMediaUrl: getEnvValue('VITE_BASE_MEDIA_URL', ENVIRONMENT.MEDIA_URL.CDN),
      environment: getEnvValue('NODE_ENV', ENVIRONMENT.DEFAULT) as AppConfig['environment'],
    },
  });
}

