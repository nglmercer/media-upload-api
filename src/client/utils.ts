/**
 * URL Utilities
 * 
 * Centralized logic for resolving backend and WebSocket URLs
 * across different environments (local, production, cloud).
 */

const DEFAULT_BACKEND_PORT = '3001';

/**
 * Checks if a hostname is a local/development environment
 */
export function isLocalHostname(hostname: string): boolean {
  if (!hostname) return false;
  
  // Only the most common local dev hostnames
  return (
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.endsWith('.local')
  );
}

/**
 * Resolves the backend base URL dynamically based on the current environment
 */
export function resolveBackendUrl(envUrl?: string): string {
  const urlParam = envUrl || '';
  let url = urlParam;
  
/*   if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    const isLocal = isLocalHostname(hostname);

    if (url) return url;

    // Default to current origin (safe for production and local dev)
    let portPart = '';
    if (port && port !== '80' && port !== '443') {
      portPart = `:${port}`;
    } else if (!port && isLocal) {
      portPart = `:${DEFAULT_BACKEND_PORT}`;
    }

    return `${protocol}//${hostname}${portPart}`;
  }
 */
  return url || `http://localhost:${DEFAULT_BACKEND_PORT}`;
}

/**
 * Resolves the WebSocket URL dynamically
 */
export function resolveWebSocketUrl(backendUrl: string): string {
  try {
    const url = new URL(backendUrl);
    url.protocol = url.protocol.replace('http', 'ws');
    
    // Ensure we don't have double slashes if pathname is empty or just /
    if (url.pathname === '/' || !url.pathname) {
      url.pathname = '/ws';
    } else if (!url.pathname.endsWith('/ws')) {
      // If there's a path, append /ws but avoid duplication
      url.pathname = url.pathname.replace(/\/$/, '') + '/ws';
    }
    
    return url.toString();
  } catch (e) {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      // host already includes port if present
      return `${protocol}//${host}/ws`;
    }
    return `ws://localhost:${DEFAULT_BACKEND_PORT}/ws`;
  }
}
