import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Hono } from 'hono'
import { quotaRouter } from '../src/routers/quota'
import { authMiddleware, type AuthContext } from '../src/middleware/auth'
import { config, Permission } from '../src/config'
import { quotaManager } from '../src/services/quota-manager'
import path from 'path'
import { rmSync } from 'fs'

// Test app setup with auth and quota router
function createTestApp() {
  const app = new Hono()
  app.use('*', authMiddleware)
  app.route('/api/quota', quotaRouter)
  return app
}

describe('Quota Router', () => {
  let app: Hono
  const configPath = path.join(process.cwd(), 'config.json')

  beforeEach(async () => {
    app = createTestApp()
    
    // Clean up config file
    try {
      rmSync(configPath, { force: true })
    } catch {}
    
    // Reload config to clean state
    config.reload()
    
    // Ensure OAuth is disabled for tests
    const oauthConfig = config.getOAuth()
    config.update({ oauth: { ...oauthConfig, enabled: false } })
    
    // Clear quota cache
    quotaManager.clearCache()
  })

  afterEach(async () => {
    // Clean up config file
    try {
      rmSync(configPath, { force: true })
    } catch {}
    config.reload()
    quotaManager.clearCache()
  })

  describe('GET /api/quota', () => {
    it('should reject user without read permission', async () => {
      // Create app with custom auth that has no permissions
      const restrictedApp = new Hono()
      restrictedApp.use('*', async (c, next) => {
        //@ts-expect-error
        c.set('auth', {
          authenticated: false,
          userId: 'test-user',
          permissions: [], // No permissions
          tokenLabel: null,
        } as AuthContext)
        await next()
      })
      restrictedApp.route('/api/quota', quotaRouter)

      const res = await restrictedApp.request('/api/quota')
      expect(res.status).toBe(403)
    })

    it('should return user quota', async () => {
      const res = await app.request('/api/quota')
      expect(res.status).toBe(200)
      
      const body = await res.json() as any
      expect(body.maxFiles).toBeDefined()
      expect(body.maxStorage).toBeDefined()
      expect(body.usedFiles).toBeDefined()
      expect(body.usedStorage).toBeDefined()
    })
  })

  describe('GET /api/quota/global', () => {
    it('should reject user without read permission', async () => {
      // Create app with custom auth that has no permissions
      const restrictedApp = new Hono()
      restrictedApp.use('*', async (c, next) => {
        //@ts-expect-error
        c.set('auth', {
          authenticated: false,
          userId: 'test-user',
          permissions: [], // No permissions
          tokenLabel: null,
        } as AuthContext)
        await next()
      })
      restrictedApp.route('/api/quota', quotaRouter)

      const res = await restrictedApp.request('/api/quota/global')
      expect(res.status).toBe(403)
    })

    it('should return global quota stats', async () => {
      const res = await app.request('/api/quota/global')
      expect(res.status).toBe(200)
      
      const body = await res.json() as any
      expect(body.maxFiles).toBeDefined()
      expect(body.maxStorage).toBeDefined()
      expect(body.usedFiles).toBeDefined()
      expect(body.usedStorage).toBeDefined()
    })
  })
})
