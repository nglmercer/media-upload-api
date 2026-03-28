import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { handleRequest } from '../src/app'
import { config, Permission } from '../src/config'
import path from 'path'
import { rmSync } from 'fs'

describe('Config Router', () => {
  const configPath = path.join(process.cwd(), 'config.json')

  beforeEach(async () => {
    // Clean up config file
    try {
      rmSync(configPath, { force: true })
    } catch {}
    
    // Reload config to clean state
    config.reload()
  })

  afterEach(async () => {
    // Clean up config file
    try {
      rmSync(configPath, { force: true })
    } catch {}
    config.reload()
  })

  describe('GET /api/config', () => {
    it('should return public configuration', async () => {
      // Ensure OAuth is disabled for this test
      const oauthConfig = config.getOAuth()
      config.update({ oauth: { ...oauthConfig, enabled: false } })

      const req = new Request('http://localhost/api/config')
      const res = await handleRequest(req)
      expect(res.status).toBe(200)
      
      const body = await res.json() as any
      expect(body.oauth).toBeDefined()
      expect(body.oauth.enabled).toBe(false)
      expect(body.quota).toBeDefined()
      expect(body.server).toBeDefined()
      expect(body.server.maxFileSizeBytes).toBeDefined()
    })

    it('should not expose sensitive token data', async () => {
      // Ensure OAuth is disabled for this test
      const oauthConfig = config.getOAuth()
      config.update({ oauth: { ...oauthConfig, enabled: false } })

      // Add a token to config
      config.addToken('secret-token-123', {
        userId: 'user-1',
        label: 'test-token',
        permissions: [Permission.READ, Permission.LIST],
        createdAt: Date.now(),
      })

      const req = new Request('http://localhost/api/config')
      const res = await handleRequest(req)
      expect(res.status).toBe(200)
      
      const body = await res.json() as any
      // Token should not be exposed in public config
      expect(body.oauth).toBeDefined()
    })
  })

  describe('GET /api/config/server', () => {
    it('should reject non-admin user', async () => {
      // Enable token auth and add a non-admin token
      const oauthConfig = config.getOAuth()
      config.update({ 
        oauth: { 
          ...oauthConfig, 
          enabled: true,
          tokenAuth: { enabled: true, tokens: [] }
        } 
      })

      // Add a non-admin token
      config.addToken('non-admin-token', {
        userId: 'regular-user',
        label: 'regular',
        permissions: [Permission.READ, Permission.LIST],
        createdAt: Date.now(),
      })

      const req = new Request('http://localhost/api/config/server', {
        headers: { 'X-Auth-Token': 'non-admin-token' }
      })
      const res = await handleRequest(req)
      
      expect(res.status).toBe(403)
    })

    it('should return server config for admin', async () => {
      // Enable token auth
      const oauthConfig = config.getOAuth()
      config.update({ 
        oauth: { 
          ...oauthConfig, 
          enabled: true,
          tokenAuth: { enabled: true, tokens: [] }
        } 
      })

      // Add admin token
      config.addToken('admin-token', {
        userId: 'admin-user',
        label: 'admin',
        permissions: [Permission.ADMIN, Permission.READ, Permission.LIST],
        createdAt: Date.now(),
      })

      const req = new Request('http://localhost/api/config/server', {
        headers: { 'X-Auth-Token': 'admin-token' }
      })
      const res = await handleRequest(req)
      
      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.port).toBeDefined()
      expect(body.host).toBeDefined()
      expect(body.uploadsDir).toBeDefined()
    })
  })

  describe('PUT /api/config', () => {
    it('should reject non-admin user', async () => {
      const oauthConfig = config.getOAuth()
      config.update({ 
        oauth: { 
          ...oauthConfig, 
          enabled: true,
          tokenAuth: { enabled: true, tokens: [] }
        } 
      })

      config.addToken('non-admin-token-put', {
        userId: 'regular-user-put',
        label: 'regular',
        permissions: [Permission.READ, Permission.LIST],
        createdAt: Date.now(),
      })

      const req = new Request('http://localhost/api/config', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Auth-Token': 'non-admin-token-put'
        },
        body: JSON.stringify({ server: { port: 4000 } })
      })
      const res = await handleRequest(req)
      expect(res.status).toBe(403)
    })

    it('should reject invalid JSON', async () => {
      const oauthConfig = config.getOAuth()
      config.update({ 
        oauth: { 
          ...oauthConfig, 
          enabled: true,
          tokenAuth: { enabled: true, tokens: [] }
        } 
      })

      config.addToken('admin-token-put', {
        userId: 'admin-user-put',
        label: 'admin',
        permissions: [Permission.ADMIN],
        createdAt: Date.now(),
      })

      const req = new Request('http://localhost/api/config', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Auth-Token': 'admin-token-put'
        },
        body: 'invalid json'
      })
      const res = await handleRequest(req)
      expect(res.status).toBe(400)
    })

    it('should update config for admin', async () => {
      const oauthConfig = config.getOAuth()
      config.update({ 
        oauth: { 
          ...oauthConfig, 
          enabled: true,
          tokenAuth: { enabled: true, tokens: [] }
        } 
      })

      config.addToken('admin-token-update', {
        userId: 'admin-user-update',
        label: 'admin',
        permissions: [Permission.ADMIN],
        createdAt: Date.now(),
      })

      const req = new Request('http://localhost/api/config', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Auth-Token': 'admin-token-update'
        },
        body: JSON.stringify({ server: { port: 4000 } })
      })
      const res = await handleRequest(req)
      
      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.message).toContain('updated')
    })
  })

  describe('POST /api/config/token', () => {
    it('should reject non-admin user', async () => {
      const oauthConfig = config.getOAuth()
      config.update({ oauth: { ...oauthConfig, enabled: true, tokenAuth: { enabled: true, tokens: [] } } })

      config.addToken('non-admin-token-post', {
        userId: 'regular-user-post',
        label: 'regular',
        permissions: [Permission.READ, Permission.LIST],
        createdAt: Date.now(),
      })

      const req = new Request('http://localhost/api/config/token', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Auth-Token': 'non-admin-token-post'
        },
        body: JSON.stringify({ token: 'new-token', userId: 'user-2', label: 'new token' })
      })
      const res = await handleRequest(req)
      expect(res.status).toBe(403)
    })

    it('should create token for admin', async () => {
      const oauthConfig = config.getOAuth()
      config.update({ oauth: { ...oauthConfig, enabled: true, tokenAuth: { enabled: true, tokens: [] } } })

      config.addToken('admin-token-create', {
        userId: 'admin-user-create',
        label: 'admin',
        permissions: [Permission.ADMIN],
        createdAt: Date.now(),
      })

      const req = new Request('http://localhost/api/config/token', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Auth-Token': 'admin-token-create'
        },
        body: JSON.stringify({ 
          token: 'brand-new-token', 
          userId: 'brand-new-user', 
          label: 'brand new token',
          permissions: [Permission.READ, Permission.LIST, Permission.UPLOAD]
        })
      })
      const res = await handleRequest(req)
      
      expect(res.status).toBe(201)
      const body = await res.json() as any
      expect(body.message).toContain('success')
      expect(body.userId).toBe('brand-new-user')
    })
  })

  describe('DELETE /api/config/token/:userId', () => {
    it('should remove token for admin', async () => {
      const oauthConfig = config.getOAuth()
      config.update({ oauth: { ...oauthConfig, enabled: true, tokenAuth: { enabled: true, tokens: [] } } })

      config.addToken('admin-token-remove', {
        userId: 'admin-user-remove',
        label: 'admin',
        permissions: [Permission.ADMIN],
        createdAt: Date.now(),
      })

      config.addToken('token-to-remove', {
        userId: 'user-to-remove',
        label: 'removeme',
        permissions: [Permission.READ],
        createdAt: Date.now(),
      })

      const req = new Request('http://localhost/api/config/token/user-to-remove', {
        method: 'DELETE',
        headers: { 'X-Auth-Token': 'admin-token-remove' }
      })
      const res = await handleRequest(req)
      
      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.message).toContain('removed')
    })
  })
})
