import { Hono } from 'hono'
import { mediaRouter } from '../../src/routers/media'

import { createConfigFile } from '../../src/config'
import path from 'path'
import { mkdir, rm } from 'fs/promises'
import { DataStorage } from 'json-obj-manager'
import { JSONFileAdapter } from 'json-obj-manager/node'

export async function createTestApp(): Promise<{ app: Hono; testStorage: any; originalStorage: any }> {
  // Create a fresh media storage instance for each test
  const testMediaPath = path.join(process.cwd(), 'media', 'test-media.json')
  const testStorage = new DataStorage(
    new JSONFileAdapter(testMediaPath)
  )

  // Override global mediaStorage temporarily
  const { mediaStorage } = await import('../../src/store/mediaStore')
  const originalStorage = mediaStorage

  const app = new Hono()
  app.route('/api/media', mediaRouter)
  app.get('/api/media/data', async (c) => {
    const data = await testStorage.getAll()
    return c.json(data)
  })

  return { app, testStorage, originalStorage }
}

export async function setupTestEnvironment(): Promise<void> {
  // Clean up everything first
  await cleanupTestEnvironment()

  // Setup config
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
}

export async function cleanupTestEnvironment(): Promise<void> {
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
}

export function createMockFile(type: string, name?: string): File {
  const mockData = {
    'image/png': new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), // PNG header
    'image/jpeg': new Uint8Array([255, 216, 255]), // JPEG header
    'video/mp4': new Uint8Array([0, 0, 0, 32, 102, 116, 121, 112]), // MP4 header
    'video/webm': new Uint8Array([26, 69, 223, 163]), // WebM header
    'audio/mpeg': new Uint8Array([73, 68, 51]), // MP3 header
    'audio/wav': new Uint8Array([82, 73, 70, 70]), // WAV header
    'text/vtt': new Uint8Array([87, 69, 66, 86, 84, 84]), // WEBVTT header
    'application/x-subrip': new Uint8Array([49]), // SRT header
  }

  const mimeType = mockData[type as keyof typeof mockData] || new Uint8Array([1, 2, 3])
  const fileName = name || `test.${type.split('/')[1]}`

  return new File([mimeType], fileName, { type })
}

export async function createFormDataWithFile(file: File, metadata?: Record<string, any>): Promise<FormData> {
  const formData = new FormData()
  formData.append('file', file)

  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata))
  }

  return formData
}
