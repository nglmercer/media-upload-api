import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { setupTestEnvironment, cleanupTestEnvironment, createMockFile } from './helpers/test-utils'

mock.module("../src/config", () => ({
  loadConfig: () => ({
    port: 0,
    host: "localhost",
    uploadsDir: "uploads_basic",
    mediaFile: "media/media_basic.json"
  }),
  createConfigFile: () => { },
  saveConfig: () => { }
}));

describe('Basic Test Infrastructure', () => {
  beforeEach(async () => {
    await setupTestEnvironment()
  })

  afterEach(async () => {
    await cleanupTestEnvironment()
  })

  it('should setup and cleanup test environment correctly', async () => {
    // Test that we can create mock files
    const imageFile = createMockFile('image/png', 'test.png')
    expect(imageFile).toBeInstanceOf(File)
    expect(imageFile.name).toBe('test.png')
    expect(imageFile.type).toBe('image/png')
  })

  it('should create different types of mock files', async () => {
    const imageFile = createMockFile('image/jpeg', 'test.jpg')
    const videoFile = createMockFile('video/mp4', 'test.mp4')
    const audioFile = createMockFile('audio/mpeg', 'test.mp3')
    const subtitleFile = createMockFile('text/vtt', 'test.vtt')

    expect(imageFile.type).toBe('image/jpeg')
    expect(videoFile.type).toBe('video/mp4')
    expect(audioFile.type).toBe('audio/mpeg')
    expect(subtitleFile.type).toBe('text/vtt')
  })
})
