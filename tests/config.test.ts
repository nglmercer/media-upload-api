import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { config, loadConfig, saveConfig } from '../src/config'
import { readFileSync, writeFileSync, existsSync, rmSync } from 'fs'
import path from 'path'

describe('ConfigManager', () => {
  const configPath = path.join(process.cwd(), 'config.json')

  beforeEach(async () => {
    // Clean up config file before each test
    try {
      rmSync(configPath, { force: true })
    } catch {
      // Ignore if file doesn't exist
    }
  })

  afterEach(async () => {
    // Reload config to clean state after each test
    config.reload()
    // Clean up config file after each test
    try {
      rmSync(configPath, { force: true })
    } catch {
      // Ignore if file doesn't exist
    }
  })

  describe('Config Structure', () => {
    it('should have correct default server config', () => {
      const serverConfig = config.getServer()
      expect(serverConfig).toEqual({
        port: 3000,
        host: '0.0.0.0',
        uploadsDir: 'uploads',
        dataDir: 'data',
        maxFileSizeBytes: 104857600,
        allowedMimeTypes: [],
        logLevel: 'info'
      })
    })

    it('should have correct default quota config', () => {
      const quotaConfig = config.getQuota()
      expect(quotaConfig).toEqual({
        global: {
          maxTotalStorageBytes: 10737418240,
          maxTotalFiles: 10000
        },
        defaults: {
          maxStorageBytes: 524288000,
          maxFiles: 500
        },
        userOverrides: {}
      })
    })

    it('should have correct default oauth config', () => {
      const oauthConfig = config.getOAuth()
      expect(oauthConfig).toEqual({
        enabled: false,
        tokenAuth: {
          enabled: false,
          tokens: []
        },
        providers: []
      })
    })
  })

  describe('loadConfig (server config)', () => {
    it('should load default server config when no file exists', () => {
      const serverConfig = loadConfig()
      expect(serverConfig).toEqual({
        port: 3000,
        host: '0.0.0.0',
        uploadsDir: 'uploads',
        dataDir: 'data',
        maxFileSizeBytes: 104857600,
        allowedMimeTypes: [],
        logLevel: 'info'
      })
    })

    it('should merge partial server config with defaults', () => {
      const partialConfig = { port: 5000 }
      writeFileSync(configPath, JSON.stringify({ server: partialConfig }))
      config.reload()

      const serverConfig = loadConfig()
      expect(serverConfig.port).toBe(5000)
      expect(serverConfig.host).toBe('0.0.0.0') // Default
      expect(serverConfig.uploadsDir).toBe('uploads') // Default
    })

    it('should handle invalid JSON gracefully', () => {
      writeFileSync(configPath, 'invalid json')
      config.reload()

      const serverConfig = loadConfig()
      expect(serverConfig.port).toBe(3000) // Default port
    })
  })

  describe('saveConfig', () => {
    it('should save partial server config updates', () => {
      // Ensure config file exists
      const fullConfig = config.get()
      writeFileSync(configPath, JSON.stringify(fullConfig, null, 2))
      config.reload()

      saveConfig({ port: 6000 })

      const serverConfig = loadConfig()
      expect(serverConfig.port).toBe(6000)
      expect(serverConfig.host).toBe('0.0.0.0') // Original value preserved
      expect(serverConfig.uploadsDir).toBe('uploads')
    })

    it('should save multiple server config updates', () => {
      // Ensure config file exists
      const fullConfig = config.get()
      writeFileSync(configPath, JSON.stringify(fullConfig, null, 2))
      config.reload()

      saveConfig({ port: 7000 })
      saveConfig({ host: '127.0.0.1' })

      const serverConfig = loadConfig()
      expect(serverConfig.port).toBe(7000)
      expect(serverConfig.host).toBe('127.0.0.1')
    })
  })

  describe('integration', () => {
    it('should work end-to-end: create, load, save, reload', () => {
      // Force reload to get clean state
      config.reload()
      
      // Get initial config
      let serverConfig = loadConfig()
      expect(serverConfig.port).toBe(3000)

      // Update config
      saveConfig({ port: 8000 })
      serverConfig = loadConfig()
      expect(serverConfig.port).toBe(8000)

      // Add another field
      saveConfig({ host: 'example.com' })
      serverConfig = loadConfig()
      expect(serverConfig.port).toBe(8000)
      expect(serverConfig.host).toBe('example.com')
      
      // Clean up - restore to defaults
      config.reload()
    })
  })
})
