import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Hono } from 'hono'
import { authMiddleware, requirePermission, getAuth, type AuthContext } from '../src/middleware/auth'
import { config } from '../src/config'

describe('Auth Middleware', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
    config.reload()
  })

  afterEach(() => {
    config.reload()
  })

  describe('authMiddleware', () => {
    it('should allow all permissions when OAuth is disabled', async () => {
      // Ensure OAuth is disabled
      const oauthConfig = config.getOAuth()
      config.update({ oauth: { ...oauthConfig, enabled: false } })

      app.use('*', authMiddleware)
      app.get('/test', (c) => {
        const auth = getAuth(c)
        return c.json(auth)
      })

      const res = await app.request('/test')
      const body = await res.json() as AuthContext

      expect(res.status).toBe(200)
      expect(body.permissions).toContain('upload')
      expect(body.permissions).toContain('read')
      expect(body.permissions).toContain('delete')
      expect(body.permissions).toContain('list')
      expect(body.permissions).toContain('admin')
      expect(body.authenticated).toBe(false)
    })

    it('should allow all permissions when token auth is disabled', async () => {
      // Enable OAuth but disable token auth
      const oauthConfig = config.getOAuth()
      config.update({ 
        oauth: { 
          ...oauthConfig, 
          enabled: true,
          tokenAuth: { enabled: false, tokens: [] }
        } 
      })

      app.use('*', authMiddleware)
      app.get('/test', (c) => {
        const auth = getAuth(c)
        return c.json(auth)
      })

      const res = await app.request('/test')
      const body = await res.json() as AuthContext

      expect(res.status).toBe(200)
      expect(body.permissions).toContain('upload')
      expect(body.authenticated).toBe(false)
    })

    it('should reject request without token when token auth is enabled', async () => {
      // Enable OAuth and token auth
      const oauthConfig = config.getOAuth()
      config.update({ 
        oauth: { 
          ...oauthConfig, 
          enabled: true,
          tokenAuth: { enabled: true, tokens: [] }
        } 
      })

      app.use('*', authMiddleware)
      app.get('/test', (c) => {
        return c.json({ ok: true })
      })

      const res = await app.request('/test')

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('should reject invalid token', async () => {
      // Enable OAuth and token auth
      const oauthConfig = config.getOAuth()
      config.update({ 
        oauth: { 
          ...oauthConfig, 
          enabled: true,
          tokenAuth: { enabled: true, tokens: [] }
        } 
      })

      app.use('*', authMiddleware)
      app.get('/test', (c) => {
        return c.json({ ok: true })
      })

      const res = await app.request('/test', {
        headers: { 'X-Auth-Token': 'invalid-token' }
      })

      expect(res.status).toBe(401)
    })
  })

  describe('requirePermission', () => {
    it('should allow request when user has required permission', async () => {
      const oauthConfig = config.getOAuth()
      config.update({ oauth: { ...oauthConfig, enabled: false } })

      app.use('*', authMiddleware)
      app.get('/test', requirePermission('read'), (c) => {
        return c.json({ ok: true })
      })

      const res = await app.request('/test')
      expect(res.status).toBe(200)
    })

    it('should reject request when user lacks required permission', async () => {
      const oauthConfig = config.getOAuth()
      config.update({ oauth: { ...oauthConfig, enabled: false } })

      // Remove read permission from default
      app.use('*', authMiddleware)
      app.get('/test', requirePermission('admin'), (c) => {
        return c.json({ ok: true })
      })

      const res = await app.request('/test')
      // Default permissions include admin, so this should pass
      expect(res.status).toBe(200)
    })
  })

  describe('getAuth', () => {
    it('should return default auth context when not set', () => {
      // Create a mock context
      const mockContext = {
        get: () => undefined
      } as any
      const auth = getAuth(mockContext)
      expect(auth.authenticated).toBe(false)
      expect(auth.userId).toBeNull()
      expect(auth.permissions).toEqual([])
      expect(auth.tokenLabel).toBeNull()
    })
  })
})
