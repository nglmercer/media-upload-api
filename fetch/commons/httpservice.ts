// httpservice.ts - Servicio HTTP actualizado con soporte para proxy
import { safeParse } from "./safeparse.ts";
import { proxyConfig } from './proxyConfig.ts';
import type{ ProxyConfig } from "../config/apiConfig.ts";

type FetchOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
  useProxy?: boolean;
  proxyConfig?: Partial<ProxyConfig>;
  responseType?: 'json' | 'blob' | 'text' | 'arrayBuffer';
};

type RequestBody = Record<string, any> | FormData;
/**
 * Maneja la respuesta de la API
 */
async function handleResponse<T>(res: Response, responseType: string = 'json'): Promise<T | any> {
  if (res.status === 204) {
    return Promise.resolve(undefined);
  }
  
  // Handle different response types
  switch (responseType) {
    case 'blob':
      return res.blob() as Promise<T>;
    case 'text':
      return res.text() as Promise<T>;
    case 'arrayBuffer':
      return res.arrayBuffer() as Promise<T>;
    case 'json':
    default:
      const text = await res.text();
      if (!text) {
        return Promise.resolve(undefined);
      }
      
      try {
        return safeParse(text) as T;
      } catch (error) {
        console.error("Falló el análisis de la respuesta:", error);
        return Promise.reject(new Error("La respuesta no pudo ser analizada."));
      }
  }
}

/**
 * Prepara las opciones de fetch considerando el proxy
 */
function prepareFetchOptions(url: string, options: FetchOptions = {}): [string, RequestInit] {
  const { useProxy = proxyConfig.isEnabled(), proxyConfig: customProxyConfig, ...fetchOptions } = options;
  
  // Si no se usa proxy, retorna como estaba
  if (!useProxy) {
    return [url, fetchOptions];
  }

  // Usar configuración personalizada del proxy si se proporciona
  if (customProxyConfig) {
    const tempConfig = proxyConfig.get();
    proxyConfig.update(customProxyConfig);
    
    const result = buildProxyRequest(url, fetchOptions);
    
    // Restaurar configuración original
    proxyConfig.update(tempConfig);
    
    return result;
  }

  // Usar configuración global del proxy
  return buildProxyRequest(url, fetchOptions);
}

/**
 * Normaliza headers a Record<string, string>
 */
function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  
  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  
  if (Array.isArray(headers)) {
    const result: Record<string, string> = {};
    headers.forEach(([key, value]) => {
      result[key] = value;
    });
    return result;
  }
  
  // Si es un objeto plano, asumimos que es Record<string, string>
  return headers as Record<string, string>;
}

/**
 * Construye la request con proxy
 */
function buildProxyRequest(url: string, options: RequestInit): [string, RequestInit] {
  if (!proxyConfig.isEnabled()) {
    return [url, options];
  }

  const proxyURL = proxyConfig.getProxyUrl();
  const proxyAuthHeaders = proxyConfig.getAuthHeaders();
  const normalizedHeaders = normalizeHeaders(options.headers);
  
  // En entornos del navegador, usamos el proxy como prefijo de URL
  // En Node.js, esto se manejaría diferente con agentes HTTP
  const finalUrl = proxyURL;
  const finalOptions: RequestInit = {
    ...options,
    headers: {
      ...normalizedHeaders,
      ...proxyAuthHeaders,
      'X-Proxy-Target': `${encodeURIComponent(url)}`, // Header personalizado para el proxy
    },
    // Agregar timeout si está configurado
    signal: AbortSignal.timeout(proxyConfig.getTimeout())
  };

  return [finalUrl, finalOptions];
}

/**
 * Wrapper para manejar errores de proxy
 */
async function executeRequest<T>(
  requestFn: () => Promise<Response>,
  fallbackFn?: () => Promise<Response>,
  responseType: string = 'json'
): Promise<T> {
  try {
    const response = await requestFn();
    return await handleResponse<T>(response, responseType);
  } catch (error) {
    
    // Si hay una función de fallback (sin proxy), intentarla
    if (fallbackFn) {
      console.warn('Error con proxy, intentando sin proxy:', error);
      try {
        const fallbackResponse = await fallbackFn();
        return await handleResponse<T>(fallbackResponse, responseType);
      } catch (fallbackError) {
        console.error('Error también sin proxy:', fallbackError);
        throw fallbackError;
      }
    }
    
    throw error;
  }
}

const http = {
  get: <T>(url: string, options: FetchOptions = {}): Promise<T> => {
    const { responseType = 'json', ...fetchOptions } = options;
    const [finalUrl, finalOptions] = prepareFetchOptions(url, { ...fetchOptions, method: 'GET' });
    
    const requestWithProxy = () => fetch(finalUrl, finalOptions);
    const requestWithoutProxy = options.useProxy !== false 
      ? () => fetch(url, { ...fetchOptions, method: 'GET' })
      : undefined;
    
    return executeRequest<T>(requestWithProxy, requestWithoutProxy, responseType);
  },

  post: <T>(url: string, body: RequestBody = {}, options: FetchOptions = {}): Promise<T> => {
    let finalOptions = { ...options, method: 'POST' as const };
    
    if (body instanceof FormData) {
      // Filtrar Content-Type para FormData
      const headers: Record<string, string> = {};
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          if (key.toLowerCase() !== 'content-type') {
            headers[key] = value;
          }
        });
      }
      finalOptions = { ...finalOptions, headers, body };
    } else {
      // Crear headers explícitamente como Record<string, string>
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers
      };
      finalOptions = {
        ...finalOptions,
        headers,
        body: JSON.stringify(body)
      };
    }

    const [finalUrl, preparedOptions] = prepareFetchOptions(url, finalOptions);
    
    const requestWithProxy = () => fetch(finalUrl, preparedOptions);
    const requestWithoutProxy = options.useProxy !== false 
      ? () => fetch(url, finalOptions)
      : undefined;
    
    return executeRequest<T>(requestWithProxy, requestWithoutProxy);
  },

  put: <T>(url: string, body: RequestBody = {}, options: FetchOptions = {}): Promise<T> => {
    // Crear headers explícitamente como Record<string, string>
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const finalOptions = {
      ...options,
      method: 'PUT' as const,
      headers,
      body: JSON.stringify(body)
    };

    const [finalUrl, preparedOptions] = prepareFetchOptions(url, finalOptions);
    
    const requestWithProxy = () => fetch(finalUrl, preparedOptions);
    const requestWithoutProxy = options.useProxy !== false 
      ? () => fetch(url, finalOptions)
      : undefined;
    
    return executeRequest<T>(requestWithProxy, requestWithoutProxy);
  },

  patch: <T>(url: string, body: RequestBody = {}, options: FetchOptions = {}): Promise<T> => {
    // Crear headers explícitamente como Record<string, string>
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const finalOptions = {
      ...options,
      method: 'PATCH' as const,
      headers,
      body: JSON.stringify(body)
    };

    const [finalUrl, preparedOptions] = prepareFetchOptions(url, finalOptions);
    
    const requestWithProxy = () => fetch(finalUrl, preparedOptions);
    const requestWithoutProxy = options.useProxy !== false 
      ? () => fetch(url, finalOptions)
      : undefined;
    
    return executeRequest<T>(requestWithProxy, requestWithoutProxy);
  },

  delete: <T>(url: string, options: FetchOptions = {}): Promise<T> => {
    const [finalUrl, finalOptions] = prepareFetchOptions(url, { ...options, method: 'DELETE' });
    
    const requestWithProxy = () => fetch(finalUrl, finalOptions);
    const requestWithoutProxy = options.useProxy !== false 
      ? () => fetch(url, { ...options, method: 'DELETE' })
      : undefined;
    
    return executeRequest<T>(requestWithProxy, requestWithoutProxy);
  }
};

function getParams(paramNames: string[] = []): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }
 
  const urlParams = new URLSearchParams(window.location.search);
  let paramsObject: Record<string, string> = {};
  urlParams.forEach((value, key) => {
    paramsObject[key] = value;
  });

  if (Object.keys(paramsObject).length === 0) {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= paramNames.length) {
      paramsObject = {};
      for (let i = 0; i < paramNames.length; i++) {
        paramsObject[paramNames[i]] = parts[i];
      }
    }
  }
  
  return paramsObject;
}

export {
  http,
  getParams,
  proxyConfig,
  type FetchOptions,
  type RequestBody,
  type ProxyConfig
};