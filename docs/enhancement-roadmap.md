# Media Upload API - Enhancement Roadmap

## Executive Summary

This document outlines the comprehensive changes required to transform the current multimedia API into a robust, client-centric file management system with universal file support, optional OAuth authentication, and storage management. The API will be client-focused with all credentials and data remaining on the client side.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Proposed Architecture](#proposed-architecture)
3. [Phase 1: Configuration System](#phase-1-configuration-system)
4. [Phase 2: OAuth Authentication](#phase-2-oauth-authentication)
5. [Phase 3: Universal File Support](#phase-3-universal-file-support)
6. [Phase 4: File Integrity & Security](#phase-4-file-integrity--security)
7. [Phase 5: Storage Management](#phase-5-storage-management)
8. [Phase 6: Client SDK](#phase-6-client-sdk)
9. [API Reference](#api-reference)
10. [Data Models](#data-models)

---

## 1. Current State Analysis

### Current Capabilities

| Feature | Current Status |
|---------|----------------|
| **File Types** | image, audio, video, subtitle, text |
| **Storage** | JSON file-based (`json-obj-manager`) |
| **Validation** | Magic number detection via `file-type` |
| **Authentication** | None |
| **Storage Limits** | None |
| **Configuration** | Basic (port, uploads dir) |
| **Multi-user Support** | None |
| **Client SDK** | None |

### Current Architecture

```
┌─────────────────────────────────────────┐
│              Hono Server                │
├─────────────────────────────────────────┤
│  /api/media    → mediaRouter           │
│  /api/drafts   → draftsRouter          │
│  /ws           → WebSocket handler     │
│  /uploads/*    → Static file serving    │
└─────────────────────────────────────────┘
```

### Items to Remove

- **Drafts Router** (`/api/drafts`) - Removed completely
- **Legacy Media Router** - Replaced with universal file system
- **Backward Compatibility Layer** - Not needed, fresh start

---

## 2. Proposed Architecture

### Enhanced Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Hono Server                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Configuration Manager                       │ │
│  │  - config.json (port, dirs, OAuth settings)                  │ │
│  │  - Runtime config reload                                       │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│  ┌──────────────────────────▼───────────────────────────────────┐ │
│  │                    OAuth Middleware                             │ │
│  │  - Token validation (optional)                                 │ │
│  │  - User identification                                          │ │
│  │  - Permission scopes                                            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│  ┌──────────────────────────▼───────────────────────────────────┐ │
│  │                      Core Services                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────────────┐  │ │
│  │  │ FileValidator│  │QuotaManager│  │ FileCategorization   │  │ │
│  │  └─────────────┘  └─────────────┘  └────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│  ┌──────────────────────────▼───────────────────────────────────┐ │
│  │                      API Routes                                 │ │
│  │  GET/POST /api/files        - File operations                  │ │
│  │  GET /api/quota            - Storage quota                     │ │
│  │  GET /api/config           - Configuration (public)           │ │
│  │  GET /uploads/*           - File serving                       │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Client SDK (TypeScript)                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  FileClient  │  ConfigClient  │  OAuthClient  │  QuotaClient │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Phase 1: Configuration System

### Overview

The configuration system will be the foundation of the application, supporting runtime reload and providing clear separation between server settings and OAuth configuration.

### Configuration File Structure

```typescript
// config schema
interface ServerConfig {
  // Server settings
  port: number;
  host: string;
  
  // Storage paths
  uploadsDir: string;
  dataDir: string;
  
  // File settings
  maxFileSizeBytes: number;
  allowedMimeTypes: string[];  // Empty = allow all
  
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

interface OAuthConfig {
  enabled: boolean;
  
  // Token-based auth settings
  tokenAuth: {
    enabled: boolean;
    tokens: TokenConfig[];
  };
  
  // OAuth provider settings (future)
  providers: OAuthProviderConfig[];
}

interface TokenConfig {
  token: string;           // The actual token (hashed in storage)
  userId: string;
  label: string;
  permissions: Permission[];
  createdAt: number;
  expiresAt?: number;
  quota?: {
    maxStorageBytes?: number;
    maxFiles?: number;
  };
}

interface QuotaConfig {
  global: {
    maxTotalStorageBytes: number;
    maxTotalFiles: number;
  };
  defaults: {
    maxStorageBytes: number;
    maxFiles: number;
  };
  userOverrides: Record<string, {
    maxStorageBytes?: number;
    maxFiles?: number;
  }>;
}

type Config = ServerConfig & OAuthConfig & QuotaConfig;
```

### Config File Example

```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0",
    "uploadsDir": "uploads",
    "dataDir": "data",
    "maxFileSizeBytes": 104857600,
    "allowedMimeTypes": [],
    "logLevel": "info"
  },
  "oauth": {
    "enabled": true,
    "tokenAuth": {
      "enabled": true,
      "tokens": [
        {
          "token": "your-secure-token-here",
          "userId": "client-app",
          "label": "Default Client",
          "permissions": ["upload", "read", "delete", "list"],
          "createdAt": 1700000000000,
          "quota": {
            "maxStorageBytes": 1073741824,
            "maxFiles": 1000
          }
        }
      ]
    },
    "providers": []
  },
  "quota": {
    "global": {
      "maxTotalStorageBytes": 10737418240,
      "maxTotalFiles": 10000
    },
    "defaults": {
      "maxStorageBytes": 524288000,
      "maxFiles": 500
    },
    "userOverrides": {}
  }
}
```

### Config Manager Implementation

```typescript
// src/config.ts
import { z } from 'zod';

// Validation schemas
const TokenConfigSchema = z.object({
  token: z.string(),
  userId: z.string(),
  label: z.string(),
  permissions: z.array(z.enum(['upload', 'read', 'delete', 'list', 'admin'])),
  createdAt: z.number(),
  expiresAt: z.number().optional(),
  quota: z.object({
    maxStorageBytes: z.number().optional(),
    maxFiles: z.number().optional(),
  }).optional(),
});

const OAuthConfigSchema = z.object({
  enabled: z.boolean(),
  tokenAuth: z.object({
    enabled: z.boolean(),
    tokens: z.array(TokenConfigSchema),
  }),
  providers: z.array(z.any()),
});

const QuotaConfigSchema = z.object({
  global: z.object({
    maxTotalStorageBytes: z.number(),
    maxTotalFiles: z.number(),
  }),
  defaults: z.object({
    maxStorageBytes: z.number(),
    maxFiles: z.number(),
  }),
  userOverrides: z.record(z.string(), z.object({
    maxStorageBytes: z.number().optional(),
    maxFiles: z.number().optional(),
  })),
});

const ServerConfigSchema = z.object({
  port: z.number(),
  host: z.string(),
  uploadsDir: z.string(),
  dataDir: z.string(),
  maxFileSizeBytes: z.number(),
  allowedMimeTypes: z.array(z.string()),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']),
});

const FullConfigSchema = z.object({
  server: ServerConfigSchema,
  oauth: OAuthConfigSchema,
  quota: QuotaConfigSchema,
});

type Config = z.infer<typeof FullConfigSchema>;

class ConfigManager {
  private config: Config;
  private configPath: string;
  private watchers: Set<() => void> = [];
  
  constructor(configPath: string = './config.json') {
    this.configPath = configPath;
    this.config = this.load();
  }
  
  private load(): Config {
    // Read and validate config file
    const raw = fs.readFileSync(this.configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return FullConfigSchema.parse(parsed);
  }
  
  get(): Readonly<Config> {
    return this.config;
  }
  
  getServer(): Readonly<ServerConfigSchema> {
    return this.config.server;
  }
  
  getOAuth(): Readonly<OAuthConfig> {
    return this.config.oauth;
  }
  
  getQuota(): Readonly<QuotaConfig> {
    return this.config.quota;
  }
  
  // Runtime reload
  reload(): void {
    this.config = this.load();
    this.watchers.forEach(cb => cb());
  }
  
  // Watch for changes
  watch(callback: () => void): () => void {
    this.watchers.add(callback);
    return () => this.watchers.delete(callback);
  }
  
  // Update config (runtime)
  update(partial: Partial<Config>): void {
    this.config = { ...this.config, ...partial };
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    this.watchers.forEach(cb => cb());
  }
  
  // Add token
  addToken(token: TokenConfig): void {
    const hashedToken = this.hashToken(token.token);
    const tokenEntry = { ...token, token: hashedToken };
    this.config.oauth.tokenAuth.tokens.push(tokenEntry);
    this.update({ oauth: this.config.oauth });
  }
  
  // Remove token
  removeToken(userId: string): void {
    this.config.oauth.tokenAuth.tokens = 
      this.config.oauth.tokenAuth.tokens.filter(t => t.userId !== userId);
    this.update({ oauth: this.config.oauth });
  }
  
  private hashToken(token: string): string {
    // Simple hash for storage (in production, use bcrypt or similar)
    return crypto.createHash('sha256').update(token).digest('hex');
  }
  
  verifyToken(token: string): TokenConfig | null {
    if (!this.config.oauth.tokenAuth.enabled) return null;
    
    const hashedInput = this.hashToken(token);
    const tokenEntry = this.config.oauth.tokenAuth.tokens.find(
      t => t.token === hashedInput
    );
    
    if (!tokenEntry) return null;
    
    // Check expiration
    if (tokenEntry.expiresAt && tokenEntry.expiresAt < Date.now()) {
      return null;
    }
    
    return tokenEntry;
  }
}

export const config = new ConfigManager();
```

### Config API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/config` | Get public configuration (non-sensitive) |
| `GET` | `/api/config/server` | Get server config |
| `PUT` | `/api/config` | Update configuration (admin token required) |
| `POST` | `/api/config/token` | Add a new token (admin) |
| `DELETE` | `/api/config/token/:userId` | Remove token (admin) |

---

## 4. Phase 2: OAuth Authentication

### Overview

Implement optional token-based authentication that can be enabled/disabled via configuration. All auth data stays on the client - the server only validates tokens.

### Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Server    │────▶│   Config    │
│             │     │  Middleware │     │   Store     │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │  1. Request       │                   │
       │  (with token)    │                   │
       │─────────────────▶│                   │
       │                  │  2. Validate      │
       │                  │───────────────────▶
       │                  │                   │
       │                  │  3. Token Info    │
       │                  │◀───────────────────
       │                  │                   │
       │  4. Allow/Deny   │                   │
       │◀─────────────────│                   │
```

### Permissions

```typescript
enum Permission {
  UPLOAD = 'upload',     // Can upload files
  READ = 'read',         // Can read file metadata
  DELETE = 'delete',     // Can delete files
  LIST = 'list',         // Can list files
  ADMIN = 'admin',       // Can manage config and tokens
}
```

### Auth Middleware

```typescript
// src/middleware/auth.ts
import type { Context, Next } from 'hono';
import { config } from '../config';

interface AuthContext {
  authenticated: boolean;
  userId: string | null;
  permissions: Permission[];
  tokenLabel: string | null;
}

export const authMiddleware = async (c: Context, next: Next) => {
  const oauthConfig = config.getOAuth();
  
  // If OAuth disabled, allow all (but mark as unauthenticated)
  if (!oauthConfig.enabled) {
    c.set('auth', {
      authenticated: false,
      userId: null,
      permissions: Object.values(Permission),  // All permissions when disabled
      tokenLabel: null,
    });
    return next();
  }
  
  // If token auth disabled, allow all
  if (!oauthConfig.tokenAuth.enabled) {
    c.set('auth', {
      authenticated: false,
      userId: null,
      permissions: Object.values(Permission),
      tokenLabel: null,
    });
    return next();
  }
  
  // Extract token from header or query
  const token = c.req.header('X-Auth-Token') 
    || c.req.query('token')
    || c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return c.json({ error: 'Authentication required' }, 401);
  }
  
  // Validate token
  const tokenInfo = config.verifyToken(token);
  if (!tokenInfo) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
  
  // Set auth context
  c.set('auth', {
    authenticated: true,
    userId: tokenInfo.userId,
    permissions: tokenInfo.permissions,
    tokenLabel: tokenInfo.label,
  });
  
  await next();
};

// Permission check helper
export const requirePermission = (...required: Permission[]) => {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth') as AuthContext;
    
    const hasPermission = required.every(p => 
      auth.permissions.includes(p)
    );
    
    if (!hasPermission) {
      return c.json({ 
        error: 'Insufficient permissions',
        required,
        has: auth.permissions,
      }, 403);
    }
    
    await next();
  };
};
```

### OAuth API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/auth/validate` | Validate current token |
| `GET` | `/api/auth/info` | Get authenticated user info |
| `GET` | `/api/auth/permissions` | Get current permissions |

---

## 5. Phase 3: Universal File Support

### Overview

Replace the limited media type system with a universal file category system that supports any file type.

### File Categories

```typescript
// src/types/file.ts

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
  MISMATCH: 'mismatch',     // Extension doesn't match content
  CORRUPTED: 'corrupted',   // File appears damaged
  DISGUISED: 'disguised',   // Extension spoofing detected
} as const;

export type FileCategory = typeof FileCategory[keyof typeof FileCategory];
export type SecurityCategory = typeof SecurityCategory[keyof typeof SecurityCategory];

// Combined type
export type FileType = FileCategory | SecurityCategory;

// File status
export const FileStatus = {
  PENDING: 'pending',
  VALID: 'valid',
  SUSPICIOUS: 'suspicious',
  QUARANTINE: 'quarantine',
  DELETED: 'deleted',
} as const;

export type FileStatus = typeof FileStatus[keyof typeof FileStatus];
```

### MIME Type Mapping

```typescript
// Comprehensive MIME to category mapping
const MIME_TO_CATEGORY: Record<string, FileCategory> = {
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
  
  // Audio
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/webm': 'audio',
  'audio/flac': 'audio',
  'audio/aac': 'audio',
  'audio/mp4': 'audio',
  'audio/x-m4a': 'audio',
  
  // Video
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/ogg': 'video',
  'video/x-msvideo': 'video',
  'video/quicktime': 'video',
  'video/x-matroska': 'video',
  'video/hevc': 'video',
  'video/av1': 'video',
  
  // Documents
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  'application/vnd.ms-powerpoint': 'document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
  'text/plain': 'document',
  'text/html': 'document',
  'text/css': 'document',
  'text/csv': 'document',
  'text/markdown': 'document',
  
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
  
  // Fonts
  'font/woff': 'font',
  'font/woff2': 'font',
  'font/ttf': 'font',
  'font/otf': 'font',
  'font/eot': 'font',
  'font/sfnt': 'font',
  
  // 3D Models
  'model/gltf-binary': 'model',
  'model/gltf+json': 'model',
  'model/obj': 'model',
  'model/fbx': 'model',
  'model/stl': 'model',
  
  // Data/Code
  'application/json': 'data',
  'application/xml': 'data',
  'text/xml': 'data',
  'application/yaml': 'data',
  'application/javascript': 'application',
  'application/typescript': 'application',
  'text/javascript': 'application',
  'application/wasm': 'application',
  
  // Applications/Executables
  'application/octet-stream': 'application',
  'application/x-executable': 'application',
  'application/x-msdownload': 'application',
};

export function getCategoryFromMime(mime: string): FileCategory {
  return MIME_TO_CATEGORY[mime] || 'other';
}

export function getExtensionFromMime(mime: string): string {
  const extMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'application/pdf': '.pdf',
    'application/json': '.json',
    'application/zip': '.zip',
    // Add more as needed
  };
  return extMap[mime] || '';
}
```

---

## 6. Phase 4: File Integrity & Security

### Validation Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    Validation Pipeline                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │  Layer 1    │    │  Layer 2    │    │  Layer 3    │        │
│  │  Magic      │ ──▶│  Extension  │ ──▶│  Content    │        │
│  │  Number     │    │  Validation │    │  Analysis   │        │
│  │  Detection  │    │             │    │             │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│         │                  │                  │                │
│         ▼                  ▼                  ▼                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │  Layer 4    │    │  Layer 5    │    │  Layer 6    │        │
│  │  Integrity  │    │  Size       │    │  Category   │        │
│  │  Hash       │    │  Limits     │    │  Assignment │        │
│  │  (SHA-256)  │    │             │    │             │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Validation Flags

```typescript
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
```

### File Validator Implementation

```typescript
// src/services/file-validator.ts
import { fileTypeFromBuffer } from 'file-type';
import crypto from 'crypto';

interface ValidationResult {
  isValid: boolean;
  detectedMime: string | null;
  detectedExtension: string | null;
  category: FileCategory | SecurityCategory;
  flags: ValidationFlag[];
  integrity: {
    sha256: string;
    size: number;
  };
}

export class FileValidator {
  private maxFileSize: number;
  
  constructor(maxFileSize: number) {
    this.maxFileSize = maxFileSize;
  }
  
  async validate(file: File): Promise<ValidationResult> {
    const flags: ValidationFlag[] = [];
    const buffer = await file.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);
    
    // Layer 1: Magic number detection
    const detected = await this.detectType(nodeBuffer);
    
    // Layer 2: Extension validation
    const clientExt = this.getExtension(file.name);
    const clientMime = file.type;
    
    if (detected.mime && clientMime && detected.mime !== clientMime) {
      flags.push(ValidationFlag.EXTENSION_MISMATCH);
    }
    
    // Check for double extensions
    if (this.hasDoubleExtension(file.name)) {
      flags.push(ValidationFlag.DOUBLE_EXTENSION);
    }
    
    // Layer 3: Content analysis (corruption check)
    if (detected.mime && !this.isValidContent(nodeBuffer, detected.mime)) {
      flags.push(ValidationFlag.CORRUPTED_CONTENT);
    }
    
    // Layer 4: Integrity hash
    const sha256 = this.calculateHash(nodeBuffer);
    
    // Layer 5: Size limits
    if (nodeBuffer.length > this.maxFileSize) {
      flags.push(ValidationFlag.OVERSIZED);
    }
    if (nodeBuffer.length === 0) {
      flags.push(ValidationFlag.EMPTY_FILE);
    }
    
    // Layer 6: Category assignment
    const category = this.determineCategory(detected.mime, flags);
    
    return {
      isValid: flags.length === 0,
      detectedMime: detected.mime,
      detectedExtension: detected.ext,
      category,
      flags,
      integrity: {
        sha256,
        size: nodeBuffer.length,
      },
    };
  }
  
  private async detectType(buffer: Buffer): Promise<{
    mime: string | null;
    ext: string | null;
  }> {
    try {
      const result = await fileTypeFromBuffer(buffer);
      if (result) {
        return { mime: result.mime, ext: '.' + result.ext };
      }
    } catch {
      // Detection failed
    }
    return { mime: null, ext: null };
  }
  
  private getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : '';
  }
  
  private hasDoubleExtension(filename: string): boolean {
    const parts = filename.toLowerCase().split('.');
    if (parts.length < 3) return false;
    
    // Common suspicious double extensions
    const dangerous = ['exe', 'bat', 'cmd', 'sh', 'ps1', 'vbs', 'js', 'jar'];
    const lastExt = parts[parts.length - 1];
    const secondLastExt = parts[parts.length - 2];
    
    return dangerous.includes(lastExt) && dangerous.includes(secondLastExt);
  }
  
  private isValidContent(buffer: Buffer, mime: string): boolean {
    // Basic content validation based on MIME type
    // This is a simplified check - can be expanded
    if (mime.startsWith('image/')) {
      // Check for common image magic bytes
      const signatures: Record<string, number[]> = {
        'image/jpeg': [0xFF, 0xD8, 0xFF],
        'image/png': [0x89, 0x50, 0x4E, 0x47],
        'image/gif': [0x47, 0x49, 0x46],
        'image/webp': [0x52, 0x49, 0x46, 0x46],
      };
      
      const sig = signatures[mime];
      if (sig) {
        return sig.every((b, i) => buffer[i] === b);
      }
    }
    return true;
  }
  
  private calculateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
  
  private determineCategory(
    mime: string | null, 
    flags: ValidationFlag[]
  ): FileCategory | SecurityCategory {
    // Check for security issues first
    if (flags.includes(ValidationFlag.CORRUPTED_CONTENT)) {
      return 'corrupted';
    }
    if (flags.includes(ValidationFlag.EXTENSION_MISMATCH) || 
        flags.includes(ValidationFlag.DOUBLE_EXTENSION)) {
      return 'disguised';
    }
    if (flags.includes(ValidationFlag.UNKNOWN_TYPE)) {
      return 'unknown';
    }
    
    // Normal category from MIME
    if (mime) {
      return getCategoryFromMime(mime);
    }
    
    return 'other';
  }
}
```

---

## 7. Phase 5: Storage Management

### Quota System

```typescript
// src/services/quota-manager.ts

interface UsageStats {
  usedFiles: number;
  usedStorage: number;
  byCategory: Record<FileCategory, { count: number; storage: number }>;
}

interface QuotaInfo {
  maxFiles: number;
  maxStorage: number;
  usedFiles: number;
  usedStorage: number;
  remainingFiles: number;
  remainingStorage: number;
  usagePercentage: number;
}

export class QuotaManager {
  private config: ConfigManager;
  private usageCache: Map<string, UsageStats> = new Map();
  
  constructor(config: ConfigManager) {
    this.config = config;
  }
  
  async getUserQuota(userId: string | null): Promise<QuotaInfo> {
    const quotaConfig = this.config.getQuota();
    const usage = await this.getUsage(userId);
    
    // Get limits (user override or default)
    let maxFiles: number;
    let maxStorage: number;
    
    if (userId && quotaConfig.userOverrides[userId]) {
      maxFiles = quotaConfig.userOverrides[userId].maxFiles 
        || quotaConfig.defaults.maxFiles;
      maxStorage = quotaConfig.userOverrides[userId].maxStorageBytes 
        || quotaConfig.defaults.maxStorageBytes;
    } else {
      maxFiles = quotaConfig.defaults.maxFiles;
      maxStorage = quotaConfig.defaults.maxStorageBytes;
    }
    
    return {
      maxFiles,
      maxStorage,
      usedFiles: usage.usedFiles,
      usedStorage: usage.usedStorage,
      remainingFiles: maxFiles - usage.usedFiles,
      remainingStorage: maxStorage - usage.usedStorage,
      usagePercentage: (usage.usedFiles / maxFiles) * 100,
    };
  }
  
  async checkQuota(userId: string | null, fileSize: number): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const quota = await this.getUserQuota(userId);
    
    if (fileSize > quota.remainingStorage) {
      return { 
        allowed: false, 
        reason: `Would exceed storage limit (${quota.remainingStorage} bytes remaining)` 
      };
    }
    
    if (quota.remainingFiles <= 0) {
      return { 
        allowed: false, 
        reason: `Would exceed file count limit (${quota.remainingFiles} slots remaining)` 
      };
    }
    
    return { allowed: true };
  }
  
  async reserveQuota(userId: string | null, fileSize: number): Promise<boolean> {
    const check = await this.checkQuota(userId, fileSize);
    if (!check.allowed) return false;
    
    // Update usage (simplified - in production use atomic operations)
    const usage = await this.getUsage(userId);
    usage.usedFiles++;
    usage.usedStorage += fileSize;
    
    await this.saveUsage(userId, usage);
    return true;
  }
  
  async releaseQuota(userId: string | null, fileSize: number): Promise<void> {
    const usage = await this.getUsage(userId);
    usage.usedFiles = Math.max(0, usage.usedFiles - 1);
    usage.usedStorage = Math.max(0, usage.usedStorage - fileSize);
    
    await this.saveUsage(userId, usage);
  }
  
  private async getUsage(userId: string | null): Promise<UsageStats> {
    const key = userId || '_global';
    
    if (this.usageCache.has(key)) {
      return this.usageCache.get(key)!;
    }
    
    // Load from storage
    const usagePath = path.join(this.config.get().server.dataDir, `usage-${key}.json`);
    try {
      const data = JSON.parse(await fs.promises.readFile(usagePath, 'utf-8'));
      this.usageCache.set(key, data);
      return data;
    } catch {
      return {
        usedFiles: 0,
        usedStorage: 0,
        byCategory: {
          image: { count: 0, storage: 0 },
          audio: { count: 0, storage: 0 },
          video: { count: 0, storage: 0 },
          document: { count: 0, storage: 0 },
          archive: { count: 0, storage: 0 },
          application: { count: 0, storage: 0 },
          font: { count: 0, storage: 0 },
          model: { count: 0, storage: 0 },
          data: { count: 0, storage: 0 },
          other: { count: 0, storage: 0 },
        },
      };
    }
  }
  
  private async saveUsage(userId: string | null, usage: UsageStats): Promise<void> {
    const key = userId || '_global';
    const usagePath = path.join(this.config.get().server.dataDir, `usage-${key}.json`);
    await fs.promises.writeFile(usagePath, JSON.stringify(usage, null, 2));
    this.usageCache.set(key, usage);
  }
}
```

---

## 8. Phase 6: Client SDK

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Client SDK Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                     MediaUploadClient                      │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  // Type-safe method calls                                 │ │
│  │  const file = await client.files.upload(file);            │ │
│  │  const list = await client.files.list({ category: 'image' });│
│  │  const quota = await client.quota.get();                   │ │
│  │  const config = await client.config.get();                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                      RPC Bridge                            │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  - Request/Response serialization                          │ │
│  │  - Error handling                                         │ │
│  │  - Authentication token management                        │ │
│  │  - Retry logic                                            │ │
│  │  - Progress tracking for uploads                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    HTTP Transport                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### SDK Structure

```typescript
// src/client/index.ts

export interface ClientConfig {
  baseUrl: string;
  token?: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface UploadOptions {
  metadata?: Record<string, unknown>;
  category?: FileCategory;
}

export interface ProgressEvent {
  loaded: number;
  total: number;
  percentage: number;
}

export type ProgressCallback = (event: ProgressEvent) => void;

export class MediaUploadClient {
  private config: ClientConfig;
  private authToken: string | null = null;
  
  // Sub-clients
  files: FileClient;
  quota: QuotaClient;
  config: ConfigClient;
  auth: AuthClient;
  
  constructor(config: ClientConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      ...config,
    };
    
    this.authToken = config.token || null;
    
    // Initialize sub-clients
    this.files = new FileClient(this);
    this.quota = new QuotaClient(this);
    this.config = new ConfigClient(this);
    this.auth = new AuthClient(this);
  }
  
  // Internal: Make HTTP request
  async request<T>(
    method: string,
    path: string,
    options?: RequestOptions
  ): Promise<T> {
    const headers: HeadersInit = {
      ...options?.headers,
    };
    
    if (this.authToken) {
      headers['X-Auth-Token'] = this.authToken;
    }
    
    // Implementation...
  }
  
  // Set/update token
  setToken(token: string | null): void {
    this.authToken = token;
  }
  
  // Close connections
  close(): void {
    // Cleanup
  }
}

// src/client/files.ts
export class FileClient {
  private client: MediaUploadClient;
  
  constructor(client: MediaUploadClient) {
    this.client = client;
  }
  
  async upload(
    file: File | Blob | ArrayBuffer,
    options?: UploadOptions
  ): Promise<FileItem> {
    // Create FormData and upload
    const formData = new FormData();
    formData.append('file', file instanceof ArrayBuffer 
      ? new Blob([file]) 
      : file);
    
    if (options?.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata));
    }
    
    if (options?.category) {
      formData.append('category', options.category);
    }
    
    return this.client.request('POST', '/api/files', {
      body: formData,
    });
  }
  
  async uploadWithProgress(
    file: File,
    onProgress: ProgressCallback
  ): Promise<FileItem> {
    // Implement with XMLHttpRequest for progress
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
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
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });
      
      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      
      // Setup and send...
    });
  }
  
  async uploadMultiple(
    files: File[],
    options?: UploadOptions
  ): Promise<FileItem[]> {
    // Upload multiple files
    const results: FileItem[] = [];
    for (const file of files) {
      const result = await this.upload(file, options);
      results.push(result);
    }
    return results;
  }
  
  async list(filters?: ListFilters): Promise<PaginatedResult<FileItem>> {
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
    
    return this.client.request('GET', `/api/files?${params}`);
  }
  
  async get(id: string): Promise<FileItem> {
    return this.client.request('GET', `/api/files/${id}`);
  }
  
  async delete(id: string): Promise<void> {
    await this.client.request('DELETE', `/api/files/${id}`);
  }
  
  async download(id: string): Promise<Blob> {
    const response = await this.client.request<Response>(
      'GET', 
      `/api/files/${id}/download`
    );
    return response.blob();
  }
  
  getUrl(file: FileItem): string {
    // Use the URL directly from the server response
    return `${this.client.config.baseUrl}${file.url}`;
  }
}

// src/client/quota.ts
export class QuotaClient {
  private client: MediaUploadClient;
  
  constructor(client: MediaUploadClient) {
    this.client = client;
  }
  
  async get(): Promise<QuotaInfo> {
    return this.client.request('GET', '/api/quota');
  }
  
  async getGlobal(): Promise<GlobalQuotaInfo> {
    return this.client.request('GET', '/api/quota/global');
  }
}

// src/client/config.ts
export class ConfigClient {
  private client: MediaUploadClient;
  
  constructor(client: MediaUploadClient) {
    this.client = client;
  }
  
  async get(): Promise<PublicConfig> {
    return this.client.request('GET', '/api/config');
  }
}

// src/client/auth.ts
export class AuthClient {
  private client: MediaUploadClient;
  
  constructor(client: MediaUploadClient) {
    this.client = client;
  }
  
  async validate(): Promise<boolean> {
    try {
      await this.client.request('GET', '/api/auth/validate');
      return true;
    } catch {
      return false;
    }
  }
  
  async getInfo(): Promise<TokenInfo | null> {
    try {
      return await this.client.request('GET', '/api/auth/info');
    } catch {
      return null;
    }
  }
}
```

### Usage Examples

```typescript
// Initialize client
const client = new MediaUploadClient({
  baseUrl: 'http://localhost:3000',
  token: 'my-auth-token',  // Optional
});

// Upload a file
const file = await client.files.upload(
  document.getElementById('fileInput').files[0],
  {
    metadata: { description: 'My file' },
  }
);

// Upload with progress
await client.files.uploadWithProgress(
  file, 
  (progress) => console.log(`${progress.percentage}%`)
);

// List files
const images = await client.files.list({
  category: 'image',
  page: 1,
  pageSize: 20,
});

// Check quota
const quota = await client.quota.get();
console.log(`Used: ${quota.usedStorage} / ${quota.maxStorage}`);

// Validate auth
const isValid = await client.auth.validate();
```

---

## 9. API Reference

### Files API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/files` | Upload a file |
| `GET` | `/api/files` | List files with filters |
| `GET` | `/api/files/:id` | Get file metadata |
| `GET` | `/api/files/:id/download` | Download file |
| `DELETE` | `/api/files/:id` | Delete file |
| `GET` | `/api/files/categories` | List available categories |

### Quota API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/quota` | Get current user's quota |
| `GET` | `/api/quota/global` | Get global quota stats |

### Config API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/config` | Get public config |
| `PUT` | `/api/config` | Update config (admin) |

### Auth API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/auth/validate` | Validate token |
| `GET` | `/api/auth/info` | Get user info |
| `GET` | `/api/auth/permissions` | Get permissions |

---

## 10. Data Models

### FileItem

```typescript
interface FileItem {
  id: string;
  name: string;
  originalName: string;
  category: FileCategory;
  mimeType: string | null;
  extension: string;
  size: number;
  sizeFormatted: string;
  status: FileStatus;
  flags: ValidationFlag[];
  url: string;
  integrity: {
    sha256: string;
  };
  metadata: Record<string, unknown>;
  uploadedBy: string | null;
  uploadedAt: number;
  updatedAt: number;
  deletedAt: number | null;
}
```

### QuotaInfo

```typescript
interface QuotaInfo {
  maxFiles: number;
  maxStorage: number;
  usedFiles: number;
  usedStorage: number;
  remainingFiles: number;
  remainingStorage: number;
  usagePercentage: number;
}
```

### PublicConfig

```typescript
interface PublicConfig {
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
  };
}
```

---

## Implementation Summary

This roadmap provides a complete plan to build a robust, client-centric file management API:

| Phase | Focus | Key Features |
|-------|-------|--------------|
| 1 | Configuration | JSON config, runtime reload, validation |
| 2 | OAuth | Token-based auth, permissions, middleware |
| 3 | File Support | Universal categories, MIME mapping |
| 4 | Security | Validation pipeline, integrity hashes |
| 5 | Storage | Quota management, per-user tracking |
| 6 | Client SDK | TypeScript RPC client with progress |

The API is designed with the client in mind - all credentials stay on the client, and the server provides a clean, authenticated interface for file operations.
