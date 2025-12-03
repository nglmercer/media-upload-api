import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { loadConfig, createConfigFile, saveConfig } from '../src/config'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import path from 'path'

describe('ConfigManager', () => {
  const configPath = path.join(process.cwd(), 'config.json')

  beforeEach(async () => {
    // Clean up config file before each test
    try {
      const fs = await import('fs/promises')
      await fs.rm(configPath, { force: true })
    } catch {
      // Ignore if file doesn't exist
    }
  })

  afterEach(async () => {
    // Clean up config file after each test
    try {
      const fs = await import('fs/promises')
      await fs.rm(configPath, { force: true })
    } catch {
      // Ignore if file doesn't exist
    }
  })

  describe('createConfigFile', () => {
    it('should create config file with default values', () => {
      createConfigFile()
      
      expect(existsSync(configPath)).toBe(true)
      
      const config = JSON.parse(readFileSync(configPath, 'utf8'))
      expect(config).toEqual({
        port: 21100,
        host: '0.0.0.0'
      })
    })

    it('should not overwrite existing config file', () => {
      // Create initial config
      const customConfig = { port: 3000, host: 'localhost' }
      writeFileSync(configPath, JSON.stringify(customConfig))
      
      createConfigFile()
      
      // Should keep existing config
      const config = JSON.parse(readFileSync(configPath, 'utf8'))
      expect(config).toEqual(customConfig)
    })
  })

  describe('loadConfig', () => {
    it('should load default config when no file exists', () => {
      const config = loadConfig()
      expect(config).toEqual({
        port: 21100,
        host: '0.0.0.0'
      })
    })

    it('should load existing config file', () => {
      const customConfig = { port: 4000, host: '192.168.1.1' }
      writeFileSync(configPath, JSON.stringify(customConfig))
      
      const config = loadConfig()
      expect(config).toEqual(customConfig)
    })

    it('should merge with default config for partial config', () => {
      const partialConfig = { port: 5000 }
      writeFileSync(configPath, JSON.stringify(partialConfig))
      
      const config = loadConfig()
      expect(config).toEqual({
        port: 5000,
        host: '0.0.0.0' // Default value
      })
    })

    it('should handle port 0 by using default port', () => {
      const configWithZeroPort = { port: 0 }
      writeFileSync(configPath, JSON.stringify(configWithZeroPort))
      
      const config = loadConfig()
      expect(config.port).toBe(21100) // Should use default
    })

    it('should handle invalid JSON gracefully', () => {
      writeFileSync(configPath, 'invalid json')
      
      const config = loadConfig()
      expect(config).toEqual({
        port: 21100,
        host: '0.0.0.0'
      })
    })
  })

  describe('saveConfig', () => {
    it('should save partial config updates', () => {
      createConfigFile()
      
      saveConfig({ port: 6000 })
      
      const config = JSON.parse(readFileSync(configPath, 'utf8'))
      expect(config).toEqual({
        port: 6000,
        host: '0.0.0.0' // Original value preserved
      })
    })

    it('should save multiple config updates', () => {
      createConfigFile()
      
      saveConfig({ port: 7000 })
      saveConfig({ host: '127.0.0.1' })
      
      const config = JSON.parse(readFileSync(configPath, 'utf8'))
      expect(config).toEqual({
        port: 7000,
        host: '127.0.0.1'
      })
    })
  })

  describe('integration', () => {
    it('should work end-to-end: create, load, save, load', () => {
      // Create initial config
      createConfigFile()
      let config = loadConfig()
      expect(config.port).toBe(21100)
      
      // Update config
      saveConfig({ port: 8000 })
      config = loadConfig()
      expect(config.port).toBe(8000)
      
      // Add another field
      saveConfig({ host: 'example.com' })
      config = loadConfig()
      expect(config).toEqual({
        port: 8000,
        host: 'example.com'
      })
    })
  })
})
