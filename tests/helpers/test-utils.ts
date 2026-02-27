import { Hono } from 'hono'
import { filesRouter } from '../../src/routers/files'

import { config } from '../../src/config'
import path from 'path'
import { mkdir, rm, writeFile } from 'fs/promises'
import { JsonManager } from 'json-obj-manager'
import { FileAdapter } from 'json-obj-manager/node'

export async function createTestApp(): Promise<{ app: Hono; testStorage: any; originalStorage: any }> {
  // Create a fresh file storage instance for each test
  const testMediaPath = path.join(process.cwd(), 'data', 'test-files.json')
  const testAdapter = new FileAdapter<any>(testMediaPath)
  const testStorage = new JsonManager<any>({
    adapter: testAdapter
  })

  // Note: We can't easily override the internal storage in the new structure
  // Tests would need to use the app directly

  const app = new Hono()
  app.route('/api/files', filesRouter)
  app.get('/api/files/data', async (c) => {
    const data = await testStorage.getAll()
    return c.json(data)
  })

  return { app, testStorage, originalStorage: null }
}

export async function setupTestEnvironment(): Promise<void> {
  // Clean up everything first
  await cleanupTestEnvironment()

  // Setup config - create default config file
  const configPath = path.join(process.cwd(), 'config.json')
  const defaultConfig = {
    server: {
      port: 3000,
      host: '0.0.0.0',
      uploadsDir: 'uploads',
      dataDir: 'data',
      maxFileSizeBytes: 104857600,
      allowedMimeTypes: [],
      logLevel: 'info'
    },
    oauth: {
      enabled: false,
      tokenAuth: {
        enabled: false,
        tokens: []
      },
      providers: []
    },
    quota: {
      global: {
        maxTotalStorageBytes: 10737418240,
        maxTotalFiles: 10000
      },
      defaults: {
        maxStorageBytes: 524288000,
        maxFiles: 500
      },
      userOverrides: {}
    }
  }
  await writeFile(configPath, JSON.stringify(defaultConfig, null, 2))

  // Create necessary directories
  const testDirs = [
    'uploads',
    'uploads/images',
    'uploads/videos',
    'uploads/audio',
    'uploads/documents',
    'data'
  ]
  for (const dir of testDirs) {
    await mkdir(path.join(process.cwd(), dir), { recursive: true })
  }
}

export async function cleanupTestEnvironment(): Promise<void> {
  const testDirs = ['uploads', 'data']
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
