import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { quotaManager } from '../src/services/quota-manager'
import { config } from '../src/config'
import { rm, mkdir } from 'fs/promises'
import path from 'path'

describe('QuotaManager', () => {
  const testDataDir = path.join(process.cwd(), 'data')

  beforeEach(async () => {
    // Ensure data directory exists
    await mkdir(testDataDir, { recursive: true })
    // Clear quota cache
    quotaManager.clearCache()
    // Reload config to ensure fresh state
    config.reload()
  })

  afterEach(async () => {
    // Clean up usage files
    const usageFiles = ['usage-_global.json', 'usage-testuser.json', 'usage-_anonymous.json']
    for (const file of usageFiles) {
      try {
        await rm(path.join(testDataDir, file), { force: true })
      } catch {}
    }
    quotaManager.clearCache()
    config.reload()
  })

  describe('getUserQuota', () => {
    it('should return default quota when no usage', async () => {
      const quota = await quotaManager.getUserQuota('testuser')

      expect(quota.maxFiles).toBe(500)
      expect(quota.maxStorage).toBe(524288000) // 500MB
      expect(quota.usedFiles).toBe(0)
      expect(quota.usedStorage).toBe(0)
      expect(quota.remainingFiles).toBe(500)
      expect(quota.remainingStorage).toBe(524288000)
      expect(quota.usagePercentage).toBe(0)
    })

    it('should use user override if configured', async () => {
      // Set user override
      const quotaConfig = config.getQuota()
      config.update({
        quota: {
          ...quotaConfig,
          userOverrides: {
            testuser: {
              maxFiles: 100,
              maxStorageBytes: 104857600, // 100MB
            },
          },
        },
      })

      const quota = await quotaManager.getUserQuota('testuser')

      expect(quota.maxFiles).toBe(100)
      expect(quota.maxStorage).toBe(104857600)
    })
  })

  describe('getGlobalQuota', () => {
    it('should return global quota limits', async () => {
      const quota = await quotaManager.getGlobalQuota()

      expect(quota.maxFiles).toBe(10000)
      expect(quota.maxStorage).toBe(10737418240) // 10GB
      expect(quota.usedFiles).toBe(0)
      expect(quota.usedStorage).toBe(0)
      expect(quota.byCategory).toBeDefined()
    })
  })

  describe('checkQuota', () => {
    it('should allow when under limits', async () => {
      const result = await quotaManager.checkQuota('testuser', 1024) // 1KB

      expect(result.allowed).toBe(true)
      expect(result.reason).toBeUndefined()
    })
  })

  describe('reserveQuota', () => {
    it('should reserve quota for user and global', async () => {
      const result = await quotaManager.reserveQuota('testuser', 1024, 'image')

      expect(result).toBe(true)

      // Check user quota
      const userQuota = await quotaManager.getUserQuota('testuser')
      expect(userQuota.usedFiles).toBe(1)
      expect(userQuota.usedStorage).toBe(1024)

      // Check global quota
      const globalQuota = await quotaManager.getGlobalQuota()
      expect(globalQuota.usedFiles).toBe(1)
      expect(globalQuota.usedStorage).toBe(1024)
    })
  })

  describe('releaseQuota', () => {
    it('should release reserved quota', async () => {
      // First reserve
      await quotaManager.reserveQuota('testuser', 1024, 'image')

      // Then release
      await quotaManager.releaseQuota('testuser', 1024, 'image')

      // Check user quota
      const userQuota = await quotaManager.getUserQuota('testuser')
      expect(userQuota.usedFiles).toBe(0)
      expect(userQuota.usedStorage).toBe(0)
    })
  })

  describe('clearCache', () => {
    it('should clear the usage cache', async () => {
      // Load quota to populate cache
      await quotaManager.getUserQuota('testuser')

      // Clear cache
      quotaManager.clearCache()

      // Should still work after clearing
      const quota = await quotaManager.getUserQuota('testuser')
      expect(quota).toBeDefined()
    })
  })
})
