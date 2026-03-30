import { createBrowserClient, FileCategory } from '../src/client/index';
import type {
  MediaUploadClient,
  FileItem,
  ListFilters,
  PaginatedResult,
  QuotaInfo,
  UploadOptions,
  FileTypes,
} from '../src/client/index';
import { resolveServiceUrl, normalizeMediaUrl, resolveMediaUrl } from './config';

const token = localStorage.getItem('session_id') || undefined;
const client = createBrowserClient({
  baseUrl: resolveServiceUrl('media-upload-api'),
  token,
});

// ── Type declarations ──────────────────────────────────────────────────────

interface UploadFileOpts {
  multiple?: boolean;
  accept?: string;
  category?: FileTypes;
}

declare global {
  interface Window {
    /** Full SDK client instance */
    client: MediaUploadClient;
    /** File category constants (image, audio, video, …) */
    FileCategory: typeof FileCategory;

    // ── File operations ───────────────────────────────────────────────
    /** List files with optional filters (category, status, page, pageSize) */
    listFiles(filters?: ListFilters): Promise<PaginatedResult<FileItem>>;
    /** Get a single file by ID */
    getFile(id: string): Promise<FileItem>;
    /** Open native file picker, upload selected files, return results */
    uploadFile(opts?: UploadFileOpts): Promise<FileItem[]>;
    /** Upload a File/Blob directly (no picker) */
    upload(file: File | Blob, opts?: UploadOptions): Promise<FileItem>;
    /** Delete a file by ID */
    deleteFile(id: string): Promise<void>;
    /** Download a file as a Blob */
    downloadFile(id: string): Promise<Blob>;
    /** Download a file and trigger browser save dialog */
    downloadFileAs(id: string, filename?: string): Promise<void>;

    // ── URL helpers ───────────────────────────────────────────────────
    /** Get the full absolute URL for a file item */
    getFileUrl(file: FileItem): string;
    /** Get a normalized relative URL for a file item */
    getNormalizedUrl(file: FileItem): string | undefined;
    /** Resolve a relative media URL to absolute */
    resolveMediaUrl(url: string | undefined): string | undefined;
    /** Normalize an absolute URL to relative */
    normalizeMediaUrl(url: string | undefined): string | undefined;

    // ── Quota / Auth ──────────────────────────────────────────────────
    /** Get current storage quota info */
    getQuota(): Promise<QuotaInfo>;
    /** Update the auth token */
    setAuthToken(token: string | null): void;
  }
}

// ── Expose SDK client globally ──────────────────────────────────────────────

window.client = client;
window.FileCategory = FileCategory;

// ── File operations ────────────────────────────────────────────────────────

window.listFiles = (filters?: ListFilters) => client.files.list(filters);

window.getFile = (id: string) => client.files.get(id);

window.uploadFile = async (opts: UploadFileOpts = {}) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = opts.multiple !== false;
  input.accept = opts.accept || '*/*';
  input.style.display = 'none';
  document.body.appendChild(input);

  return new Promise<FileItem[]>((resolve, reject) => {
    input.addEventListener('change', async () => {
      const files = input.files ? Array.from(input.files) : [];
      input.remove();
      if (!files.length) return resolve([]);
      try {
        const results = await Promise.all(
          files.map(f => client.files.upload(f, { category: opts.category }))
        );
        resolve(results);
      } catch (err) { reject(err); }
    });
    input.click();
  });
};

window.upload = (file: File | Blob, opts?: UploadOptions) =>
  client.files.upload(file, opts);

window.deleteFile = (id: string) => client.files.delete(id);

window.downloadFile = (id: string) => client.files.download(id);

window.downloadFileAs = async (id: string, filename?: string) => {
  const file = await client.files.get(id);
  const blob = await client.files.download(id);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || file.originalName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ── URL helpers ────────────────────────────────────────────────────────────

window.getFileUrl = (file: FileItem) => client.files.getUrl(file);

window.getNormalizedUrl = (file: FileItem) =>
  normalizeMediaUrl(client.files.getUrl(file));

window.resolveMediaUrl = (url: string | undefined) => resolveMediaUrl(url);

window.normalizeMediaUrl = (url: string | undefined) => normalizeMediaUrl(url);

// ── Quota / Auth ───────────────────────────────────────────────────────────

window.getQuota = () => client.quota.get();

window.setAuthToken = (token: string | null) => client.setToken(token);

// ── Debug listener ─────────────────────────────────────────────────────────

window.addEventListener('message', e =>
  console.log('[WidgetEvent]', e.data?.type, e.data?.detail)
);
