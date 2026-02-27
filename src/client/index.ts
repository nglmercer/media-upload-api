// ============================================================================
// Client SDK Types
// ============================================================================

export interface ClientConfig {
  baseUrl: string;
  token?: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit;
}

export interface ProgressEvent {
  loaded: number;
  total: number;
  percentage: number;
}

export type ProgressCallback = (event: ProgressEvent) => void;

export interface ListFilters {
  category?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  files: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: Record<string, unknown>;
}

export interface QuotaInfo {
  maxFiles: number;
  maxStorage: number;
  usedFiles: number;
  usedStorage: number;
  remainingFiles: number;
  remainingStorage: number;
  usagePercentage: number;
}

export interface GlobalQuotaInfo {
  maxFiles: number;
  maxStorage: number;
  usedFiles: number;
  usedStorage: number;
  byCategory: Record<string, { count: number; storage: number }>;
}

export interface PublicConfig {
  oauth: {
    enabled: boolean;
    tokenAuthEnabled: boolean;
  };
  quota: {
    defaults: {
      maxStorageBytes: number;
      maxFiles: number;
    };
  };
  server: {
    maxFileSizeBytes: number;
    allowedMimeTypes: string[];
  };
}

export interface TokenInfo {
  authenticated: boolean;
  userId: string | null;
  label: string | null;
  permissions: string[];
}

export interface FileItem {
  id: string;
  name: string;
  originalName: string;
  category: string;
  mimeType: string | null;
  extension: string;
  size: number;
  sizeFormatted: string;
  status: string;
  flags: string[];
  url: string;
  storagePath: string;
  integrity: {
    sha256: string;
  };
  metadata?: Record<string, unknown>;
  tags?: string[];
  uploadedBy: string | null;
  uploadedAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface UploadOptions {
  metadata?: Record<string, unknown>;
  category?: string;
}

// ============================================================================
// Main Client Class
// ============================================================================

export class MediaUploadClient {
  public config: ClientConfig;
  public files: FileClient;
  public quota: QuotaClient;
  public configClient: ConfigClient;
  public auth: AuthClient;

  constructor(config: ClientConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      ...config,
    };

    // Initialize sub-clients
    this.files = new FileClient(this);
    this.quota = new QuotaClient(this);
    this.configClient = new ConfigClient(this);
    this.auth = new AuthClient(this);
  }

  // Internal: Make HTTP request
  async request<T>(
    method: string,
    path: string,
    options?: RequestOptions
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    
    const headers: HeadersInit = {
      ...options?.headers,
    };
    
    if (this.config.token) {
      (headers as Record<string, string>)['X-Auth-Token'] = this.config.token;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options?.body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Set/update token
  setToken(token: string | null): void {
    this.config.token = token || undefined;
  }
}

// ============================================================================
// File Client
// ============================================================================

class FileClient {
  private client: MediaUploadClient;

  constructor(client: MediaUploadClient) {
    this.client = client;
  }

  async upload(
    file: File | Blob,
    options?: UploadOptions
  ): Promise<FileItem> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options?.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata));
    }
    
    if (options?.category) {
      formData.append('category', options.category);
    }

    return this.client.request<FileItem>('POST', '/api/files', {
      body: formData,
    });
  }

  async uploadWithProgress(
    file: File,
    onProgress: ProgressCallback
  ): Promise<FileItem> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${this.client.config.baseUrl}/api/files`;
      
      xhr.open('POST', url);
      
      if (this.client.config.token) {
        xhr.setRequestHeader('X-Auth-Token', this.client.config.token);
      }

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percentage: (e.loaded / e.total) * 100,
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error('Invalid response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

      const formData = new FormData();
      formData.append('file', file);
      xhr.send(formData);
    });
  }

  async list(filters?: ListFilters): Promise<PaginatedResult<FileItem>> {
    const params = new URLSearchParams();
    
    if (filters?.category) params.set('category', filters.category);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));

    const queryString = params.toString();
    const path = queryString ? `/api/files?${queryString}` : '/api/files';
    
    return this.client.request<PaginatedResult<FileItem>>('GET', path);
  }

  async get(id: string): Promise<FileItem> {
    return this.client.request<FileItem>('GET', `/api/files/${id}`);
  }

  async delete(id: string): Promise<void> {
    await this.client.request('DELETE', `/api/files/${id}`);
  }

  async download(id: string): Promise<Blob> {
    const url = `${this.client.config.baseUrl}/api/files/${id}/download`;
    
    const headers: Record<string, string> = {};
    if (this.client.config.token) {
      headers['X-Auth-Token'] = this.client.config.token;
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    return response.blob();
  }

  getUrl(id: string): string {
    return `${this.client.config.baseUrl}/uploads/files/${id}`;
  }

  getCategories(): Promise<{ categories: string[]; securityCategories: string[] }> {
    return this.client.request('GET', '/api/files/categories');
  }

  async getSuspicious(): Promise<{ suspicious: FileItem[]; quarantine: FileItem[] }> {
    return this.client.request('GET', '/api/files/suspicious');
  }
}

// ============================================================================
// Quota Client
// ============================================================================

class QuotaClient {
  private client: MediaUploadClient;

  constructor(client: MediaUploadClient) {
    this.client = client;
  }

  async get(): Promise<QuotaInfo> {
    return this.client.request<QuotaInfo>('GET', '/api/quota');
  }

  async getGlobal(): Promise<GlobalQuotaInfo> {
    return this.client.request<GlobalQuotaInfo>('GET', '/api/quota/global');
  }
}

// ============================================================================
// Config Client
// ============================================================================

class ConfigClient {
  private client: MediaUploadClient;

  constructor(client: MediaUploadClient) {
    this.client = client;
  }

  async get(): Promise<PublicConfig> {
    return this.client.request<PublicConfig>('GET', '/api/config');
  }

  async getServer(): Promise<Record<string, unknown>> {
    return this.client.request('GET', '/api/config/server');
  }

  async update(config: Record<string, unknown>): Promise<void> {
    await this.client.request('PUT', '/api/config', {
      body: JSON.stringify(config),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async addToken(token: string, tokenConfig: {
    userId: string;
    label: string;
    permissions?: string[];
    expiresAt?: number;
    quota?: { maxStorageBytes?: number; maxFiles?: number };
  }): Promise<{ userId: string; label: string }> {
    return this.client.request('POST', '/api/config/token', {
      body: JSON.stringify({ token, ...tokenConfig }),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async removeToken(userId: string): Promise<void> {
    await this.client.request('DELETE', `/api/config/token/${userId}`);
  }

  async listTokens(): Promise<{ tokens: unknown[] }> {
    return this.client.request('GET', '/api/config/tokens');
  }
}

// ============================================================================
// Auth Client
// ============================================================================

class AuthClient {
  private client: MediaUploadClient;

  constructor(client: MediaUploadClient) {
    this.client = client;
  }

  async validate(): Promise<{ valid: boolean; userId?: string }> {
    try {
      return await this.client.request('GET', '/api/auth/validate');
    } catch {
      return { valid: false };
    }
  }

  async getInfo(): Promise<TokenInfo | { authenticated: false }> {
    try {
      return await this.client.request<TokenInfo>('GET', '/api/auth/info');
    } catch {
      return { authenticated: false };
    }
  }

  async getPermissions(): Promise<{ permissions: string[] }> {
    return this.client.request('GET', '/api/auth/permissions');
  }
}

// ============================================================================
// Export
// ============================================================================

export default MediaUploadClient;
