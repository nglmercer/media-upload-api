import BaseApi, { PrefixedApi } from './commons/BaseApi';
import type { FetchOptions } from './commons/httpservice';
import apiConfig from './config/apiConfig';

export type MediaType = 'image' | 'audio' | 'video' | 'subtitle';

export interface MediaRecord {
  id: string;
  type: MediaType;
  url: string;
  name: string;
  size: number;
  sizeFormatted: string;
  metadata: Record<string, unknown>;
}

export interface SyncResponse {
  message: string;
  added: number;
  details: Record<MediaType, number>;
}

export interface StatsResponse {
  total: {
    count: number;
    size: number;
    sizeFormatted: string;
  };
  byType: Record<MediaType, {
    count: number;
    size: number;
    sizeFormatted: string;
  }>;
}

export interface SizeResponse {
  id: string;
  size: number;
  sizeFormatted: string;
}

class MediaApi extends PrefixedApi {
  constructor(config: typeof apiConfig) {
    super(config, '/api/media');
  }

  async uploadMedia(type: MediaType, file: File, metadata?: Record<string, unknown>): Promise<MediaRecord> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }
    return this.post<MediaRecord>(`/upload/${type}`, formData);
  }

  async deleteMedia(id: string): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/${id}`);
  }

  async syncMedia(): Promise<SyncResponse> {
    return this.post<SyncResponse>('/sync');
  }

  async getMediaByType(type: MediaType): Promise<MediaRecord[]> {
    return this.get<MediaRecord[]>(`/data/${type}`);
  }

  async getStats(): Promise<StatsResponse> {
    return this.get<StatsResponse>('/stats');
  }

  async getMediaSize(id: string): Promise<SizeResponse> {
    return this.get<SizeResponse>(`/${id}/size`);
  }

  // This matches the route in index.ts: app.get('/api/media/data', ...)
  // Since PrefixedApi adds /api/media, we need to be careful.
  // The route in index.ts is /api/media/data.
  // If we use this.get('/data'), it becomes /api/media/data.
  async getAllMedia(): Promise<Record<string, MediaRecord>> {
    return this.get<Record<string, MediaRecord>>('/data');
  }
}

export default MediaApi;