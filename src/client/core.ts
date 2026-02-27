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

// Environment detection
function detectEnvironment(): Environment {
  if (typeof window !== 'undefined') return 'browser';
  if (typeof Bun !== 'undefined') return 'bun';
  if (typeof process !== 'undefined' && process.versions?.node) return 'node';
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
export class CoreClient {
  public config: Required<ClientConfig>;

  constructor(config: ClientConfig) {
    if (!config.baseUrl) {
      throw new ValidationError('baseUrl is required');
    }

    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      onRequest: undefined,
      onResponse: undefined,
      ...config,
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
