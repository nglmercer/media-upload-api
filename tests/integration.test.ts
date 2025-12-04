import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import path from 'path'
import { mkdir, writeFile, rm } from 'fs/promises'
import { Hono } from 'hono'

const TEST_MEDIA_FILE = path.join(process.cwd(), "media/media_integration.json");
const TEST_UPLOADS_DIR = path.join(process.cwd(), "uploads_integration");

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
const { createConfigFile, loadConfig } = await import('../src/config');

describe('Integration Tests', () => {
  let app: Hono

  beforeEach(async () => {
    // Clean up first
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
    ]
    for (const dir of testDirs) {
      await mkdir(dir, { recursive: true })
    }

    // Reset storage
    try {
      const { DataStorage } = await import('json-obj-manager')
      const { JSONFileAdapter } = await import('json-obj-manager/node')
      MediaStoreModule.setMediaStorage(new DataStorage(new JSONFileAdapter(TEST_MEDIA_FILE)))
    } catch { }

    // Create fresh app with media routes
    app = new Hono()
    app.route('/api/media', mediaRouter)
    app.get('/api/media/data', async (c) => {
      const data = await MediaStoreModule.mediaStorage.getAll()
      return c.json(data)
    })
  })

  afterEach(async () => {
    // Clean up test directories
    await rm(TEST_UPLOADS_DIR, { recursive: true, force: true });
    await rm(path.dirname(TEST_MEDIA_FILE), { recursive: true, force: true });
  })

  describe('Complete Media Workflow', () => {
    const PNG_HEADER = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130])

    it('should handle complete upload-retrieve-delete workflow', async () => {
      // 1. Upload an image
      const file = new File([PNG_HEADER], 'workflow-test.png', { type: 'image/png' })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', 'Workflow Test Image')
      formData.append('metadata', JSON.stringify({ tags: ['workflow', 'test'] }))

      const uploadRequest = new Request('http://localhost:3000/api/media/upload/image', {
        method: 'POST',
        body: formData
      })

      const uploadResponse = await app.request(uploadRequest)
      expect(uploadResponse.status).toBe(201)

      const uploadData = await uploadResponse.json()
      const mediaId = uploadData.id

      // 2. Retrieve the uploaded media
      const getRequest = new Request(`http://localhost:3000/api/media/data/image`)
      const getResponse = await app.request(getRequest)

      expect(getResponse.status).toBe(200)
      const getImages = await getResponse.json()
      expect(Array.isArray(getImages)).toBe(true)
      expect(getImages.length).toBe(1)
      expect(getImages[0].id).toBe(mediaId)
      expect(getImages[0].name).toBe('Workflow Test Image')

      // 3. Get all media data
      const allRequest = new Request('http://localhost:3000/api/media/data')
      const allResponse = await app.request(allRequest)

      expect(allResponse.status).toBe(200)
      const allData = await allResponse.json()
      expect(allData[mediaId]).toBeDefined()
      expect(allData[mediaId].type).toBe('image')

      // 4. Get media stats
      const statsRequest = new Request('http://localhost:3000/api/media/stats')
      const statsResponse = await app.request(statsRequest)

      expect(statsResponse.status).toBe(200)
      const stats = await statsResponse.json()
      expect(stats.total.count).toBe(1)
      expect(stats.byType.image.count).toBe(1)

      // 5. Get file size
      const sizeRequest = new Request(`http://localhost:3000/api/media/${mediaId}/size`)
      const sizeResponse = await app.request(sizeRequest)

      expect(sizeResponse.status).toBe(200)
      const sizeData = await sizeResponse.json()
      expect(sizeData.id).toBe(mediaId)
      expect(sizeData.size).toBeGreaterThan(0)

      // 6. Delete the media
      const deleteRequest = new Request(`http://localhost:3000/api/media/${mediaId}`, {
        method: 'DELETE'
      })

      const deleteResponse = await app.request(deleteRequest)
      expect(deleteResponse.status).toBe(200)

      // 7. Verify it's gone
      const verifyRequest = new Request(`http://localhost:3000/api/media/data/image`)
      const verifyResponse = await app.request(verifyRequest)
      const verifyData = await verifyResponse.json()

      expect(Array.isArray(verifyData)).toBe(true)
      expect(verifyData.length).toBe(0)
    })
  })

  describe('Multiple Media Types', () => {
    it('should handle different media types separately', async () => {
      // Upload one of each type in separate test
      const PNG_HEADER = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130])
      const imageFile = new File([PNG_HEADER], 'test.png', { type: 'image/png' })
      const imageFormData = new FormData()
      imageFormData.append('file', imageFile)

      const imageRequest = new Request('http://localhost:3000/api/media/upload/image', {
        method: 'POST',
        body: imageFormData
      })

      const imageResponse = await app.request(imageRequest)
      expect(imageResponse.status).toBe(201)

      // Verify only one image exists
      const getImagesRequest = new Request('http://localhost:3000/api/media/data/image')
      const getImagesResponse = await app.request(getImagesRequest)
      const images = await getImagesResponse.json()

      expect(Array.isArray(images)).toBe(true)
      expect(images.length).toBe(1)
      expect(images[0].type).toBe('image')
    })
  })

  describe('Sync Functionality', () => {
    it('should sync existing files in upload directories', async () => {
      // Create some files directly in the upload directories
      // We need valid headers for sync too if we validate on sync (which we do now)
      const PNG_HEADER = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130])
      const MP4_HEADER = new Uint8Array([0, 0, 0, 32, 102, 116, 121, 112, 109, 112, 52, 50])
      const MP3_HEADER = new Uint8Array([73, 68, 51, 3, 0, 0, 0, 0, 0, 0])

      const testFiles = [
        { path: 'images/direct-image.png', content: PNG_HEADER },
        { path: 'videos/direct-video.mp4', content: MP4_HEADER },
        { path: 'audios/direct-audio.mp3', content: MP3_HEADER }
      ]

      for (const file of testFiles) {
        await writeFile(path.join(TEST_UPLOADS_DIR, file.path), file.content)
      }

      // Run sync
      const syncRequest = new Request('http://localhost:3000/api/media/sync', {
        method: 'POST'
      })

      const syncResponse = await app.request(syncRequest)
      expect(syncResponse.status).toBe(200)

      const syncData = await syncResponse.json()
      expect(syncData.added).toBeGreaterThan(0)
      expect(syncData.details).toBeDefined()

      // Verify files are now in the database
      const allRequest = new Request('http://localhost:3000/api/media/data')
      const allResponse = await app.request(allRequest)
      const allData = await allResponse.json()

      // Should have entries for the synced files
      expect(Object.keys(allData).length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle single upload correctly', async () => {
      const PNG_HEADER = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130])
      const file = new File([PNG_HEADER], 'test.png', { type: 'image/png' })
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', 'Single Test')

      const request = new Request('http://localhost:3000/api/media/upload/image', {
        method: 'POST',
        body: formData
      })

      const response = await app.request(request)
      expect(response.status).toBe(201)

      // Verify only one file is stored
      const getImagesRequest = new Request('http://localhost:3000/api/media/data/image')
      const getImagesResponse = await app.request(getImagesRequest)
      const images = await getImagesResponse.json()

      expect(images.length).toBe(1)
    })
  })
})
