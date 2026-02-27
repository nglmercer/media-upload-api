// ============================================================================
// File Client
// ============================================================================

import type { CoreClient } from './core';
import type { 
  FileItem, 
  ListFilters, 
  PaginatedResult, 
  UploadOptions, 
  DownloadOptions,
  ProgressCallback 
} from './types';
import { ENV } from './core';

export class FileClient {
  constructor(private client: CoreClient) {}

  async upload(
    file: File | Blob | ArrayBuffer,
    options?: UploadOptions
  ): Promise<FileItem> {
    const formData = new FormData();
    let fileToUpload: File | Blob = file as File | Blob;

    // Handle different file types
    if (file instanceof ArrayBuffer) {
      fileToUpload = new Blob([file]);
    }

    formData.append('file', fileToUpload);

    if (options?.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata));
    }

    if (options?.category) {
      formData.append('category', options.category);
    }

    // Use upload with progress if callback provided
    if (options?.onProgress && ENV !== 'node' && (file instanceof File || file instanceof Blob)) {
      return this.uploadWithProgressBrowser(fileToUpload, options.onProgress);
    }

    return this.client.request<FileItem>('POST', '/api/files', {
      body: formData,
    });
  }

  private async uploadWithProgressBrowser(
    file: File | Blob,
    onProgress: ProgressCallback
  ): Promise<FileItem> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${(this.client as any).config.baseUrl}/api/files`;

      xhr.open('POST', url);

      if ((this.client as any).config.token) {
        xhr.setRequestHeader('X-Auth-Token', (this.client as any).config.token);
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

  async uploadNode(
    filePath: string,
    options?: UploadOptions
  ): Promise<FileItem> {
    const { readFile, stat } = await import('fs/promises');
    
    const fileStats = await stat(filePath);
    const fileSize = fileStats.size;
    
    const baseUrl = (this.client as any).config.baseUrl;
    const token = (this.client as any).config.token;
    const url = `${baseUrl}/api/files`;
    
    const fileBuffer = await readFile(filePath);
    const blob = new Blob([fileBuffer]);
    
    const formData = new FormData();
    formData.append('file', blob, filePath.split('/').pop() || 'upload');
    
    if (options?.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata));
    }

    if (options?.category) {
      formData.append('category', options.category);
    }
    
    if (options?.onProgress) {
      options.onProgress({ loaded: 0, total: fileSize, percentage: 0 });
    }
    
    const headers: Record<string, string> = {};
    if (token) {
      headers['X-Auth-Token'] = token;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (options?.onProgress) {
      options.onProgress({ loaded: fileSize, total: fileSize, percentage: 100 });
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || `Upload failed: ${response.status}`);
    }
    
    return response.json();
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

  async download(id: string, options?: DownloadOptions): Promise<Blob> {
    const baseUrl = (this.client as any).config.baseUrl;
    const token = (this.client as any).config.token;
    const url = `${baseUrl}/api/files/${id}/download`;

    const headers: Record<string, string> = {};
    if (token) {
      headers['X-Auth-Token'] = token;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    if (options?.onProgress) {
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      if (total > 0) {
        options.onProgress({ loaded: 0, total, percentage: 0 });
      }
    }

    return response.blob();
  }

  async downloadNode(id: string, outputPath: string, options?: DownloadOptions): Promise<void> {
    const { createWriteStream } = await import('fs');
    
    const baseUrl = (this.client as any).config.baseUrl;
    const token = (this.client as any).config.token;
    const url = `${baseUrl}/api/files/${id}/download`;

    const response = await fetch(url, {
      headers: token ? { 'X-Auth-Token': token } : {},
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const fileStream = createWriteStream(outputPath);
    const body = response.body;

    if (!body) {
      throw new Error('Response body is null');
    }

    const total = parseInt(response.headers.get('content-length') || '0', 10);
    let loaded = 0;

    const reader = body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        loaded += value.length;
        fileStream.write(Buffer.from(value));

        if (options?.onProgress) {
          options.onProgress({
            loaded,
            total,
            percentage: total > 0 ? (loaded / total) * 100 : 100,
            rate: loaded / (Date.now() / 1000),
            eta: total > 0 ? (total - loaded) / (loaded / (Date.now() / 1000)) : 0,
          });
        }
      }
    } finally {
      fileStream.end();
    }
  }

  getUrl(id: string): string {
    return `${(this.client as any).config.baseUrl}/uploads/${id}`;
  }

  getCategories(): Promise<{ categories: string[]; securityCategories: string[] }> {
    return this.client.request('GET', '/api/files/categories');
  }

  async getSuspicious(): Promise<{ suspicious: FileItem[]; quarantine: FileItem[] }> {
    return this.client.request('GET', '/api/files/suspicious');
  }

  async updateStatus(id: string, status: string): Promise<FileItem> {
    return this.client.request<FileItem>('PUT', `/api/files/${id}/status`, {
      body: JSON.stringify({ status }),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
