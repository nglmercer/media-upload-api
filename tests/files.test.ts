import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { handleRequest } from '../src/app'
import { config } from '../src/config'
import { fileStore, setFileStorage } from '../src/store/fileStore'
import { JsonManager, JsonObjManager } from 'json-obj-manager'
import { FileAdapter } from 'json-obj-manager/node'
import path from 'path'
import fs from 'fs'
import { mkdir, rm } from 'fs/promises'
import type { FileItem } from '../src/types/file'

describe('Files Router', () => {
  let testStorage: JsonObjManager<FileItem>
  let testStoragePath: string
  let testUploadsDir: string

  beforeEach(async () => {
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
    if (testStoragePath && fs.existsSync(testStoragePath)) {
      fs.unlinkSync(testStoragePath)
    }
    if (testUploadsDir && fs.existsSync(testUploadsDir)) {
      await rm(testUploadsDir, { recursive: true, force: true })
    }
    config.reload()
  })

  describe('GET /api/files', () => {
    it('should return empty list when no files exist', async () => {
      const req = new Request('http://localhost/api/files')
      const res = await handleRequest(req)
      expect(res.status).toBe(200)
      
      const body = await res.json() as any
      expect(body.files).toEqual([])
      expect(body.pagination.total).toBe(0)
    })

    it('should return files with pagination', async () => {
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
      await testStorage.save('file-1', testFile1)

      const req = new Request('http://localhost/api/files')
      const res = await handleRequest(req)
      expect(res.status).toBe(200)
      
      const body = await res.json() as any
      expect(body.files.length).toBe(1)
      expect(body.pagination.total).toBe(1)
    })
  })

  describe('GET /api/files/:id', () => {
    it('should return 404 for non-existent file', async () => {
      const req = new Request('http://localhost/api/files/non-existent-id')
      const res = await handleRequest(req)
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/files/:id', () => {
    it('should soft delete a file', async () => {
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

      const req = new Request('http://localhost/api/files/file-del-1', { method: 'DELETE' })
      const res = await handleRequest(req)
      expect(res.status).toBe(200)

      const file = await fileStore.get('file-del-1')
      expect(file?.status).toBe('deleted')
    })
  })

  describe('POST /api/files (upload)', () => {
    it('should reject request without file field', async () => {
      const formData = new FormData()
      const req = new Request('http://localhost/api/files', {
        method: 'POST',
        body: formData,
      })
      const res = await handleRequest(req)
      
      expect(res.status).toBe(400)
    })
  })
})
