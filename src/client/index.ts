// ============================================================================
// Media Upload API - Unified Client SDK
// Supports both Browser and Node.js environments
// ============================================================================

// Re-export types
export type {
  ClientConfig,
  RequestOptions,
  ProgressEvent,
  ProgressCallback,
  RequestInterceptor,
  ResponseInterceptor,
  ListFilters,
  PaginatedResult,
  QuotaInfo,
  GlobalQuotaInfo,
  PublicConfig,
  TokenInfo,
  FileItem,
  UploadOptions,
  DownloadOptions,
  Environment,
} from './types';

// Re-export errors
export {
  MediaUploadError,
  NetworkError,
  TimeoutError,
  QuotaExceededError,
  ValidationError,
} from './errors';

// Re-export core
export { CoreClient, ENV } from './core';

// Re-export clients
export { FileClient } from './files';
export { QuotaClient } from './quota';
export { ConfigClient } from './config';
export { AuthClient } from './auth';

// ============================================================================
// Main MediaUploadClient Class
// ============================================================================

import { CoreClient } from './core';
import { FileClient } from './files';
import { QuotaClient } from './quota';
import { ConfigClient } from './config';
import { AuthClient } from './auth';
import type { ClientConfig } from './types';

export class MediaUploadClient {
  public config: Required<ClientConfig>;
  public files: FileClient;
  public quota: QuotaClient;
  public configClient: ConfigClient;
  public auth: AuthClient;

  constructor(config: ClientConfig) {
    const coreClient = new CoreClient(config);
    this.config = coreClient.config as Required<ClientConfig>;

    // Initialize sub-clients
    this.files = new FileClient(coreClient);
    this.quota = new QuotaClient(coreClient);
    this.configClient = new ConfigClient(coreClient);
    this.auth = new AuthClient(coreClient);
  }

  // Set/update token
  setToken(token: string | null): void {
    if (token) {
      this.config.token = token;
    } else {
      delete (this.config as any).token;
    }
  }

  // Get environment info
  getEnvironment(): string {
    return (this.files as any).client.getEnvironment();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a client for browser environment
 */
export function createBrowserClient(config: ClientConfig): MediaUploadClient {
  return new MediaUploadClient(config);
}

/**
 * Create a client for Node.js environment
 */
export function createNodeClient(config: ClientConfig): MediaUploadClient {
  return new MediaUploadClient(config);
}

/**
 * Create a client that automatically detects environment
 */
export function createClient(config: ClientConfig): MediaUploadClient {
  return new MediaUploadClient(config);
}

// ============================================================================
// Default Export
// ============================================================================

export default MediaUploadClient;
