import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { authMiddleware, requirePermission, getAuth, type AuthContext } from '../src/middleware/auth'
import { config } from '../src/config'
import type { ServerContext } from '../src/utils/vanilla-http'

describe('Auth Middleware', () => {
  beforeEach(() => {
    config.reload()
  })

  afterEach(() => {
    config.reload()
  })

  describe('authMiddleware', () => {
    it('should set empty permissions when OAuth is disabled and no token provided', async () => {
      // Ensure OAuth is disabled
      const oauthConfig = config.getOAuth()
      config.update({ oauth: { ...oauthConfig, enabled: false } })

      const req = new Request('http://localhost/test')
      const ctx: ServerContext = {
        params: {},
        url: new URL(req.url)
      }

      const res = await authMiddleware(req, ctx)
      expect(res).toBeNull() // No error response, proceed

      const auth = getAuth(ctx)
      expect(auth.permissions).toEqual([])
      expect(auth.authenticated).toBe(false)
    })

    it('should set empty permissions when token auth is disabled', async () => {
      // Enable OAuth but disable token auth
      const oauthConfig = config.getOAuth()
      config.update({ 
        oauth: { 
          ...oauthConfig, 
          enabled: true,
          tokenAuth: { enabled: false, tokens: [] }
        } 
      })

      const req = new Request('http://localhost/test')
      const ctx: ServerContext = {
        params: {},
        url: new URL(req.url)
      }

      const res = await authMiddleware(req, ctx)
      expect(res).toBeNull()

      const auth = getAuth(ctx)
      expect(auth.permissions).toEqual([])
      expect(auth.authenticated).toBe(false)
    })

    it('should allow request without token when token auth is enabled (sets unauthenticated)', async () => {
      // Enable OAuth and token auth
      const oauthConfig = config.getOAuth()
      config.update({ 
        oauth: { 
          ...oauthConfig, 
          enabled: true,
          tokenAuth: { enabled: true, tokens: [] }
        } 
      })

      const req = new Request('http://localhost/test')
      const ctx: ServerContext = {
        params: {},
        url: new URL(req.url)
      }

      const res = await authMiddleware(req, ctx)
      // The middleware does NOT reject when no token is provided, it sets unauthenticated context
      expect(res).toBeNull()
      
      const auth = getAuth(ctx)
      expect(auth.authenticated).toBe(false)
    })

    it('should set unauthenticated context for invalid token', async () => {
      // Enable OAuth and token auth
      const oauthConfig = config.getOAuth()
      config.update({ 
        oauth: { 
          ...oauthConfig, 
          enabled: true,
          tokenAuth: { enabled: true, tokens: [] }
        } 
      })

      const req = new Request('http://localhost/test', {
        headers: { 'X-Auth-Token': 'invalid-token' }
      })
      const ctx: ServerContext = {
        params: {},
        url: new URL(req.url)
      }

      const res = await authMiddleware(req, ctx)
      // The middleware does NOT reject invalid tokens, it sets unauthenticated context
      expect(res).toBeNull()
      
      const auth = getAuth(ctx)
      expect(auth.authenticated).toBe(false)
      expect(auth.permissions).toEqual([])
    })
  })

  describe('requirePermission', () => {
    it('should allow request when user has required permission', async () => {
      const auth: AuthContext = {
        authenticated: true,
        userId: 'test',
        permissions: ['read'],
        tokenLabel: 'test'
      }
      const ctx: ServerContext = { params: {}, url: new URL('http://localhost'), auth }
      const req = new Request('http://localhost')

      const middleware = requirePermission('read')
      const res = await middleware(req, ctx)
      expect(res).toBeNull()
    })

    it('should reject request when user lacks required permission', async () => {
      const auth: AuthContext = {
        authenticated: true,
        userId: 'test',
        permissions: ['read'],
        tokenLabel: 'test'
      }
      const ctx: ServerContext = { params: {}, url: new URL('http://localhost'), auth }
      const req = new Request('http://localhost')

      const middleware = requirePermission('admin')
      const res = await middleware(req, ctx)
      expect(res).toBeInstanceOf(Response)
      expect(res?.status).toBe(403)
    })
  })

  describe('getAuth', () => {
    it('should return default auth context when not set', () => {
      const ctx: ServerContext = { params: {}, url: new URL('http://localhost') }
      const auth = getAuth(ctx)
      expect(auth.authenticated).toBe(false)
      expect(auth.userId).toBeNull()
      expect(auth.permissions).toEqual([])
      expect(auth.tokenLabel).toBeNull()
    })
  })
})
