import { Hono } from "hono";
import path from "path";
import fs from "fs";
import { mkdir, unlink, readFile } from "fs/promises";
import { fileStore } from "../store/fileStore";
import { fileValidator } from "../services/file-validator";
import { quotaManager } from "../services/quota-manager";
import { config } from "../config";
import { getAuth } from "../middleware/auth";
import { Permission } from "../config";
import {
  FileStatus,
  FileCategory,
  getExtensionFromMime,
  type FileItem,
} from "../types/file";

const filesRouter = new Hono();

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
    // Security categories
    unknown: 'unknown',
    mismatch: 'mismatch',
    corrupted: 'corrupted',
    disguised: 'disguised',
    quarantine: 'quarantine',
  };
  return dirMap[category] || 'other';
}

// POST /api/files - Upload a file
filesRouter.post('/', async (c) => {
  const auth = getAuth(c);
  
  // Check permission
  if (!auth.permissions.includes(Permission.UPLOAD)) {
    return c.json({ error: 'Upload permission required' }, 403);
  }

  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: 'Invalid form data' }, 400);
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return c.json({ error: 'Missing file field' }, 400);
  }

  // Validate file
  const validation = await fileValidator.validate(file);
  
  // Check quota
  const quotaCheck = await quotaManager.checkQuota(auth.userId, file.size);
  if (!quotaCheck.allowed) {
    return c.json({ error: quotaCheck.reason }, 403);
  }

  // Determine status based on validation
  let status: string = FileStatus.VALID;
  if (validation.flags.length > 0) {
    if (validation.category === 'corrupted' || validation.category === 'disguised') {
      status = FileStatus.QUARANTINE;
    } else {
      status = FileStatus.SUSPICIOUS;
    }
  }

  // Generate ID and paths
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

  // Ensure directory exists
  await mkdir(baseDir, { recursive: true });

  // Write file
  await Bun.write(filePath, file);

  // Determine URL
  const url = `/uploads/${getDirectoryForCategory(fileCategory)}/${fileName}`;

  // Create file record
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
    storagePath: filePath,
    integrity: {
      sha256: validation.integrity.sha256,
    },
    metadata: {},
    tags: [],
    uploadedBy: auth.userId,
    uploadedAt: Date.now(),
    updatedAt: Date.now(),
    deletedAt: null,
  };

  // Parse metadata if provided
  const metadataRaw = formData.get('metadata');
  if (typeof metadataRaw === 'string') {
    try {
      fileRecord.metadata = JSON.parse(metadataRaw);
    } catch {
      // Ignore invalid JSON
    }
  }

  // Save to store
  await fileStore.save(id, fileRecord);

  // Reserve quota
  await quotaManager.reserveQuota(auth.userId, file.size, fileCategory as FileCategory);

  return c.json(fileRecord, 201);
});

// GET /api/files - List files
filesRouter.get('/', async (c) => {
  const auth = getAuth(c);
  
  if (!auth.permissions.includes(Permission.LIST)) {
    return c.json({ error: 'List permission required' }, 403);
  }

  const category = c.req.query('category');
  const status = c.req.query('status');
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '50');

  let files = Object.values(await fileStore.getAll());

  // Filter by category
  if (category) {
    files = files.filter(f => f.category === category);
  }

  // Filter by status
  if (status) {
    files = files.filter(f => f.status === status);
  }

  // Exclude deleted files by default
  files = files.filter(f => f.status !== FileStatus.DELETED);

  // Sort by upload date (newest first)
  files.sort((a, b) => b.uploadedAt - a.uploadedAt);

  // Paginate
  const total = files.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const pagedFiles = files.slice(start, start + pageSize);

  return c.json({
    files: pagedFiles,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
    filters: {
      category,
      status,
    },
  });
});

// GET /api/files/categories - List available categories
filesRouter.get('/categories', async (c) => {
  return c.json({
    categories: Object.values(FileCategory),
    securityCategories: ['unknown', 'mismatch', 'corrupted', 'disguised'],
  });
});

// GET /api/files/suspicious - List suspicious files
filesRouter.get('/suspicious', async (c) => {
  const auth = getAuth(c);
  
  if (!auth.permissions.includes(Permission.LIST)) {
    return c.json({ error: 'List permission required' }, 403);
  }

  const files = await fileStore.findByStatus(FileStatus.SUSPICIOUS);
  const quarantine = await fileStore.findByStatus(FileStatus.QUARANTINE);

  return c.json({
    suspicious: files,
    quarantine,
  });
});

// GET /api/files/:id - Get file metadata
filesRouter.get('/:id', async (c) => {
  const auth = getAuth(c);
  const id = c.req.param('id');

  if (!auth.permissions.includes(Permission.READ)) {
    return c.json({ error: 'Read permission required' }, 403);
  }

  const file = await fileStore.get(id);
  if (!file) {
    return c.json({ error: 'File not found' }, 404);
  }

  return c.json(file);
});

// GET /api/files/:id/download - Download file
filesRouter.get('/:id/download', async (c) => {
  const auth = getAuth(c);
  const id = c.req.param('id');

  if (!auth.permissions.includes(Permission.READ)) {
    return c.json({ error: 'Read permission required' }, 403);
  }

  const file = await fileStore.get(id);
  if (!file) {
    return c.json({ error: 'File not found' }, 404);
  }

  // Check if file is accessible
  if (file.status === FileStatus.DELETED) {
    return c.json({ error: 'File has been deleted' }, 404);
  }

  try {
    const data = await readFile(file.storagePath);
    return new Response(data, {
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.originalName}"`,
      },
    });
  } catch {
    return c.json({ error: 'File not accessible' }, 500);
  }
});

// DELETE /api/files/:id - Delete file
filesRouter.delete('/:id', async (c) => {
  const auth = getAuth(c);
  const id = c.req.param('id');

  if (!auth.permissions.includes(Permission.DELETE)) {
    return c.json({ error: 'Delete permission required' }, 403);
  }

  const file = await fileStore.get(id);
  if (!file) {
    return c.json({ error: 'File not found' }, 404);
  }

  // Soft delete
  file.status = FileStatus.DELETED;
  file.deletedAt = Date.now();
  await fileStore.save(id, file);

  // Release quota
  await quotaManager.releaseQuota(auth.userId, file.size, file.category as FileCategory);

  // Optionally delete the actual file
  try {
    await unlink(file.storagePath);
  } catch {
    // File might already be deleted
  }

  return c.json({ message: 'File deleted successfully' });
});

// PUT /api/files/:id/status - Update file status
filesRouter.put('/:id/status', async (c) => {
  const auth = getAuth(c);
  const id = c.req.param('id');

  if (!auth.permissions.includes(Permission.ADMIN)) {
    return c.json({ error: 'Admin permission required' }, 403);
  }

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const file = await fileStore.get(id);
  if (!file) {
    return c.json({ error: 'File not found' }, 404);
  }

  if (body.status) {
    file.status = body.status;
  }

  file.updatedAt = Date.now();
  await fileStore.save(id, file);

  return c.json(file);
});

export { filesRouter };
