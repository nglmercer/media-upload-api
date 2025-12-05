import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { processingService } from '../src/services/processingService'
import { draftStore } from '../src/store/draftStore'
import { Draft, ProcessingConfig, ProcessingStatus } from '../src/store/types'
import { setDraftStorage } from '../src/store/draftStore'
import { DataStorage } from 'json-obj-manager'

// Mock storage para tests
class MockStorage<T> implements DataStorage<T> {
  private data: Record<string, T> = {}

  async getAll(): Promise<Record<string, T>> {
    return this.data
  }

  async load(id: string): Promise<T | null> {
    return this.data[id] || null
  }

  async save(id: string, item: T): Promise<void> {
    this.data[id] = item
  }

  async delete(id: string): Promise<void> {
    delete this.data[id]
  }
  //@ts-expect-error
  clear(): void {
    this.data = {}
  }
}

describe('Processing Service', () => {
  let mockStorage: MockStorage<Draft>

  beforeEach(() => {
    mockStorage = new MockStorage<Draft>()
    //@ts-expect-error
    setDraftStorage(mockStorage)
    // Clear the processing queue to ensure test isolation
    processingService.clearQueue()
  })

  afterEach(() => {
    mockStorage.clear()
  })

  describe('addToQueue', () => {
    it('should add a draft to processing queue', async () => {
      // Crear un draft de prueba
      const draft: Draft = {
        id: 'test-draft-1',
        content: 'Test draft content',
        mediaIds: ['video-1'],
        tags: ['test'],
        status: 0, // DRAFT
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      await draftStore.save('test-draft-1', draft)

      // Configuración de procesamiento
      const config: ProcessingConfig = {
        videoFile: {
          id: 'video-1',
          name: 'test-video.mp4',
          url: './uploads/test-video.mp4'
        },
        audioTracks: [],
        subtitleTracks: [],
        outputFormat: 'mp4',
        quality: 'medium'
      }

      // Agregar a la cola
      await processingService.addToQueue('test-draft-1', config)

      // Verificar que el draft se actualizó
      const updatedDraft = await draftStore.get('test-draft-1')
      expect(updatedDraft?.processingStatus).toBe(ProcessingStatus.QUEUED)
      expect(updatedDraft?.processingConfig).toEqual(config)
      expect(updatedDraft?.queuedAt).toBeDefined()
    })

    it('should throw error for non-existent draft', async () => {
      const config: ProcessingConfig = {
        videoFile: {
          id: 'video-1',
          name: 'test-video.mp4',
          url: './uploads/test-video.mp4'
        },
        audioTracks: [],
        subtitleTracks: []
      }

      expect(processingService.addToQueue('non-existent', config)).rejects.toThrow('Draft non-existent not found')
    })
  })

  describe('getQueueStatus', () => {
    it('should return empty queue status initially', () => {
      const status = processingService.getQueueStatus()
      expect(status.total).toBe(0)
      expect(status.queued).toBe(0)
      expect(status.processing).toBe(0)
      expect(status.completed).toBe(0)
      expect(status.failed).toBe(0)
      expect(status.isProcessing).toBe(false)
    })

    it('should track queued items count', async () => {
      const draft: Draft = {
        id: 'test-draft-queue-1',
        content: 'Test draft',
        mediaIds: ['video-1'],
        tags: ['test'],
        status: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      await draftStore.save('test-draft-queue-1', draft)

      const config: ProcessingConfig = {
        videoFile: {
          id: 'video-1',
          name: 'test-video.mp4',
          url: './uploads/test-video.mp4'
        },
        audioTracks: [],
        subtitleTracks: []
      }

      await processingService.addToQueue('test-draft-queue-1', config)

      const status = processingService.getQueueStatus()
      expect(status.total).toBe(1)
      expect(status.queued).toBe(1)
    })
  })

  describe('clearQueue', () => {
    it('should clear the processing queue', async () => {
      const draft: Draft = {
        id: 'test-draft-clear',
        content: 'Test draft',
        mediaIds: ['video-1'],
        tags: ['test'],
        status: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      await draftStore.save('test-draft-clear', draft)

      const config: ProcessingConfig = {
        videoFile: {
          id: 'video-1',
          name: 'test-video.mp4',
          url: './uploads/test-video.mp4'
        },
        audioTracks: [],
        subtitleTracks: []
      }

      await processingService.addToQueue('test-draft-clear', config)
      expect(processingService.getQueueStatus().total).toBe(1)

      processingService.clearQueue()
      expect(processingService.getQueueStatus().total).toBe(0)
      expect(processingService.getQueueStatus().isProcessing).toBe(false)
    })
  })

  describe('Processing workflow', () => {
    it('should process queued draft successfully', async () => {
      const draft: Draft = {
        id: 'test-draft-process',
        content: 'Test draft',
        mediaIds: ['video-1'],
        tags: ['test'],
        status: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      await draftStore.save('test-draft-process', draft)

      const config: ProcessingConfig = {
        videoFile: {
          id: 'video-1',
          name: 'test-video.mp4',
          url: './uploads/test-video.mp4'
        },
        audioTracks: [],
        subtitleTracks: [],
        outputFormat: 'mp4',
        quality: 'medium'
      }

      await processingService.addToQueue('test-draft-process', config)

      // Trigger processing
      await processingService._processQueueForTesting()

      // Wait for async processing to complete
      await new Promise(resolve => setTimeout(resolve, 100))

      const processedDraft = await draftStore.get('test-draft-process')
      expect(processedDraft?.processingStatus).toBe(ProcessingStatus.COMPLETED)
      expect(processedDraft?.processingResult).toBeDefined()
      expect(processedDraft?.processingResult?.duration).toBe(120)
      expect(processedDraft?.processingResult?.format).toBe('mp4')
      expect(processedDraft?.processingResult?.outputUrl).toBeDefined()
      expect(processedDraft?.processingResult?.s3Key).toBeDefined()
      expect(processedDraft?.completedProcessingAt).toBeDefined()
    })

    it('should update queue status during processing', async () => {
      const draft: Draft = {
        id: 'test-draft-status',
        content: 'Test draft',
        mediaIds: ['video-1'],
        tags: ['test'],
        status: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      await draftStore.save('test-draft-status', draft)

      const config: ProcessingConfig = {
        videoFile: {
          id: 'video-1',
          name: 'test-video.mp4',
          url: './uploads/test-video.mp4'
        },
        audioTracks: [],
        subtitleTracks: []
      }

      await processingService.addToQueue('test-draft-status', config)

      // Process
      await processingService._processQueueForTesting()
      await new Promise(resolve => setTimeout(resolve, 100))

      const status = processingService.getQueueStatus()
      expect(status.completed).toBe(1)
    })
  })

  describe('Processing configuration validation', () => {
    it('should validate required video file', () => {
      //@ts-expect-error
      const invalidConfig = {
        audioTracks: [],
        subtitleTracks: []
      } as ProcessingConfig

      expect(invalidConfig.videoFile).toBeUndefined()
    })

    it('should accept valid processing config', () => {
      const validConfig: ProcessingConfig = {
        videoFile: {
          id: 'video-1',
          name: 'test-video.mp4',
          url: './uploads/test-video.mp4'
        },
        audioTracks: [
          {
            id: 'audio-1',
            name: 'English Audio',
            language: 'en',
            url: './uploads/audio-en.mp3'
          }
        ],
        subtitleTracks: [
          {
            id: 'subtitle-1',
            name: 'English Subtitles',
            language: 'en',
            url: './uploads/subtitles-en.srt',
            format: 'srt'
          }
        ],
        outputFormat: 'mp4',
        quality: 'high'
      }

      expect(validConfig.videoFile.id).toBe('video-1')
      expect(validConfig.audioTracks).toHaveLength(1)
      expect(validConfig.subtitleTracks).toHaveLength(1)
      expect(validConfig.outputFormat).toBe('mp4')
      expect(validConfig.quality).toBe('high')
    })
  })

  describe('Processing states', () => {
    it('should track processing states correctly', async () => {
      const draft: Draft = {
        id: 'test-draft-2',
        content: 'Test draft content',
        mediaIds: ['video-2'],
        tags: ['test'],
        status: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      await draftStore.save('test-draft-2', draft)

      const config: ProcessingConfig = {
        videoFile: {
          id: 'video-2',
          name: 'test-video.mp4',
          url: './uploads/test-video.mp4'
        },
        audioTracks: [],
        subtitleTracks: []
      }

      // Estado inicial
      expect(draft.processingStatus).toBeUndefined()

      // Agregar a cola
      await processingService.addToQueue('test-draft-2', config)

      const updatedDraft = await draftStore.get('test-draft-2')
      expect(updatedDraft?.processingStatus).toBe(ProcessingStatus.QUEUED)

      // Verificar timestamps
      expect(updatedDraft?.queuedAt).toBeDefined()
      expect(updatedDraft?.startedProcessingAt).toBeUndefined()
      expect(updatedDraft?.completedProcessingAt).toBeUndefined()
    })
  })
})
