// ============================================================================
// Client SDK Error Classes
// ============================================================================

import type { QuotaInfo } from './types';

export class MediaUploadError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'MediaUploadError';
  }
}

export class NetworkError extends MediaUploadError {
  constructor(message: string, public originalError?: Error) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends MediaUploadError {
  constructor(message = 'Request timed out') {
    super(message, 'TIMEOUT');
    this.name = 'TimeoutError';
  }
}

export class QuotaExceededError extends MediaUploadError {
  constructor(message: string, public quotaInfo?: QuotaInfo) {
    super(message, 'QUOTA_EXCEEDED', 403);
    this.name = 'QuotaExceededError';
  }
}

export class ValidationError extends MediaUploadError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}
