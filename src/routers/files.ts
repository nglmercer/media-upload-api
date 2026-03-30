import path from "path";
import { mkdir, unlink, readFile } from "fs/promises";
import { fileStore } from "../store/fileStore";
import { fileValidator } from "../services/file-validator";
import { quotaManager } from "../services/quota-manager";
import { config, Permission } from "../config";
import { getAuth } from "../middleware/auth";
import { json, matchPath, type ServerContext } from "../utils/vanilla-http";
import {
  FileStatus,
  FileCategory,
  getExtensionFromMime,
  type FileItem,
} from "../types/file";

// Helper: format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Helper: get directory for category
function getDirectoryForCategory(category: string): string {
  const dirMap: Record<string, string> = {
    image: 'images',
    audio: 'audio',
    video: 'video',
    document: 'documents',
    archive: 'archives',
    application: 'applications',
    font: 'fonts',
    model: 'models',
    data: 'data',
    other: 'other',
    unknown: 'unknown',
    mismatch: 'mismatch',
    corrupted: 'corrupted',
    disguised: 'disguised',
    quarantine: 'quarantine',
  };
  return dirMap[category] || 'other';
}

/**
 * POST /api/files - Upload a file
 */
async function uploadFile(req: Request, ctx: ServerContext) {
  const auth = getAuth(ctx);
  if (!auth.permissions.includes(Permission.UPLOAD)) return json({ error: 'Upload permission required' }, 403);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return json({ error: 'Invalid form data' }, 400);
  }

  const file = formData.get('file');
  if (!(file instanceof File)) return json({ error: 'Missing file field' }, 400);

  const validation = await fileValidator.validate(file);
  const quotaCheck = await quotaManager.checkQuota(auth.userId, file.size);
  if (!quotaCheck.allowed) return json({ error: quotaCheck.reason }, 403);

  let status: string = FileStatus.VALID;
  if (validation.flags.length > 0) {
    status = (validation.category === 'corrupted' || validation.category === 'disguised') 
      ? FileStatus.QUARANTINE : FileStatus.SUSPICIOUS;
  }

  const id = crypto.randomUUID();
  const ext = validation.detectedExtension || getExtensionFromMime(validation.detectedMime || '') || '';
  const fileCategory = validation.category;

  const serverConfig = config.getServer();
  const uploadsDir = path.isAbsolute(serverConfig.uploadsDir)
    ? serverConfig.uploadsDir
    : path.join(process.cwd(), serverConfig.uploadsDir);

  const baseDir = path.join(uploadsDir, getDirectoryForCategory(fileCategory));
  const fileName = `${id}${ext}`;
  const filePath = path.join(baseDir, fileName);

  await mkdir(baseDir, { recursive: true });
  await Bun.write(filePath, file);

  const url = `/uploads/${getDirectoryForCategory(fileCategory)}/${fileName}`;
  const isPublic = formData.get('isPublic') !== 'false'; // Default to true

  const fileRecord: FileItem = {
    id,
    name: fileName,
    originalName: file.name,
    category: validation.category,
    mimeType: validation.detectedMime,
    extension: ext,
    size: file.size,
    sizeFormatted: formatFileSize(file.size),
    status: status as FileItem['status'],
    flags: validation.flags,
    url,
    isPublic,
    storagePath: filePath,
    integrity: { sha256: validation.integrity.sha256 },
    metadata: {},
    tags: [],
    uploadedBy: auth.userId,
    uploadedAt: Date.now(),
    updatedAt: Date.now(),
    deletedAt: null,
  };

  const metadataRaw = formData.get('metadata');
  if (typeof metadataRaw === 'string') {
    try { fileRecord.metadata = JSON.parse(metadataRaw); } catch {}
  }

  await fileStore.save(id, fileRecord);
  await quotaManager.reserveQuota(auth.userId, file.size, fileCategory as FileCategory);

  return json(fileRecord, 201);
}

/**
 * GET /api/files - List files
 */
async function listFiles(req: Request, ctx: ServerContext) {
  const auth = getAuth(ctx);
  // Removed strict LIST check to allow access to public files even without the permission

  const category = ctx.url.searchParams.get('category');
  const status = ctx.url.searchParams.get('status');
  const page = parseInt(ctx.url.searchParams.get('page') || '1');
  const pageSize = parseInt(ctx.url.searchParams.get('pageSize') || '50');

  let files = Object.values(await fileStore.getAll());
  
  // Apply permission filtering: if not authorized to list all, only show public ones
  if (!auth.permissions.includes(Permission.LIST)) {
    files = files.filter(f => f.isPublic);
  }

  if (category) files = files.filter(f => f.category === category);
  if (status) files = files.filter(f => f.status === status);
  files = files.filter(f => f.status !== FileStatus.DELETED);
  files.sort((a, b) => b.uploadedAt - a.uploadedAt);

  const total = files.length;
  const start = (page - 1) * pageSize;
  const pagedFiles = files.slice(start, start + pageSize);

  return json({
    files: pagedFiles,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    filters: { category, status },
  });
}

/**
 * GET /api/files/:id/download - Download file
 */
async function downloadFile(req: Request, ctx: ServerContext) {
  const auth = getAuth(ctx);
  const file = await fileStore.get(ctx.params.id);
  if (!file || file.status === FileStatus.DELETED) return json({ error: 'File not found' }, 404);

  const canRead = file.isPublic || auth.permissions.includes(Permission.READ);
  if (!canRead) return json({ error: 'Read permission required' }, 403);

  try {
    const data = await readFile(file.storagePath);
    return new Response(data, {
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.originalName}"`,
      },
    });
  } catch { return json({ error: 'File not accessible' }, 500); }
}

/**
 * Main Files Router
 */
export async function filesRouter(req: Request, ctx: ServerContext): Promise<Response | null> {
  const { pathname } = ctx.url;
  const { method } = req;

  if (pathname === '/api/files') {
    if (method === 'POST') return uploadFile(req, ctx);
    if (method === 'GET') return listFiles(req, ctx);
  }

  if (pathname === '/api/files/categories' && method === 'GET') {
    return json({ categories: Object.values(FileCategory), securityCategories: ['unknown', 'mismatch', 'corrupted', 'disguised'] });
  }

  if (pathname === '/api/files/suspicious' && method === 'GET') {
    const auth = getAuth(ctx);
    if (!auth.permissions.includes(Permission.LIST)) return json({ error: 'List permission required' }, 403);
    const suspicious = await fileStore.findByStatus(FileStatus.SUSPICIOUS);
    const quarantine = await fileStore.findByStatus(FileStatus.QUARANTINE);
    return json({ suspicious, quarantine });
  }

  let params = matchPath('/api/files/:id', pathname);
  if (params) {
    ctx.params = { ...ctx.params, ...params };
    if (method === 'GET') {
      const auth = getAuth(ctx);
      const file = await fileStore.get(params.id);
      
      if (!file || file.status === FileStatus.DELETED) {
        return json({ error: 'File not found' }, 404);
      }

      const canRead = file.isPublic || auth.permissions.includes(Permission.READ);
      if (!canRead) return json({ error: 'Read permission required' }, 403);

      return json(file);
    }
    if (method === 'DELETE') {
       const auth = getAuth(ctx);
       if (!auth.permissions.includes(Permission.DELETE)) return json({ error: 'Delete permission required' }, 403);
       const file = await fileStore.get(params.id);
       if (!file) return json({ error: 'File not found' }, 404);
       file.status = FileStatus.DELETED;
       file.deletedAt = Date.now();
       await fileStore.save(params.id, file);
       await quotaManager.releaseQuota(auth.userId, file.size, file.category as FileCategory);
       try { await unlink(file.storagePath); } catch {}
       return json({ message: 'File deleted successfully' });
    }
  }

  params = matchPath('/api/files/:id/download', pathname);
  if (params && method === 'GET') {
    ctx.params = { ...ctx.params, ...params };
    return downloadFile(req, ctx);
  }

  return null;
}
