import fs from "fs";
import path from "path";
import crypto from "crypto";
import { z } from "zod";

// ============================================================================
// Permission Types
// ============================================================================

export const Permission = {
  UPLOAD: 'upload',
  READ: 'read',
  DELETE: 'delete',
  LIST: 'list',
  ADMIN: 'admin',
} as const;

export type Permission = typeof Permission[keyof typeof Permission];

// ============================================================================
// Configuration Schemas
// ============================================================================

export const PermissionSchema = z.enum(['upload', 'read', 'delete', 'list', 'admin']);

export const TokenConfigSchema = z.object({
  token: z.string(),
  userId: z.string(),
  label: z.string(),
  permissions: z.array(PermissionSchema),
  createdAt: z.number(),
  expiresAt: z.number().optional(),
  quota: z.object({
    maxStorageBytes: z.number().optional(),
    maxFiles: z.number().optional(),
  }).optional(),
});

export type TokenConfig = z.infer<typeof TokenConfigSchema>;

export const OAuthTokenAuthSchema = z.object({
  enabled: z.boolean(),
  tokens: z.array(TokenConfigSchema),
});

export const OAuthProvidersSchema = z.array(z.object({
  provider: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
  redirectUri: z.string().optional(),
}));

export const OAuthConfigSchema = z.object({
  enabled: z.boolean(),
  tokenAuth: OAuthTokenAuthSchema,
  providers: OAuthProvidersSchema,
});

export type OAuthConfig = z.infer<typeof OAuthConfigSchema>;

export const QuotaConfigSchema = z.object({
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

export type QuotaConfig = z.infer<typeof QuotaConfigSchema>;

export const ServerConfigSchema = z.object({
  port: z.number(),
  host: z.string(),
  uploadsDir: z.string(),
  dataDir: z.string(),
  maxFileSizeBytes: z.number(),
  allowedMimeTypes: z.array(z.string()),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

export const FullConfigSchema = z.object({
  server: ServerConfigSchema,
  oauth: OAuthConfigSchema,
  quota: QuotaConfigSchema,
});

export type Config = z.infer<typeof FullConfigSchema>;

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_SERVER_CONFIG: ServerConfig = {
  port: 3000,
  host: "0.0.0.0",
  uploadsDir: "uploads",
  dataDir: "data",
  maxFileSizeBytes: 104857600, // 100MB
  allowedMimeTypes: [],
  logLevel: "info",
};

const DEFAULT_QUOTA_CONFIG: QuotaConfig = {
  global: {
    maxTotalStorageBytes: 10737418240, // 10GB
    maxTotalFiles: 10000,
  },
  defaults: {
    maxStorageBytes: 524288000, // 500MB
    maxFiles: 500,
  },
  userOverrides: {},
};

const DEFAULT_OAUTH_CONFIG: OAuthConfig = {
  enabled: false,
  tokenAuth: {
    enabled: false,
    tokens: [],
  },
  providers: [],
};

const DEFAULT_CONFIG: Config = {
  server: DEFAULT_SERVER_CONFIG,
  oauth: DEFAULT_OAUTH_CONFIG,
  quota: DEFAULT_QUOTA_CONFIG,
};

// ============================================================================
// Config Manager Class
// ============================================================================

class ConfigManager {
  private config: Config;
  private configPath: string;
  private watchers: Set<() => void> = new Set();
