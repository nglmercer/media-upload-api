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
  private watcherCloseFn: (() => void) | null = null;

  constructor(configPath: string = './config.json') {
    this.configPath = configPath;
    this.config = this.load();
    this.setupWatcher();
  }

  private load(): Config {
    // Create config file if it doesn't exist
    if (!fs.existsSync(this.configPath)) {
      this.createDefaultConfig();
    }

    try {
      const raw = fs.readFileSync(this.configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      
      // Merge with defaults to ensure all fields exist
      const merged = this.mergeWithDefaults(parsed);
      return FullConfigSchema.parse(merged);
    } catch (error) {
      console.warn('Error loading config, using defaults:', error);
      return { ...DEFAULT_CONFIG };
    }
  }

  private mergeWithDefaults(parsed: Partial<Config>): Config {
    const oauthConfig = {
      ...DEFAULT_OAUTH_CONFIG,
      ...parsed.oauth,
      tokenAuth: {
        ...DEFAULT_OAUTH_CONFIG.tokenAuth,
        ...parsed.oauth?.tokenAuth,
      },
    };

    return {
      server: { ...DEFAULT_SERVER_CONFIG, ...parsed.server },
      oauth: oauthConfig,
      quota: { ...DEFAULT_QUOTA_CONFIG, ...parsed.quota },
    };
  }

  private createDefaultConfig(): void {
    try {
      // Create data directory
      const dataDir = DEFAULT_SERVER_CONFIG.dataDir;
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Create default config
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(DEFAULT_CONFIG, null, 2)
      );
    } catch (error) {
      console.warn('Error creating config file:', error);
    }
  }

  private setupWatcher(): void {
    try {
      // Watch for config file changes
      const watcher = fs.watch(this.configPath, (eventType) => {
        if (eventType === 'change') {
          this.reload();
        }
      });
      this.watcherCloseFn = () => watcher.close();
    } catch (error) {
      console.warn('Error setting up config watcher:', error);
    }
  }

  // Public getters
  get(): Readonly<Config> {
    return this.config;
  }

  getServer(): Readonly<ServerConfig> {
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
    console.log('Reloading configuration...');
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

  // Hash token for storage
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Verify token (compares hashed input with stored hash)
  verifyToken(token: string): TokenConfig | null {
    if (!this.config.oauth.enabled || !this.config.oauth.tokenAuth.enabled) {
      return null;
    }

    const hashedInput = this.hashToken(token);
    const tokenEntry = this.config.oauth.tokenAuth.tokens.find(
      t => t.token === hashedInput
    );

    if (!tokenEntry) {
      return null;
    }

    // Check expiration
    if (tokenEntry.expiresAt && tokenEntry.expiresAt < Date.now()) {
      return null;
    }

    return tokenEntry;
  }

  // Add a new token
  addToken(token: string, tokenConfig: Omit<TokenConfig, 'token'>): void {
    const hashedToken = this.hashToken(token);
    const tokenEntry: TokenConfig = {
      ...tokenConfig,
      token: hashedToken,
    };
    
    this.config.oauth.tokenAuth.tokens.push(tokenEntry);
    this.update({ oauth: this.config.oauth });
  }

  // Remove a token by userId
  removeToken(userId: string): boolean {
    const initialLength = this.config.oauth.tokenAuth.tokens.length;
    this.config.oauth.tokenAuth.tokens = 
      this.config.oauth.tokenAuth.tokens.filter(t => t.userId !== userId);
    
    if (this.config.oauth.tokenAuth.tokens.length < initialLength) {
      this.update({ oauth: this.config.oauth });
      return true;
    }
    return false;
  }

  // Get token info by userId (without the actual token)
  getTokenInfo(userId: string): Omit<TokenConfig, 'token'> | null {
    const token = this.config.oauth.tokenAuth.tokens.find(t => t.userId === userId);
    if (!token) return null;
    
    const { token: _, ...info } = token;
    return info;
  }

  // Cleanup
  destroy(): void {
    if (this.watcherCloseFn) {
      this.watcherCloseFn();
    }
    this.watchers.clear();
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const config = new ConfigManager();

// Export standalone functions for compatibility
export const loadConfig = () => config.getServer();
export const createConfigFile = () => config.get();
export const saveConfig = (partial: Partial<ServerConfig>) => {
  config.update({ server: { ...config.getServer(), ...partial } });
};
