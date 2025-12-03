import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, mock } from 'bun:test'
import path from 'path'
import { mkdir, rm, writeFile } from 'fs/promises'
import { serve } from 'bun'

const TEST_MEDIA_FILE = path.join(process.cwd(), "media/media_fetch.json");
const TEST_UPLOADS_DIR = path.join(process.cwd(), "uploads_fetch");

// Mock config BEFORE importing modules that use it
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

// Dynamic imports to ensure mock applies
const { Hono } = await import('hono');
const { mediaRouter } = await import('../src/routers/media');
const MediaStoreModule = await import('../src/store/mediaStore');
const { default: MediaApi } = await import('../fetch/fetchapi');
const { default: apiConfig } = await import('../fetch/config/apiConfig');

// Setup test server
const app = new Hono()
app.route('/api/media', mediaRouter)
app.get('/api/media/data', async (c) => {
    const data = await MediaStoreModule.mediaStorage.getAll();
    return c.json(data);
})

let server: any;
let api: MediaApi;

describe('Media API with Fetch', () => {

    beforeAll(async () => {
        // Start server on random port
        server = serve({
            fetch: app.fetch,
            port: 0,
        });

        // Configure API client to use test server
        apiConfig.update({
            host: 'localhost',
            port: server.port,
            protocol: 'http'
        });

        api = new MediaApi(apiConfig);
        console.log(`Test server running on ${apiConfig.getFullUrl()}`);
    });

    afterAll(() => {
        if (server) {
            server.stop();
        }
    });

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

        // Reset storage
        try {
            // Force reload by creating new storage instance
            const { DataStorage } = await import('json-obj-manager')
            const { JSONFileAdapter } = await import('json-obj-manager/node')
            // This will create a new instance with fresh data
            MediaStoreModule.setMediaStorage(new DataStorage(new JSONFileAdapter(TEST_MEDIA_FILE)))
        } catch {
            // Storage doesn't exist yet, that's fine
        }
    });

    afterEach(async () => {
        await rm(TEST_UPLOADS_DIR, { recursive: true, force: true });
        await rm(path.dirname(TEST_MEDIA_FILE), { recursive: true, force: true });

        await mkdir(path.dirname(TEST_MEDIA_FILE), { recursive: true });
        await writeFile(TEST_MEDIA_FILE, '{}');
    });

    it('should upload and retrieve an image using fetch', async () => {
        // Create a mock image file
        const imageContent = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) // PNG header
        const file = new File([imageContent], 'test_fetch.png', { type: 'image/png' })

        // Upload
        const uploaded = await api.uploadMedia('image', file, { source: 'fetch_test' });

        expect(uploaded).toBeDefined();
        expect(uploaded.name).toBe('test_fetch.png');
        expect(uploaded.type).toBe('image');
        expect(uploaded.metadata).toEqual({ source: 'fetch_test' });

        // Retrieve by type
        const images = await api.getMediaByType('image');
        expect(images.length).toBeGreaterThan(0);
        expect(images[0].id).toBe(uploaded.id);

        // Get size
        const sizeData = await api.getMediaSize(uploaded.id);
        expect(sizeData.id).toBe(uploaded.id);
        expect(sizeData.size).toBeGreaterThan(0);
    });

    it('should delete media using fetch', async () => {
        // Upload first
        const file = new File(['test'], 'delete_test.png', { type: 'image/png' });
        const uploaded = await api.uploadMedia('image', file);

        // Delete
        const result = await api.deleteMedia(uploaded.id);
        console.log('Delete result:', result);
        expect(result.message).toContain('deleted successfully');

        // Verify deletion
        const images = await api.getMediaByType('image');
        expect(images.length).toBe(0);
    });

    it('should get stats using fetch', async () => {
        const file = new File(['test'], 'stats_test.png', { type: 'image/png' });
        await api.uploadMedia('image', file);

        const stats = await api.getStats();
        expect(stats.total.count).toBe(1);
        expect(stats.byType.image.count).toBe(1);
    });

    it('should get all media using fetch', async () => {
        const file = new File(['test'], 'all_test.png', { type: 'image/png' });
        const uploaded = await api.uploadMedia('image', file);

        const all = await api.getAllMedia();
        const allValues = Object.values(all);
        expect(allValues.length).toBe(1);
        expect(allValues[0].id).toBe(uploaded.id);
    });
});
