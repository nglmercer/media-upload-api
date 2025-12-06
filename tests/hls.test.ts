import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import path from 'path'
import { mkdir, rm, writeFile, exists } from 'fs/promises'

const TEST_MEDIA_FILE = path.join(process.cwd(), "media/hls_test_media.json");
const TEST_UPLOADS_DIR = path.join(process.cwd(), "uploads_hls_test");

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
        path.join(TEST_UPLOADS_DIR, 'videos'),
        path.dirname(TEST_MEDIA_FILE)
    ];
    for (const dir of testDirs) {
        await mkdir(dir, { recursive: true })
    }

    // Clear media storage cache by accessing it after creating empty file
    try {
        const { DataStorage } = await import('json-obj-manager')
        const { JSONFileAdapter } = await import('json-obj-manager/node')
        MediaStoreModule.setMediaStorage(new DataStorage(new JSONFileAdapter(TEST_MEDIA_FILE)))
    } catch {
        // Storage doesn't exist yet, that's fine
    }
})

afterEach(async () => {
    await rm(TEST_UPLOADS_DIR, { recursive: true, force: true });
    await rm(path.dirname(TEST_MEDIA_FILE), { recursive: true, force: true });
})

const M3U8_CONTENT = "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:6\n#EXTINF:6.000,\nsegment0.ts\n#EXT-X-ENDLIST";
const TS_CONTENT = new Uint8Array([0x47, 0x40, 0x00, 0x10, 0x00]); // Sync byte 0x47

describe('HLS Media Support', () => {

    describe('POST /upload/video with HLS files', () => {

        it('should upload an m3u8 playlist successfully', async () => {
            const file = new File([M3U8_CONTENT], 'playlist.m3u8', { type: 'application/vnd.apple.mpegurl' })

            const formData = new FormData()
            formData.append('file', file)
            formData.append('name', 'Test Playlist')

            const request = new Request('http://localhost:3000/upload/video', {
                method: 'POST',
                body: formData
            })

            const response = await mediaRouter.request(request)
            const data = await response.json()

            expect(response.status).toBe(201)
            expect(data.type).toBe('video')
            expect(data.name).toBe('Test Playlist')
            expect(data.url).toMatch(/^\/uploads\/videos\/[\w-]+\.m3u8$/)

            // Verify file exists on disk
            const filePath = path.join(TEST_UPLOADS_DIR, 'videos', path.basename(data.url));
            expect(await exists(filePath)).toBe(true);
        })

        it('should upload a .ts segment successfully', async () => {
            const file = new File([TS_CONTENT], 'segment.ts', { type: 'video/MP2T' })

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
            expect(data.url).toMatch(/^\/uploads\/videos\/[\w-]+\.ts$/)

            // Verify file exists on disk
            const filePath = path.join(TEST_UPLOADS_DIR, 'videos', path.basename(data.url));
            expect(await exists(filePath)).toBe(true);
        })

        it('should validate m3u8 content correctly', async () => {
            // Create a file with m3u8 extension but invalid content
            const file = new File(['invalid content'], 'invalid.m3u8', { type: 'application/x-mpegURL' })
            const formData = new FormData()
            formData.append('file', file)

            const request = new Request('http://localhost:3000/upload/video', {
                method: 'POST',
                body: formData
            })

            const response = await mediaRouter.request(request)
            expect(response.status).toBe(400)
        })
    })

    describe('Sync Functionality with HLS files', () => {
        it('should sync existing .m3u8 and .ts files', async () => {
            // Manually create files
            const videoDir = path.join(TEST_UPLOADS_DIR, 'videos');
            await writeFile(path.join(videoDir, 'manual_playlist.m3u8'), M3U8_CONTENT);
            await writeFile(path.join(videoDir, 'manual_segment.ts'), TS_CONTENT);

            const request = new Request('http://localhost:3000/sync', {
                method: 'POST'
            })

            const response = await mediaRouter.request(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.added).toBe(2)
            expect(data.details.video).toBe(2)
        })
    })
})
