import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import path from 'path'
import { mkdir, rm, writeFile } from 'fs/promises'

const TEST_MEDIA_FILE = path.join(process.cwd(), "media/media_router.json");
const TEST_UPLOADS_DIR = path.join(process.cwd(), "uploads_router");

mock.module("../src/config", () => ({
  loadConfig: () => ({
    port: 0,
    host: "localhost",
    uploadsDir: TEST_UPLOADS_DIR,
    mediaFile: TEST_MEDIA_FILE
  }),
  createConfigFile: () => { },
  saveConfig: () => { }
}));

// Dynamic imports
const { mediaRouter } = await import('../src/routers/media');
const MediaStoreModule = await import('../src/store/mediaStore');

// Global setup and cleanup for all tests
beforeEach(async () => {
  // Clean up any existing data
  await rm(TEST_UPLOADS_DIR, { recursive: true, force: true });
  await rm(path.dirname(TEST_MEDIA_FILE), { recursive: true, force: true });

  // Create necessary directories
  const testDirs = [
    TEST_UPLOADS_DIR,
    path.join(TEST_UPLOADS_DIR, 'images'),
    path.join(TEST_UPLOADS_DIR, 'videos'),
    path.join(TEST_UPLOADS_DIR, 'audios'),
    path.join(TEST_UPLOADS_DIR, 'subtitles'),
    path.dirname(TEST_MEDIA_FILE)
  ];
  for (const dir of testDirs) {
    await mkdir(dir, { recursive: true })
  }

  // Clear media storage cache by accessing it after creating empty file
  try {
    // Force reload by creating new storage instance
    const { DataStorage } = await import('json-obj-manager')
    const { JSONFileAdapter } = await import('json-obj-manager/node')
    // This will create a new instance with fresh data
    MediaStoreModule.setMediaStorage(new DataStorage(new JSONFileAdapter(TEST_MEDIA_FILE)))
  } catch {
    // Storage doesn't exist yet, that's fine
  }
})

afterEach(async () => {
  // Clean up after each test
  await rm(TEST_UPLOADS_DIR, { recursive: true, force: true });
  await rm(path.dirname(TEST_MEDIA_FILE), { recursive: true, force: true });

  await mkdir(path.dirname(TEST_MEDIA_FILE), { recursive: true })
  await writeFile(TEST_MEDIA_FILE, '{}')
})

const PNG_HEADER = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130])
const MP4_HEADER = new Uint8Array([0, 0, 0, 32, 102, 116, 121, 112, 109, 112, 52, 50])
const WAV_HEADER = new Uint8Array([82, 73, 70, 70, 36, 0, 0, 0, 87, 65, 86, 69])
const VTT_HEADER = new Uint8Array([87, 69, 66, 86, 84, 84, 10, 10])

describe('Media Router', () => {

  describe('POST /upload/:type', () => {

    it('should upload an image file successfully', async () => {
      // Create a mock image file
      const file = new File([PNG_HEADER], 'test.png', { type: 'image/png' })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', 'Test Image')
      formData.append('metadata', JSON.stringify({ tags: ['test', 'image'] }))

      const request = new Request('http://localhost:3000/upload/image', {
        method: 'POST',
        body: formData
      })

      const response = await mediaRouter.request(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.type).toBe('image')
      expect(data.name).toBe('Test Image')
      expect(data.metadata).toEqual({ tags: ['test', 'image'] })
      expect(data.id).toBeDefined()
      expect(data.url).toMatch(/^\/uploads\/images\/[\w-]+\.png$/)
      expect(data.size).toBeGreaterThan(0)
      expect(data.sizeFormatted).toBeDefined()
    })

    it('should upload a video file successfully', async () => {
      const file = new File([MP4_HEADER], 'test.mp4', { type: 'video/mp4' })

      const formData = new FormData()
      formData.append('file', file)

      const request = new Request('http://localhost:3000/upload/video', {
        method: 'POST',
        body: formData
      })

      const response = await mediaRouter.request(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.type).toBe('video')
      expect(data.url).toMatch(/^\/uploads\/videos\/[\w-]+\.mp4$/)
    })

    it('should upload an audio file successfully', async () => {
      const file = new File([WAV_HEADER], 'test.wav', { type: 'audio/wav' })

      const formData = new FormData()
      formData.append('file', file)

      const request = new Request('http://localhost:3000/upload/audio', {
        method: 'POST',
        body: formData
      })

      const response = await mediaRouter.request(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.type).toBe('audio')
      expect(data.url).toMatch(/^\/uploads\/audios\/[\w-]+\.wav$/)
    })

    it('should upload a subtitle file successfully', async () => {
      const file = new File([VTT_HEADER], 'test.vtt', { type: 'text/vtt' })

      const formData = new FormData()
      formData.append('file', file)

      const request = new Request('http://localhost:3000/upload/subtitle', {
        method: 'POST',
        body: formData
      })

      const response = await mediaRouter.request(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.type).toBe('subtitle')
      expect(data.url).toMatch(/^\/uploads\/subtitles\/[\w-]+\.vtt$/)
    })

    it('should upload a text file successfully', async () => {
      const file = new File(['Some text content'], 'test.txt', { type: 'text/plain' })

      const formData = new FormData()
      formData.append('file', file)

      const request = new Request('http://localhost:3000/upload/text', {
        method: 'POST',
        body: formData
      })

      const response = await mediaRouter.request(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.type).toBe('text')
      expect(data.url).toMatch(/^\/uploads\/texts\/[\w-]+\.txt$/)
    })

    it('should reject invalid media type', async () => {
      const formData = new FormData()
      formData.append('file', new File(['test'], 'test.txt', { type: 'text/plain' }))

      const request = new Request('http://localhost:3000/upload/invalid', {
        method: 'POST',
        body: formData
      })

      const response = await mediaRouter.request(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid media type')
    })

    it('should reject missing file', async () => {
      const formData = new FormData()

      const request = new Request('http://localhost:3000/upload/image', {
        method: 'POST',
        body: formData
      })

      const response = await mediaRouter.request(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing file field')
    })

    it('should reject file type mismatch', async () => {
      const formData = new FormData()
      formData.append('file', new File(['test'], 'test.txt', { type: 'text/plain' }))

      const request = new Request('http://localhost:3000/upload/image', {
        method: 'POST',
        body: formData
      })

      const response = await mediaRouter.request(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('does not match type')
    })

    it('should reject invalid metadata JSON', async () => {
      const file = new File([PNG_HEADER], 'test.png', { type: 'image/png' })
      const formData = new FormData()
      formData.append('file', file)
      formData.append('metadata', 'invalid json')

      const request = new Request('http://localhost:3000/upload/image', {
        method: 'POST',
        body: formData
      })

      const response = await mediaRouter.request(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid metadata JSON')
    })
  })

  describe('DELETE /:id', () => {
    it('should delete media successfully', async () => {
      // First upload a file
      const file = new File([PNG_HEADER], 'test.png', { type: 'image/png' })
      const formData = new FormData()
      formData.append('file', file)

      const uploadRequest = new Request('http://localhost:3000/upload/image', {
        method: 'POST',
        body: formData
      })

      const uploadResponse = await mediaRouter.request(uploadRequest)
      const uploadData = await uploadResponse.json()

      // Then delete it
      const deleteRequest = new Request(`http://localhost:3000/${uploadData.id}`, {
        method: 'DELETE'
      })

      const deleteResponse = await mediaRouter.request(deleteRequest)
      const deleteData = await deleteResponse.json()

      expect(deleteResponse.status).toBe(200)
      expect(deleteData.message).toContain('deleted successfully')
    })

    it('should return 404 for non-existent media', async () => {
      const request = new Request('http://localhost:3000/non-existent-id', {
        method: 'DELETE'
      })

      const response = await mediaRouter.request(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Media not found')
    })
  })

  describe('GET /data/:type', () => {
    it('should return empty array for type with no media', async () => {
      const request = new Request('http://localhost:3000/data/video')
      const response = await mediaRouter.request(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(0)
    })

    it('should return media by type', async () => {
      // Upload an image first
      const file = new File([PNG_HEADER], 'test.png', { type: 'image/png' })
      const formData = new FormData()
      formData.append('file', file)

      const uploadRequest = new Request('http://localhost:3000/upload/image', {
        method: 'POST',
        body: formData
      })

      await mediaRouter.request(uploadRequest)

      // Get images
      const getRequest = new Request('http://localhost:3000/data/image')
      const response = await mediaRouter.request(getRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
      expect(data[0].type).toBe('image')
    })

    it('should reject invalid type', async () => {
      const request = new Request('http://localhost:3000/data/invalid')
      const response = await mediaRouter.request(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid media type')
    })
  })

  describe('GET /stats', () => {
    it('should return media statistics', async () => {
      const request = new Request('http://localhost:3000/stats')
      const response = await mediaRouter.request(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.total).toBeDefined()
      expect(data.total.count).toBeDefined()
      expect(data.total.size).toBeDefined()
      expect(data.total.sizeFormatted).toBeDefined()
      expect(data.byType).toBeDefined()
      expect(data.byType.image).toBeDefined()
      expect(data.byType.video).toBeDefined()
      expect(data.byType.audio).toBeDefined()
      expect(data.byType.subtitle).toBeDefined()
      expect(data.byType.text).toBeDefined()
    })
  })

  describe('GET /:id/size', () => {
    it('should return file size for existing media', async () => {
      // Upload a file first
      const file = new File([PNG_HEADER], 'test.png', { type: 'image/png' })
      const formData = new FormData()
      formData.append('file', file)

      const uploadRequest = new Request('http://localhost:3000/upload/image', {
        method: 'POST',
        body: formData
      })

      const uploadResponse = await mediaRouter.request(uploadRequest)
      const uploadData = await uploadResponse.json()

      // Get file size
      const sizeRequest = new Request(`http://localhost:3000/${uploadData.id}/size`)
      const response = await mediaRouter.request(sizeRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(uploadData.id)
      expect(data.size).toBeDefined()
      expect(data.sizeFormatted).toBeDefined()
    })

    it('should return 404 for non-existent media', async () => {
      const request = new Request('http://localhost:3000/non-existent-id/size')
      const response = await mediaRouter.request(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Media not found')
    })
  })

  describe('GET /:id', () => {
    it('should return media details for existing media', async () => {
      // Upload a file first
      const file = new File([PNG_HEADER], 'test.png', { type: 'image/png' })
      const formData = new FormData()
      formData.append('file', file)

      const uploadRequest = new Request('http://localhost:3000/upload/image', {
        method: 'POST',
        body: formData
      })

      const uploadResponse = await mediaRouter.request(uploadRequest)
      const uploadData = await uploadResponse.json()

      // Get media details
      const getRequest = new Request(`http://localhost:3000/${uploadData.id}`)
      const response = await mediaRouter.request(getRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(uploadData.id)
      expect(data.type).toBe('image')
      expect(data.url).toBeDefined()
    })

    it('should return 404 for non-existent media', async () => {
      const request = new Request('http://localhost:3000/non-existent-id')
      const response = await mediaRouter.request(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Media not found')
    })
  })

  describe('POST /sync', () => {
    it('should sync media files', async () => {
      const request = new Request('http://localhost:3000/sync', {
        method: 'POST'
      })

      const response = await mediaRouter.request(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('Sync completed')
      expect(data.added).toBeDefined()
      expect(data.details).toBeDefined()
    })
  })
})
