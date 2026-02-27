import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Hono } from 'hono'
import { filesRouter } from '../src/routers/files'
import { authMiddleware } from '../src/middleware/auth'
import { config } from '../src/config'
import { fileStore, setFileStorage } from '../src/store/fileStore'
import { quotaManager } from '../src/services/quota-manager'
import { JsonManager, JsonObjManager } from 'json-obj-manager'
import { FileAdapter } from 'json-obj-manager/node'
import path from 'path'
import fs from 'fs'
import { mkdir, rm } from 'fs/promises'
import type { FileItem } from '../src/types/file'

// Test app setup with auth and files router
function createTestApp() {
  const app = new Hono()
  app.use('*', authMiddleware)
  app.route('/api/files', filesRouter)
  return app
}

describe('Files Router', () => {
  let app: Hono
  let testStorage: JsonObjManager<FileItem>
  let testStoragePath: string
  let testUploadsDir: string

  beforeEach(async () => {
    // Create test app
    app = createTestApp()
    
    // Ensure OAuth is disabled for tests
    const oauthConfig = config.getOAuth()
    config.update({ oauth: { ...oauthConfig, enabled: false } })
    
    // Create test storage
    testStoragePath = path.join(process.cwd(), 'data', 'test-files-router.json')
    const dataDir = path.dirname(testStoragePath)
    if (!fs.existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true })
    }
    if (fs.existsSync(testStoragePath)) {
      fs.unlinkSync(testStoragePath)
    }
    
    const adapter = new FileAdapter<FileItem>(testStoragePath)
    testStorage = new JsonManager<FileItem>({ adapter })
    setFileStorage(testStorage)
    
    // Create test uploads directory
    testUploadsDir = path.join(process.cwd(), 'test-uploads')
    if (fs.existsSync(testUploadsDir)) {
      await rm(testUploadsDir, { recursive: true, force: true })
    }
    await mkdir(testUploadsDir, { recursive: true })
    
    // Override uploads dir in config
    const serverConfig = config.getServer()
    config.update({ 
      server: { 
        ...serverConfig, 
        uploadsDir: testUploadsDir 
      } 
    })
  })

  afterEach(async () => {
    // Clean up test storage
    if (testStoragePath && fs.existsSync(testStoragePath)) {
      fs.unlinkSync(testStoragePath)
    }
    
    // Clean up test uploads
    if (testUploadsDir && fs.existsSync(testUploadsDir)) {
      await rm(testUploadsDir, { recursive: true, force: true })
    }
    
    // Reset config
    config.reload()
  })

  describe('GET /api/files', () => {
    it('should return empty list when no files exist', async () => {
      const res = await app.request('/api/files')
      expect(res.status).toBe(200)
      
      const body = await res.json() as any
      expect(body.files).toEqual([])
      expect(body.pagination.total).toBe(0)
    })

    it('should return files with pagination', async () => {
      // Add test files to storage
      const testFile1: FileItem = {
        id: 'file-1',
        name: 'test1.png',
        originalName: 'test1.png',
        category: 'image',
        mimeType: 'image/png',
        extension: '.png',
        size: 1024,
        sizeFormatted: '1.00 KB',
        status: 'valid',
        flags: [],
        url: '/uploads/images/test1.png',
        storagePath: path.join(testUploadsDir, 'images', 'test1.png'),
        integrity: { sha256: 'a'.repeat(64) },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now() - 1000,
        updatedAt: Date.now() - 1000,
        deletedAt: null,
      }

      const testFile2: FileItem = {
        id: 'file-2',
        name: 'test2.png',
        originalName: 'test2.png',
        category: 'image',
        mimeType: 'image/png',
        extension: '.png',
        size: 2048,
        sizeFormatted: '2.00 KB',
        status: 'valid',
        flags: [],
        url: '/uploads/images/test2.png',
        storagePath: path.join(testUploadsDir, 'images', 'test2.png'),
        integrity: { sha256: 'b'.repeat(64) },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      }

      await testStorage.save('file-1', testFile1)
      await testStorage.save('file-2', testFile2)

      const res = await app.request('/api/files')
      expect(res.status).toBe(200)
      
      const body = await res.json() as any
      expect(body.files.length).toBe(2)
      expect(body.pagination.total).toBe(2)
    })

    it('should filter files by category', async () => {
      const imageFile: FileItem = {
        id: 'file-3',
        name: 'img.png',
        originalName: 'img.png',
        category: 'image',
        mimeType: 'image/png',
        extension: '.png',
        size: 500,
        sizeFormatted: '500.00 B',
        status: 'valid',
        flags: [],
        url: '/uploads/images/img.png',
        storagePath: path.join(testUploadsDir, 'images', 'img.png'),
        integrity: { sha256: 'c'.repeat(64) },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      }

      const docFile: FileItem = {
        id: 'file-4',
        name: 'doc.pdf',
        originalName: 'doc.pdf',
        category: 'document',
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: 1000,
        sizeFormatted: '1.00 KB',
        status: 'valid',
        flags: [],
        url: '/uploads/documents/doc.pdf',
        storagePath: path.join(testUploadsDir, 'documents', 'doc.pdf'),
        integrity: { sha256: 'd'.repeat(64) },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      }

      await testStorage.save('file-3', imageFile)
      await testStorage.save('file-4', docFile)

      const res = await app.request('/api/files?category=image')
      expect(res.status).toBe(200)
      
      const body = await res.json() as any
      expect(body.files.length).toBe(1)
      expect(body.files[0].category).toBe('image')
    })

    it('should filter files by status', async () => {
      const validFile: FileItem = {
        id: 'file-5',
        name: 'valid.png',
        originalName: 'valid.png',
        category: 'image',
        mimeType: 'image/png',
        extension: '.png',
        size: 100,
        sizeFormatted: '100.00 B',
        status: 'valid',
        flags: [],
        url: '/uploads/images/valid.png',
        storagePath: path.join(testUploadsDir, 'images', 'valid.png'),
        integrity: { sha256: 'e'.repeat(64) },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      }

      const deletedFile: FileItem = {
        id: 'file-6',
        name: 'deleted.png',
        originalName: 'deleted.png',
        category: 'image',
        mimeType: 'image/png',
        extension: '.png',
        size: 100,
        sizeFormatted: '100.00 B',
        status: 'deleted',
        flags: [],
        url: '/uploads/images/deleted.png',
        storagePath: path.join(testUploadsDir, 'images', 'deleted.png'),
        integrity: { sha256: 'f'.repeat(64) },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: Date.now(),
      }

      await testStorage.save('file-5', validFile)
      await testStorage.save('file-6', deletedFile)

      const res = await app.request('/api/files?status=valid')
      expect(res.status).toBe(200)
      
      const body = await res.json() as any
      // Deleted files should be excluded by default
      expect(body.files.length).toBe(1)
      expect(body.files[0].status).toBe('valid')
    })

    it('should paginate results', async () => {
      // Add multiple files
      for (let i = 0; i < 5; i++) {
        const testFile: FileItem = {
          id: `file-pag-${i}`,
          name: `test${i}.png`,
          originalName: `test${i}.png`,
          category: 'image',
          mimeType: 'image/png',
          extension: '.png',
          size: 100,
          sizeFormatted: '100.00 B',
          status: 'valid',
          flags: [],
          url: `/uploads/images/test${i}.png`,
          storagePath: path.join(testUploadsDir, 'images', `test${i}.png`),
          integrity: { sha256: `${i}`.repeat(64) },
          metadata: {},
          tags: [],
          uploadedBy: 'user-1',
          uploadedAt: Date.now() + i,
          updatedAt: Date.now() + i,
          deletedAt: null,
        }
        await testStorage.save(`file-pag-${i}`, testFile)
      }

      const res = await app.request('/api/files?page=1&pageSize=2')
      expect(res.status).toBe(200)
      
      const body = await res.json() as any
      expect(body.files.length).toBe(2)
      expect(body.pagination.page).toBe(1)
      expect(body.pagination.pageSize).toBe(2)
      expect(body.pagination.total).toBe(5)
      expect(body.pagination.totalPages).toBe(3)
    })
  })

  describe('GET /api/files/categories', () => {
    it('should return all categories', async () => {
      const res = await app.request('/api/files/categories')
      expect(res.status).toBe(200)
      
      const body = await res.json() as any
      expect(body.categories).toContain('image')
      expect(body.categories).toContain('audio')
      expect(body.categories).toContain('video')
      expect(body.categories).toContain('document')
      expect(body.securityCategories).toContain('unknown')
      expect(body.securityCategories).toContain('corrupted')
    })
  })

  describe('GET /api/files/suspicious', () => {
    it('should return suspicious and quarantine files', async () => {
      const suspiciousFile: FileItem = {
        id: 'file-susp-1',
        name: 'suspicious.png',
        originalName: 'suspicious.png',
        category: 'image',
        mimeType: 'image/png',
        extension: '.png',
        size: 100,
        sizeFormatted: '100.00 B',
        status: 'suspicious',
        flags: ['extension-mismatch'],
        url: '/uploads/images/suspicious.png',
        storagePath: path.join(testUploadsDir, 'images', 'suspicious.png'),
        integrity: { sha256: 'g'.repeat(64) },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      }

      const quarantineFile: FileItem = {
        id: 'file-quar-1',
        name: 'quarantine.png',
        originalName: 'quarantine.png',
        category: 'corrupted',
        mimeType: 'image/png',
        extension: '.png',
        size: 100,
        sizeFormatted: '100.00 B',
        status: 'quarantine',
        flags: ['corrupted-content'],
        url: '/uploads/images/quarantine.png',
        storagePath: path.join(testUploadsDir, 'images', 'quarantine.png'),
        integrity: { sha256: 'h'.repeat(64) },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      }

      await testStorage.save('file-susp-1', suspiciousFile)
      await testStorage.save('file-quar-1', quarantineFile)

      const res = await app.request('/api/files/suspicious')
      expect(res.status).toBe(200)
      
      const body = await res.json() as any
      expect(body.suspicious.length).toBe(1)
      expect(body.quarantine.length).toBe(1)
    })
  })

  describe('GET /api/files/:id', () => {
    it('should return 404 for non-existent file', async () => {
      const res = await app.request('/api/files/non-existent-id')
      expect(res.status).toBe(404)
    })

    it('should return file metadata', async () => {
      const testFile: FileItem = {
        id: 'file-meta-1',
        name: 'meta.png',
        originalName: 'meta.png',
        category: 'image',
        mimeType: 'image/png',
        extension: '.png',
        size: 2048,
        sizeFormatted: '2.00 KB',
        status: 'valid',
        flags: [],
        url: '/uploads/images/meta.png',
        storagePath: path.join(testUploadsDir, 'images', 'meta.png'),
        integrity: { sha256: 'i'.repeat(64) },
        metadata: { description: 'Test image' },
        tags: ['test'],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      }

      await testStorage.save('file-meta-1', testFile)

      const res = await app.request('/api/files/file-meta-1')
      expect(res.status).toBe(200)
      
      const body = await res.json() as any
      expect(body.id).toBe('file-meta-1')
      expect(body.name).toBe('meta.png')
      expect(body.metadata.description).toBe('Test image')
    })
  })

  describe('DELETE /api/files/:id', () => {
    it('should return 404 for non-existent file', async () => {
      const res = await app.request('/api/files/non-existent-id', { method: 'DELETE' })
      expect(res.status).toBe(404)
    })

    it('should soft delete a file', async () => {
      // First create the actual file
      const fileDir = path.join(testUploadsDir, 'images')
      await mkdir(fileDir, { recursive: true })
      const filePath = path.join(fileDir, 'delete-test.png')
      fs.writeFileSync(filePath, new Uint8Array([1, 2, 3]))

      const testFile: FileItem = {
        id: 'file-del-1',
        name: 'delete-test.png',
        originalName: 'delete-test.png',
        category: 'image',
        mimeType: 'image/png',
        extension: '.png',
        size: 3,
        sizeFormatted: '3.00 B',
        status: 'valid',
        flags: [],
        url: '/uploads/images/delete-test.png',
        storagePath: filePath,
        integrity: { sha256: 'j'.repeat(64) },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      }

      await testStorage.save('file-del-1', testFile)

      const res = await app.request('/api/files/file-del-1', { method: 'DELETE' })
      expect(res.status).toBe(200)

      // Verify file is soft deleted
      const file = await fileStore.get('file-del-1')
      expect(file?.status).toBe('deleted')
      expect(file?.deletedAt).not.toBeNull()
    })
  })

  describe('PUT /api/files/:id/status', () => {
    it('should return 404 for non-existent file', async () => {
      const res = await app.request('/api/files/non-existent-id/status', { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'valid' })
      })
      expect(res.status).toBe(404)
    })

    it('should update file status', async () => {
      const testFile: FileItem = {
        id: 'file-stat-1',
        name: 'status-test.png',
        originalName: 'status-test.png',
        category: 'image',
        mimeType: 'image/png',
        extension: '.png',
        size: 100,
        sizeFormatted: '100.00 B',
        status: 'suspicious',
        flags: ['extension-mismatch'],
        url: '/uploads/images/status-test.png',
        storagePath: path.join(testUploadsDir, 'images', 'status-test.png'),
        integrity: { sha256: 'k'.repeat(64) },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      }

      await testStorage.save('file-stat-1', testFile)

      const res = await app.request('/api/files/file-stat-1/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'valid' })
      })

      expect(res.status).toBe(200)
      
      const body = await res.json() as any
      expect(body.status).toBe('valid')
    })
  })

  describe('POST /api/files (upload)', () => {
    it('should reject request without file field', async () => {
      const formData = new FormData()
      // No file attached
      
      const res = await app.request('/api/files', {
        method: 'POST',
        body: formData,
      })
      
      expect(res.status).toBe(400)
      const body = await res.json() as any
      expect(body.error).toContain('file')
    })

    it('should reject invalid form data', async () => {
      const res = await app.request('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notFormData: true }),
      })
      
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/files/:id/download', () => {
    it('should return 404 for non-existent file', async () => {
      const res = await app.request('/api/files/non-existent-id/download')
      expect(res.status).toBe(404)
    })

    it('should return 404 for deleted file', async () => {
      const deletedFile: FileItem = {
        id: 'file-deleted-download',
        name: 'deleted.png',
        originalName: 'deleted.png',
        category: 'image',
        mimeType: 'image/png',
        extension: '.png',
        size: 100,
        sizeFormatted: '100.00 B',
        status: 'deleted',
        flags: [],
        url: '/uploads/images/deleted.png',
        storagePath: path.join(testUploadsDir, 'images', 'deleted.png'),
        integrity: { sha256: 'x'.repeat(64) },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: Date.now(),
      }

      await testStorage.save('file-deleted-download', deletedFile)

      const res = await app.request('/api/files/file-deleted-download/download')
      expect(res.status).toBe(404)
      const body = await res.json() as any
      expect(body.error).toContain('deleted')
    })

    it('should return 500 when file not accessible', async () => {
      const testFile: FileItem = {
        id: 'file-no-access',
        name: 'no-access.png',
        originalName: 'no-access.png',
        category: 'image',
        mimeType: 'image/png',
        extension: '.png',
        size: 100,
        sizeFormatted: '100.00 B',
        status: 'valid',
        flags: [],
        url: '/uploads/images/no-access.png',
        storagePath: '/non/existent/path/no-access.png',
        integrity: { sha256: 'y'.repeat(64) },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      }

      await testStorage.save('file-no-access', testFile)

      const res = await app.request('/api/files/file-no-access/download')
      expect(res.status).toBe(500)
    })
  })
})
