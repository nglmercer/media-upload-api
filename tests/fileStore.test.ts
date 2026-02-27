import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { fileStore, setFileStorage } from '../src/store/fileStore'
import { JsonManager, JsonObjManager } from 'json-obj-manager'
import { FileAdapter } from 'json-obj-manager/node'
import path from 'path'
import fs from 'fs'
import type { FileItem } from '../src/types/file'

describe('FileStore', () => {
  let testStorage: JsonObjManager<FileItem>
  let testStoragePath: string

  beforeEach(async () => {
    // Create a temporary test storage
    testStoragePath = path.join(process.cwd(), 'data', 'test-fileStore.json')
    
    // Ensure data directory exists
    const dataDir = path.dirname(testStoragePath)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    // Clean up any existing test file
    if (fs.existsSync(testStoragePath)) {
      fs.unlinkSync(testStoragePath)
    }

    const adapter = new FileAdapter<FileItem>(testStoragePath)
    testStorage = new JsonManager<FileItem>({ adapter })
    
    // Override the file store storage
    setFileStorage(testStorage)
  })

  afterEach(async () => {
    // Clean up test storage
    if (testStoragePath && fs.existsSync(testStoragePath)) {
      fs.unlinkSync(testStoragePath)
    }
  })

  describe('getAll', () => {
    it('should return empty object when no files exist', async () => {
      const files = await fileStore.getAll()
      expect(files).toEqual({})
    })

    it('should return all stored files', async () => {
      const testFile: FileItem = {
        id: 'file-1',
        name: 'test.png',
        originalName: 'test.png',
        category: 'image',
        mimeType: 'image/png',
        extension: '.png',
        size: 1024,
        sizeFormatted: '1.00 KB',
        status: 'valid',
        flags: [],
        url: '/uploads/images/test.png',
        storagePath: '/path/to/storage/test.png',
        integrity: { sha256: 'abc123' },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      }

      await testStorage.save('file-1', testFile)
      const files = await fileStore.getAll()
      
      expect(Object.keys(files)).toContain('file-1')
      expect(files['file-1'].name).toBe('test.png')
    })
  })

  describe('get', () => {
    it('should return undefined for non-existent file', async () => {
      const file = await fileStore.get('non-existent')
      expect(file).toBeUndefined()
    })

    it('should return file by id', async () => {
      const testFile: FileItem = {
        id: 'file-2',
        name: 'test.jpg',
        originalName: 'test.jpg',
        category: 'image',
        mimeType: 'image/jpeg',
        extension: '.jpg',
        size: 2048,
        sizeFormatted: '2.00 KB',
        status: 'valid',
        flags: [],
        url: '/uploads/images/test.jpg',
        storagePath: '/path/to/storage/test.jpg',
        integrity: { sha256: 'def456' },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      }

      await testStorage.save('file-2', testFile)
      const file = await fileStore.get('file-2')
      
      expect(file).toBeDefined()
      expect(file?.name).toBe('test.jpg')
      expect(file?.size).toBe(2048)
    })
  })

  describe('save', () => {
    it('should save a new file', async () => {
      const testFile: FileItem = {
        id: 'file-3',
        name: 'test.pdf',
        originalName: 'test.pdf',
        category: 'document',
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: 4096,
        sizeFormatted: '4.00 KB',
        status: 'valid',
        flags: [],
        url: '/uploads/documents/test.pdf',
        storagePath: '/path/to/storage/test.pdf',
        integrity: { sha256: 'ghi789' },
        metadata: { title: 'Test Document' },
        tags: ['test'],
        uploadedBy: 'user-2',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      }

      await fileStore.save('file-3', testFile)
      const retrieved = await fileStore.get('file-3')
      
      expect(retrieved).toBeDefined()
      expect(retrieved?.name).toBe('test.pdf')
      expect(retrieved?.metadata).toEqual({ title: 'Test Document' })
    })

    it('should update existing file', async () => {
      const testFile: FileItem = {
        id: 'file-4',
        name: 'original.txt',
        originalName: 'original.txt',
        category: 'other',
        mimeType: 'text/plain',
        extension: '.txt',
        size: 100,
        sizeFormatted: '100.00 B',
        status: 'valid',
        flags: [],
        url: '/uploads/other/original.txt',
        storagePath: '/path/to/storage/original.txt',
        integrity: { sha256: 'jkl012' },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      }

      await fileStore.save('file-4', testFile)
      
      // Update the file
      const updatedFile = { ...testFile, name: 'updated.txt', size: 200 }
      await fileStore.save('file-4', updatedFile)
      
      const retrieved = await fileStore.get('file-4')
      expect(retrieved?.name).toBe('updated.txt')
      expect(retrieved?.size).toBe(200)
    })
  })

  describe('delete', () => {
    it('should delete a file', async () => {
      const testFile: FileItem = {
        id: 'file-5',
        name: 'delete-me.txt',
        originalName: 'delete-me.txt',
        category: 'other',
        mimeType: 'text/plain',
        extension: '.txt',
        size: 50,
        sizeFormatted: '50.00 B',
        status: 'valid',
        flags: [],
        url: '/uploads/other/delete-me.txt',
        storagePath: '/path/to/storage/delete-me.txt',
        integrity: { sha256: 'mno345' },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      }

      await testStorage.save('file-5', testFile)
      
      // Verify file exists
      let file = await fileStore.get('file-5')
      expect(file).toBeDefined()
      
      // Delete the file
      await fileStore.delete('file-5')
      
      // Verify file is deleted
      file = await fileStore.get('file-5')
      expect(file).toBeUndefined()
    })
  })

  describe('findByUrl', () => {
    it('should return undefined when no files exist', async () => {
      const file = await fileStore.findByUrl('/uploads/images/test.png')
      expect(file).toBeUndefined()
    })

    it('should find file by URL', async () => {
      const testFile: FileItem = {
        id: 'file-6',
        name: 'find-me.png',
        originalName: 'find-me.png',
        category: 'image',
        mimeType: 'image/png',
        extension: '.png',
        size: 500,
        sizeFormatted: '500.00 B',
        status: 'valid',
        flags: [],
        url: '/uploads/images/find-me.png',
        storagePath: '/path/to/storage/find-me.png',
        integrity: { sha256: 'pqr678' },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      }

      await testStorage.save('file-6', testFile)
      
      const file = await fileStore.findByUrl('/uploads/images/find-me.png')
      expect(file).toBeDefined()
      expect(file?.id).toBe('file-6')
    })

    it('should return undefined for non-matching URL', async () => {
      const testFile: FileItem = {
        id: 'file-7',
        name: 'other.png',
        originalName: 'other.png',
        category: 'image',
        mimeType: 'image/png',
        extension: '.png',
        size: 500,
        sizeFormatted: '500.00 B',
        status: 'valid',
        flags: [],
        url: '/uploads/images/other.png',
        storagePath: '/path/to/storage/other.png',
        integrity: { sha256: 'stu901' },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      }

      await testStorage.save('file-7', testFile)
      
      const file = await fileStore.findByUrl('/uploads/images/non-existent.png')
      expect(file).toBeUndefined()
    })
  })

  describe('findByCategory', () => {
    it('should return empty array when no files exist', async () => {
      const files = await fileStore.findByCategory('image')
      expect(files).toEqual([])
    })

    it('should find files by category', async () => {
      const imageFile: FileItem = {
        id: 'file-8',
        name: 'img.png',
        originalName: 'img.png',
        category: 'image',
        mimeType: 'image/png',
        extension: '.png',
        size: 100,
        sizeFormatted: '100.00 B',
        status: 'valid',
        flags: [],
        url: '/uploads/images/img.png',
        storagePath: '/path/to/storage/img.png',
        integrity: { sha256: 'vwx234' },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      }

      const docFile: FileItem = {
        id: 'file-9',
        name: 'doc.pdf',
        originalName: 'doc.pdf',
        category: 'document',
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: 200,
        sizeFormatted: '200.00 B',
        status: 'valid',
        flags: [],
        url: '/uploads/documents/doc.pdf',
        storagePath: '/path/to/storage/doc.pdf',
        integrity: { sha256: 'yza567' },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      }

      await testStorage.save('file-8', imageFile)
      await testStorage.save('file-9', docFile)
      
      const imageFiles = await fileStore.findByCategory('image')
      expect(imageFiles.length).toBe(1)
      expect(imageFiles[0].category).toBe('image')
      
      const docFiles = await fileStore.findByCategory('document')
      expect(docFiles.length).toBe(1)
      expect(docFiles[0].category).toBe('document')
    })
  })

  describe('findByStatus', () => {
    it('should return empty array when no files exist', async () => {
      const files = await fileStore.findByStatus('valid')
      expect(files).toEqual([])
    })

    it('should find files by status', async () => {
      const validFile: FileItem = {
        id: 'file-10',
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
        storagePath: '/path/to/storage/valid.png',
        integrity: { sha256: 'bcd890' },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      }

      const deletedFile: FileItem = {
        id: 'file-11',
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
        storagePath: '/path/to/storage/deleted.png',
        integrity: { sha256: 'efg123' },
        metadata: {},
        tags: [],
        uploadedBy: 'user-1',
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: Date.now(),
      }

      await testStorage.save('file-10', validFile)
      await testStorage.save('file-11', deletedFile)
      
      const validFiles = await fileStore.findByStatus('valid')
      expect(validFiles.length).toBe(1)
      expect(validFiles[0].status).toBe('valid')
      
      const deletedFiles = await fileStore.findByStatus('deleted')
      expect(deletedFiles.length).toBe(1)
      expect(deletedFiles[0].status).toBe('deleted')
    })
  })
})
