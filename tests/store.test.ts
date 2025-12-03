import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import path from 'path'
import { mkdir, rm, writeFile } from 'fs/promises'

const TEST_MEDIA_FILE = path.join(process.cwd(), "media/media_store.json");
const TEST_UPLOADS_DIR = path.join(process.cwd(), "uploads_store");

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
const MediaStoreModule = await import('../src/store/mediaStore');
const { default: MediaType } = await import('../src/store/types');

describe('MediaStore', () => {
  beforeEach(async () => {
    // Clean up
    await rm(path.dirname(TEST_MEDIA_FILE), { recursive: true, force: true })
    await mkdir(path.dirname(TEST_MEDIA_FILE), { recursive: true })
    await writeFile(TEST_MEDIA_FILE, '{}')

    // Reset storage instance
    try {
      const { DataStorage } = await import('json-obj-manager')
      const { JSONFileAdapter } = await import('json-obj-manager/node')
      MediaStoreModule.setMediaStorage(new DataStorage(new JSONFileAdapter(TEST_MEDIA_FILE)))
    } catch { }
  })

  afterEach(async () => {
    await rm(path.dirname(TEST_MEDIA_FILE), { recursive: true, force: true })
  })

  describe('mediaStorage', () => {
    it('should save and load media items', async () => {
      const mediaItem = {
        id: 'test-id-1',
        type: 'image',
        url: '/uploads/images/test.jpg',
        name: 'test-image',
        size: 1024,
        metadata: { description: 'Test image' }
      }

      await MediaStoreModule.mediaStorage.save('test-id-1', mediaItem)
      const loaded = await MediaStoreModule.mediaStorage.load('test-id-1')

      expect(loaded).toEqual(mediaItem)
    })

    it('should return null for non-existent items', async () => {
      const loaded = await MediaStoreModule.mediaStorage.load('non-existent-id')
      expect(loaded).toBeNull()
    })

    it('should get all media items', async () => {
      const item1 = {
        id: 'test-id-1',
        type: 'image',
        url: '/uploads/images/test1.jpg',
        name: 'test-image-1'
      }
      const item2 = {
        id: 'test-id-2',
        type: 'video',
        url: '/uploads/videos/test2.mp4',
        name: 'test-video-2'
      }

      await MediaStoreModule.mediaStorage.save('test-id-1', item1)
      await MediaStoreModule.mediaStorage.save('test-id-2', item2)

      const all = await MediaStoreModule.mediaStorage.getAll()

      expect(all).toEqual({
        'test-id-1': item1,
        'test-id-2': item2
      })
    })

    it('should delete media items', async () => {
      const mediaItem = {
        id: 'test-id-1',
        type: 'image',
        url: '/uploads/images/test.jpg',
        name: 'test-image'
      }

      await MediaStoreModule.mediaStorage.save('test-id-1', mediaItem)
      await MediaStoreModule.mediaStorage.delete('test-id-1')

      const loaded = await MediaStoreModule.mediaStorage.load('test-id-1')
      expect(loaded).toBeNull()
    })
  })

  describe('ensureRecordForUrl', () => {
    it('should create a new record for URL', async () => {
      const params = {
        type: 'image',
        url: '/uploads/images/new-image.jpg',
        name: 'new-image',
        metadata: { tags: ['test'] }
      }

      const record = await MediaStoreModule.ensureRecordForUrl(params)

      expect(record.type).toBe('image')
      expect(record.url).toBe('/uploads/images/new-image.jpg')
      expect(record.name).toBe('new-image')
      expect(record.metadata).toEqual({ tags: ['test'] })
      expect(record.id).toBeDefined()

      // Should be persisted
      const loaded = await MediaStoreModule.mediaStorage.load(record.id)
      expect(loaded).toEqual(record)
    })

    it('should return existing record for URL', async () => {
      const params = {
        type: 'video',
        url: '/uploads/videos/existing-video.mp4',
        name: 'existing-video'
      }

      const record1 = await MediaStoreModule.ensureRecordForUrl(params)
      const record2 = await MediaStoreModule.ensureRecordForUrl(params)

      expect(record1.id).toBe(record2.id)
      expect(record1).toEqual(record2)
    })

    it('should use basename as default name', async () => {
      const params = {
        type: 'audio',
        url: '/uploads/audios/test-audio.mp3'
      }

      const record = await MediaStoreModule.ensureRecordForUrl(params)
      expect(record.name).toBe('test-audio.mp3')
    })

    it('should use empty metadata as default', async () => {
      const params = {
        type: 'subtitle',
        url: '/uploads/subtitles/test-sub.vtt'
      }

      const record = await MediaStoreModule.ensureRecordForUrl(params)
      expect(record.metadata).toEqual({})
    })
  })
})
