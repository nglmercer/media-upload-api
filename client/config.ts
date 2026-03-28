import z from 'zod';
import { resolveBackendUrl, resolveWebSocketUrl } from '../src/client/utils';

export const ServiceName = {
  MEDIA_UPLOAD_API: 'media-upload-api',
  OVERLAY_SERVICE: 'overlay-service',
} as const;

export function getBackendUrl(): string {
  const envUrl = (typeof process !== 'undefined' && process?.env?.VITE_BACKEND_URL) || '';
  const resolvedUrl = resolveBackendUrl(envUrl);
  return resolvedUrl;
}

export function getWebSocketUrl(): string {
  const backendUrl = getBackendUrl();
  return resolveWebSocketUrl(backendUrl);
}

export function resolveServiceUrl(name: string, fallback?: string): string {
  if (name === ServiceName.MEDIA_UPLOAD_API || name === 'media-upload-api') {
    return getBackendUrl();
  }
  return fallback || getBackendUrl();
}

export function resolveMediaUrl(url: string | undefined): string | undefined {
  if (!url || typeof url !== 'string' || url === '') return url;
  if (url.startsWith('http')) return url;
  
  const backendUrl = getBackendUrl();
  const cleanBase = backendUrl.replace(/\/$/, '');
  const cleanPath = url.startsWith('/') ? url : '/' + url;
  return cleanBase + cleanPath;
}

export function normalizeMediaUrl(url: string | undefined): string | undefined {
  if (!url || typeof url !== 'string' || url === '') return url;
  if (!url.startsWith('http')) return url;

  const backendUrl = getBackendUrl();
  const internalBases = [backendUrl].filter(Boolean) as string[];

  for (const base of internalBases) {
    if (url.startsWith(base)) {
      const path = url.slice(base.length);
      return path.startsWith('/') ? path : '/' + path;
    }
  }

  try {
    const urlObj = new URL(url);
    const backendObj = new URL(backendUrl);
    
    if (urlObj.hostname === backendObj.hostname && 
        (urlObj.pathname.startsWith('/api/') || urlObj.pathname.startsWith('/uploads/'))) {
      return urlObj.pathname + urlObj.search;
    }
    
    const isIpOrLocalhost = urlObj.hostname === 'localhost' || 
                           urlObj.hostname === '127.0.0.1' || 
                           /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(urlObj.hostname);
    
    if (isIpOrLocalhost && (urlObj.pathname.startsWith('/api/') || urlObj.pathname.startsWith('/uploads/'))) {
      return urlObj.pathname + urlObj.search;
    }
  } catch {
  }

  return url;
}
