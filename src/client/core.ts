// ============================================================================
// Core Client
// ============================================================================

import type { 
  ClientConfig, 
  RequestOptions, 
  Environment,
  ProgressCallback 
} from './types';
import { 
  MediaUploadError, 
  NetworkError, 
  TimeoutError,
  QuotaExceededError,
  ValidationError 
} from './errors';

// Environment detection - always defaults to 'browser' for safety
function detectEnvironment(): Environment {
  // Default to browser for safety
  let detectedEnv: Environment = 'browser';
  
  try {
    // Check for browser first (most common case)
    if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
      return 'browser';
    }
    
    // Check for Bun
    //@ts-ignore - Bun global may not be recognized
    if (typeof Bun !== 'undefined') {
      return 'bun';
    }
    
    // Check for Node.js - be very explicit about the check
    if (
      typeof process !== 'undefined' &&
      process !== null &&
      typeof process.versions === 'object' &&
      process.versions !== null &&
      typeof process.versions.node === 'string' &&
      process.versions.node.length > 0
    ) {
      return 'node';
    }
  } catch {
    // Any error during detection, default to browser
    return 'browser';
  }
  
  // Default to browser for any unexpected case
  return 'browser';
}

export const ENV = detectEnvironment();

// Internal: Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Parse error response
async function parseError(response: Response): Promise<MediaUploadError> {
  try {
    const data = await response.json();
    const message = data.error || data.message || `HTTP ${response.status}`;
    
    if (response.status === 403 && data.quota) {
      return new QuotaExceededError(message, data.quota);
    }
    
    return new MediaUploadError(message, 'HTTP_ERROR', response.status, data);
  } catch {
    return new MediaUploadError(
      `HTTP ${response.status}: ${response.statusText}`,
      'HTTP_ERROR',
      response.status
    );
  }
}

// Execute HTTP request
async function executeRequest<T>(
  url: string,
  method: string,
  body: BodyInit | undefined,
  headers: Record<string, string>,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError();
    }
    throw new NetworkError(
      error instanceof Error ? error.message : 'Network request failed',
      error instanceof Error ? error : undefined
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

// Core client class
import { resolveBackendUrl } from './utils';

export class CoreClient {
  public config: Required<ClientConfig>;

  constructor(config: ClientConfig) {
    // Provide a dynamic fallback for browser environments
    const defaultBaseUrl = resolveBackendUrl();

    const configWithDefaults = {
      // Override the baseUrl if it's provided in config, otherwise use the default
      ...(config.baseUrl ? {} : { baseUrl: defaultBaseUrl }),
      ...config,
    };
    
    if (!configWithDefaults.baseUrl) {
      throw new ValidationError('baseUrl is required');
    }

    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      onRequest: undefined,
      onResponse: undefined,
      ...configWithDefaults,
    } as Required<ClientConfig>;
  }

  // Get environment
  getEnvironment(): Environment {
    return ENV;
  }

  // Set token
  setToken(token: string | null): void {
    if (token) {
      (this.config as any).token = token;
    } else {
      delete (this.config as any).token;
    }
  }

  // Main request method with retry
  async request<T>(
    method: string,
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { baseUrl, timeout, retryAttempts, retryDelay, token, onRequest, onResponse } = this.config;
    const url = `${baseUrl}${path}`;

    // Build headers
    const headers: Record<string, string> = {
      ...options.headers,
    };

    if (token) {
      headers['X-Auth-Token'] = token;
    }

    // Apply request interceptor
    const finalOptions = onRequest
      ? onRequest({ ...options, headers }, url)
      : { ...options, headers };

    // Handle body
    let body: BodyInit | undefined;
    if (finalOptions.body) {
      if (typeof finalOptions.body === 'object' && !(finalOptions.body instanceof FormData)) {
        body = JSON.stringify(finalOptions.body);
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      } else {
        body = finalOptions.body as BodyInit;
      }
    }

    // Retry logic
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        const response = await executeRequest<T>(
          url,
          method,
          body,
          headers,
          timeout
        );

        // Apply response interceptor
        const finalResponse = onResponse
          ? onResponse(response, url)
          : response;

        if (!finalResponse.ok) {
          const error = await parseError(finalResponse);
          throw error;
        }

        return await finalResponse.json();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (error instanceof MediaUploadError) {
          if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 400) {
            throw error;
          }
        }

        // Wait before retry
        if (attempt < retryAttempts) {
          await sleep(retryDelay * (attempt + 1));
        }
      }
    }

    throw lastError;
  }
}
