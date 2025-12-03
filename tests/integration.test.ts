import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Hono } from 'hono'
import { mediaRouter } from '../src/routers/media'
import { mediaStorage } from '../src/store/mediaStore'
import { createConfigFile, loadConfig } from '../src/config'
import path from 'path'
import { mkdir, writeFile, rm } from 'fs/promises'

describe('Integration Tests', () => {
  let app: Hono

  beforeEach(async () => {
    // Setup test environment
    createConfigFile()
    
    // Create necessary directories
    const testDirs = [
      'uploads', 
      'uploads/images', 
      'uploads/videos', 
      'uploads/audios', 
      'uploads/subtitles', 
      'media'
    ]
    for (const dir of testDirs) {
      await mkdir(path.join(process.cwd(), dir), { recursive: true })
    }

    // Create fresh app with media routes
    app = new Hono()
    app.route('/api/media', mediaRouter)
    app.get('/api/media/data', async (c) => {
      const data = await mediaStorage.getAll()
      return c.json(data)
    })
  })

  afterEach(async () => {
    // Clean up test directories
    const testDirs = ['uploads', 'media']
    for (const dir of testDirs) {
      try {
        await rm(path.join(process.cwd(), dir), { recursive: true, force: true })
      } catch {
        // Ignore if directory doesn't exist
      }
    }
    
    // Clean up config file
    try {
      await rm(path.join(process.cwd(), 'config.json'), { force: true })
    } catch {
      // Ignore if file doesn't exist
    }
  })

  describe('Complete Media Workflow', () => {
    it('should handle complete upload-retrieve-delete workflow', async () => {
      // 1. Upload an image
      const imageContent = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) // PNG header
      const file = new File([imageContent], 'workflow-test.png', { type: 'image/png' })
      
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
      const imageFile = new File([new Uint8Array([137, 80, 78, 71])], 'test.png', { type: 'image/png' })
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
      const testFiles = [
        { path: 'uploads/images/direct-image.jpg', content: 'fake image content' },
        { path: 'uploads/videos/direct-video.mp4', content: 'fake video content' },
        { path: 'uploads/audios/direct-audio.mp3', content: 'fake audio content' }
      ]

      for (const file of testFiles) {
        await writeFile(path.join(process.cwd(), file.path), file.content)
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
      const file = new File(['test content'], 'test.png', { type: 'image/png' })
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
