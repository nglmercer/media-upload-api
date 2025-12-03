import { describe, it, expect, beforeEach } from 'bun:test'
import { mediaStorage, ensureRecordForUrl } from '../src/store/mediaStore'
import type { MediaType } from '../src/store/types'
import path from 'path'
import { mkdir } from 'fs/promises'

describe('MediaStore', () => {
  beforeEach(async () => {
    // Ensure media directory exists
    const mediaDir = path.join(process.cwd(), 'media')
    await mkdir(mediaDir, { recursive: true })
  })

  describe('mediaStorage', () => {
    it('should save and load media items', async () => {
      const mediaItem = {
        id: 'test-id-1',
        type: 'image' as MediaType,
        url: '/uploads/images/test.jpg',
        name: 'test-image',
        size: 1024,
        metadata: { description: 'Test image' }
      }

      await mediaStorage.save('test-id-1', mediaItem)
      const loaded = await mediaStorage.load('test-id-1')

      expect(loaded).toEqual(mediaItem)
    })

    it('should return null for non-existent items', async () => {
      const loaded = await mediaStorage.load('non-existent-id')
      expect(loaded).toBeNull()
    })

    it('should get all media items', async () => {
      const item1 = {
        id: 'test-id-1',
        type: 'image' as MediaType,
        url: '/uploads/images/test1.jpg',
        name: 'test-image-1'
      }
      const item2 = {
        id: 'test-id-2',
        type: 'video' as MediaType,
        url: '/uploads/videos/test2.mp4',
        name: 'test-video-2'
      }

      await mediaStorage.save('test-id-1', item1)
      await mediaStorage.save('test-id-2', item2)
      
      const all = await mediaStorage.getAll()
      
      expect(all).toEqual({
        'test-id-1': item1,
        'test-id-2': item2
      })
    })

    it('should delete media items', async () => {
      const mediaItem = {
        id: 'test-id-1',
        type: 'image' as MediaType,
        url: '/uploads/images/test.jpg',
        name: 'test-image'
      }

      await mediaStorage.save('test-id-1', mediaItem)
      await mediaStorage.delete('test-id-1')
      
      const loaded = await mediaStorage.load('test-id-1')
      expect(loaded).toBeNull()
    })
  })

  describe('ensureRecordForUrl', () => {
    it('should create a new record for URL', async () => {
      const params = {
        type: 'image' as MediaType,
        url: '/uploads/images/new-image.jpg',
        name: 'new-image',
        metadata: { tags: ['test'] }
      }

      const record = await ensureRecordForUrl(params)

      expect(record.type).toBe('image')
      expect(record.url).toBe('/uploads/images/new-image.jpg')
      expect(record.name).toBe('new-image')
      expect(record.metadata).toEqual({ tags: ['test'] })
      expect(record.id).toBeDefined()

      // Should be persisted
      const loaded = await mediaStorage.load(record.id)
      expect(loaded).toEqual(record)
    })

    it('should return existing record for URL', async () => {
      const params = {
        type: 'video' as MediaType,
        url: '/uploads/videos/existing-video.mp4',
        name: 'existing-video'
      }

      const record1 = await ensureRecordForUrl(params)
      const record2 = await ensureRecordForUrl(params)

      expect(record1.id).toBe(record2.id)
      expect(record1).toEqual(record2)
    })

    it('should use basename as default name', async () => {
      const params = {
        type: 'audio' as MediaType,
        url: '/uploads/audios/test-audio.mp3'
      }

      const record = await ensureRecordForUrl(params)
      expect(record.name).toBe('test-audio.mp3')
    })

    it('should use empty metadata as default', async () => {
      const params = {
        type: 'subtitle' as MediaType,
        url: '/uploads/subtitles/test-sub.vtt'
      }

      const record = await ensureRecordForUrl(params)
      expect(record.metadata).toEqual({})
    })
  })
})
