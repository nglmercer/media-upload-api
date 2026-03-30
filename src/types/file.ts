import { z } from "zod";

// ============================================================================
// File Categories
// ============================================================================

// Core categories
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

// Security categories (for problematic files)
export const SecurityCategory = {
  UNKNOWN: 'unknown',        // Unable to detect type
  MISMATCH: 'mismatch',      // Extension doesn't match content
  CORRUPTED: 'corrupted',    // File appears damaged
  DISGUISED: 'disguised',    // Extension spoofing detected
} as const;

export type FileCategory = typeof FileCategory[keyof typeof FileCategory];
export type SecurityCategory = typeof SecurityCategory[keyof typeof SecurityCategory];

// Combined type
export type FileType = FileCategory | SecurityCategory;

// ============================================================================
// File Status
// ============================================================================

export const FileStatus = {
  PENDING: 'pending',
  VALID: 'valid',
  SUSPICIOUS: 'suspicious',
  QUARANTINE: 'quarantine',
  DELETED: 'deleted',
} as const;

export type FileStatus = typeof FileStatus[keyof typeof FileStatus];

// ============================================================================
// Validation Flags
// ============================================================================

export enum ValidationFlag {
  UNKNOWN_TYPE = 'unknown-type',
  EXTENSION_MISMATCH = 'extension-mismatch',
  MAGIC_MISMATCH = 'magic-mismatch',
  CORRUPTED_CONTENT = 'corrupted-content',
  SUSPICIOUS_EXTENSION = 'suspicious-extension',
  DOUBLE_EXTENSION = 'double-extension',
  EMPTY_FILE = 'empty-file',
  OVERSIZED = 'oversized',
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const FileCategorySchema = z.enum([
  'image', 'audio', 'video', 'document', 'archive', 
  'application', 'font', 'model', 'data', 'other'
]);

export const SecurityCategorySchema = z.enum([
  'unknown', 'mismatch', 'corrupted', 'disguised'
]);

export const FileStatusSchema = z.enum([
  'pending', 'valid', 'suspicious', 'quarantine', 'deleted'
]);

export const ValidationFlagSchema = z.enum([
  'unknown-type', 'extension-mismatch', 'magic-mismatch',
  'corrupted-content', 'suspicious-extension', 'double-extension',
  'empty-file', 'oversized'
]);

// ============================================================================
// MIME Type Mapping
// ============================================================================

// Comprehensive MIME to category mapping
export const MIME_TO_CATEGORY: Record<string, FileCategory> = {
  // Images
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'image/svg+xml': 'image',
  'image/bmp': 'image',
  'image/tiff': 'image',
  'image/x-icon': 'image',
  'image/heic': 'image',
  'image/avif': 'image',
  'image/x-rgb': 'image',
  
  // Audio
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/webm': 'audio',
  'audio/flac': 'audio',
  'audio/aac': 'audio',
  'audio/mp4': 'audio',
  'audio/x-m4a': 'audio',
  'audio/x-wav': 'audio',
  'audio/wave': 'audio',
  
  // Video
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/ogg': 'video',
  'video/x-msvideo': 'video',
  'video/quicktime': 'video',
  'video/x-matroska': 'video',
  'video/hevc': 'video',
  'video/av1': 'video',
  'video/x-ms-wmv': 'video',
  
  // Documents
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  'application/vnd.ms-powerpoint': 'document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
  'application/vnd.oasis.opendocument.text': 'document',
  'application/vnd.oasis.opendocument.spreadsheet': 'document',
  'text/plain': 'document',
  'text/html': 'document',
  'text/css': 'document',
  'text/csv': 'document',
  'text/markdown': 'document',
  'text/xml': 'document',
  'application/rtf': 'document',
  
  // Archives
  'application/zip': 'archive',
  'application/x-zip-compressed': 'archive',
  'application/x-rar-compressed': 'archive',
  'application/vnd.rar': 'archive',
  'application/x-7z-compressed': 'archive',
  'application/x-tar': 'archive',
  'application/gzip': 'archive',
  'application/x-gzip': 'archive',
  'application/x-bzip': 'archive',
  'application/x-bzip2': 'archive',
  'application/x-compress': 'archive',
  
  // Fonts
  'font/woff': 'font',
  'font/woff2': 'font',
  'font/ttf': 'font',
  'font/otf': 'font',
  'font/eot': 'font',
  'font/sfnt': 'font',
  'font/collection': 'font',
  
  // 3D Models
  'model/gltf-binary': 'model',
  'model/gltf+json': 'model',
  'model/obj': 'model',
  'model/fbx': 'model',
  'model/stl': 'model',
  'model/3ds': 'model',
  'model/ply': 'model',
  
  // Data/Code
  'application/json': 'data',
  'application/xml': 'data',
  'application/yaml': 'data',
  'application/javascript': 'application',
  'application/typescript': 'application',
  'text/javascript': 'application',
  'application/wasm': 'application',
  'application/x-python': 'application',
  'application/x-java': 'application',
  
  // Applications/Executables
  'application/octet-stream': 'application',
  'application/x-executable': 'application',
  'application/x-msdownload': 'application',
  'application/x-sh': 'application',
  'application/x-shellscript': 'application',
};

// Get category from MIME type
export function getCategoryFromMime(mime: string): FileCategory {
  return MIME_TO_CATEGORY[mime] || 'other';
}

// Get extension from MIME type
export const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/webm': '.webm',
  'audio/flac': '.flac',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/ogg': '.ogv',
  'application/pdf': '.pdf',
  'application/json': '.json',
  'application/xml': '.xml',
  'application/zip': '.zip',
  'application/x-rar-compressed': '.rar',
  'application/x-7z-compressed': '.7z',
  'application/x-tar': '.tar',
  'application/gzip': '.gz',
  'font/woff': '.woff',
  'font/woff2': '.woff2',
  'font/ttf': '.ttf',
  'font/otf': '.otf',
};

export function getExtensionFromMime(mime: string): string {
  return MIME_TO_EXTENSION[mime] || '';
}

// ============================================================================
// File Item Schema
// ============================================================================

export const FileItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  originalName: z.string(),
  category: FileCategorySchema.or(SecurityCategorySchema),
  mimeType: z.string().nullable(),
  extension: z.string(),
  size: z.number().int().positive(),
  sizeFormatted: z.string(),
  status: FileStatusSchema,
  flags: z.array(ValidationFlagSchema),
  url: z.string(),
  isPublic: z.boolean().default(true),
  storagePath: z.string(),
  integrity: z.object({
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  metadata: z.record(z.string(), z.any()).optional(),
  tags: z.array(z.string()).optional(),
  uploadedBy: z.string().nullable(),
  uploadedAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

export type FileItem = z.infer<typeof FileItemSchema>;
