// ============================================================================
// Client SDK Types
// ============================================================================

export interface ClientConfig {
  baseUrl: string;
  token?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  onRequest?: RequestInterceptor;
  onResponse?: ResponseInterceptor;
}

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit | Record<string, unknown> | null;
}

export interface ProgressEvent {
  loaded: number;
  total: number;
  percentage: number;
  rate?: number;
  eta?: number;
}

export type ProgressCallback = (event: ProgressEvent) => void;
export type RequestInterceptor = (options: RequestOptions, url: string) => RequestOptions;
export type ResponseInterceptor = (response: Response, url: string) => Response;

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
export const FileCategory = {
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  DOCUMENT: 'document',
  ARCHIVE: 'archive',
  APPLICATION: 'application',
  FONT: 'font',
  MODEL: 'model',
  DATA: 'data',
  OTHER: 'other',
} as const;
export type FileTypes = typeof FileCategory[keyof typeof FileCategory];
export interface UploadOptions {
  metadata?: Record<string, unknown>;
  category?: FileTypes;
  onProgress?: ProgressCallback;
}

export interface DownloadOptions {
  onProgress?: ProgressCallback;
}

export type Environment = 'browser' | 'node' | 'bun';
