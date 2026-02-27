import fs from 'fs';
import path from 'path';
import { config } from '../config';
import type { FileCategory } from '../types/file';

// ============================================================================
// Types
// ============================================================================

export interface UsageStats {
  usedFiles: number;
  usedStorage: number;
  byCategory: Record<FileCategory, { count: number; storage: number }>;
}

export interface QuotaInfo {
  maxFiles: number;
  maxStorage: number;
  usedFiles: number;
  usedStorage: number;
  remainingFiles: number;
  remainingStorage: number;
  usagePercentage: number;
}

export interface GlobalQuotaInfo {
  maxFiles: number;
  maxStorage: number;
  usedFiles: number;
  usedStorage: number;
  byCategory: Record<FileCategory, { count: number; storage: number }>;
}

// ============================================================================
// Default Usage Stats
// ============================================================================

const DEFAULT_USAGE_STATS: UsageStats = {
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

// ============================================================================
// Quota Manager
// ============================================================================

export class QuotaManager {
  private usageCache: Map<string, UsageStats> = new Map();
  
  private getDataDir(): string {
    return config.getServer().dataDir;
  }
  
  async getUserQuota(userId: string | null): Promise<QuotaInfo> {
    const quotaConfig = config.getQuota();
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
      usagePercentage: maxFiles > 0 ? (usage.usedFiles / maxFiles) * 100 : 0,
    };
  }
  
  async getGlobalQuota(): Promise<GlobalQuotaInfo> {
    const quotaConfig = config.getQuota();
    const usage = await this.getUsage(null);
    
    return {
      maxFiles: quotaConfig.global.maxTotalFiles,
      maxStorage: quotaConfig.global.maxTotalStorageBytes,
      usedFiles: usage.usedFiles,
      usedStorage: usage.usedStorage,
      byCategory: usage.byCategory,
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
    
    // Check global quota
    const globalQuota = await this.getGlobalQuota();
    if (fileSize > (globalQuota.maxStorage - globalQuota.usedStorage)) {
      return {
        allowed: false,
        reason: 'Would exceed global storage limit',
      };
    }
    
    if (globalQuota.usedFiles >= globalQuota.maxFiles) {
      return {
        allowed: false,
        reason: 'Would exceed global file count limit',
      };
    }
    
    return { allowed: true };
  }
  
  async reserveQuota(
    userId: string | null, 
    fileSize: number, 
    category: FileCategory
  ): Promise<boolean> {
    const check = await this.checkQuota(userId, fileSize);
    if (!check.allowed) return false;
    
    // Update user usage
    const userKey = userId || '_anonymous';
    const userUsage = await this.getUsage(userId);
    userUsage.usedFiles++;
    userUsage.usedStorage += fileSize;
    userUsage.byCategory[category].count++;
    userUsage.byCategory[category].storage += fileSize;
    
    await this.saveUsage(userKey, userUsage);
    
    // Update global usage
    const globalUsage = await this.getUsage(null);
    globalUsage.usedFiles++;
    globalUsage.usedStorage += fileSize;
    globalUsage.byCategory[category].count++;
    globalUsage.byCategory[category].storage += fileSize;
    
    await this.saveUsage('_global', globalUsage);
    
    return true;
  }
  
  async releaseQuota(
    userId: string | null, 
    fileSize: number,
    category: FileCategory
  ): Promise<void> {
    const userKey = userId || '_anonymous';
    
    // Update user usage
    const userUsage = await this.getUsage(userId);
    userUsage.usedFiles = Math.max(0, userUsage.usedFiles - 1);
    userUsage.usedStorage = Math.max(0, userUsage.usedStorage - fileSize);
    userUsage.byCategory[category].count = Math.max(0, userUsage.byCategory[category].count - 1);
    userUsage.byCategory[category].storage = Math.max(0, userUsage.byCategory[category].storage - fileSize);
    
    await this.saveUsage(userKey, userUsage);
    
    // Update global usage
    const globalUsage = await this.getUsage(null);
    globalUsage.usedFiles = Math.max(0, globalUsage.usedFiles - 1);
    globalUsage.usedStorage = Math.max(0, globalUsage.usedStorage - fileSize);
    globalUsage.byCategory[category].count = Math.max(0, globalUsage.byCategory[category].count - 1);
    globalUsage.byCategory[category].storage = Math.max(0, globalUsage.byCategory[category].storage - fileSize);
    
    await this.saveUsage('_global', globalUsage);
  }
  
  private async getUsage(userId: string | null): Promise<UsageStats> {
    const key = userId || '_global';
    
    if (this.usageCache.has(key)) {
      return this.usageCache.get(key)!;
    }
    
    // Load from storage
    const dataDir = this.getDataDir();
    const usagePath = path.join(dataDir, `usage-${key}.json`);
    
    try {
      if (fs.existsSync(usagePath)) {
        const data = JSON.parse(fs.readFileSync(usagePath, 'utf-8'));
        this.usageCache.set(key, data);
        return data;
      }
    } catch (error) {
      console.warn(`Error loading usage for ${key}:`, error);
    }
    
    return { ...DEFAULT_USAGE_STATS };
  }
  
  private async saveUsage(key: string, usage: UsageStats): Promise<void> {
    const dataDir = this.getDataDir();
    
    // Ensure directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const usagePath = path.join(dataDir, `usage-${key}.json`);
    fs.writeFileSync(usagePath, JSON.stringify(usage, null, 2));
    this.usageCache.set(key, usage);
  }
  
  // Clear cache (useful for testing)
  clearCache(): void {
    this.usageCache.clear();
  }
}

// Export singleton instance
export const quotaManager = new QuotaManager();
