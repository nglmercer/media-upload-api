import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, mock } from 'bun:test'
import path from 'path'
import { mkdir, rm, writeFile } from 'fs/promises'
import { serve } from 'bun'

const TEST_DRAFTS_FILE = path.join(process.cwd(), "drafts/drafts_fetch.json");

// Mock config BEFORE importing modules that use it
mock.module("../src/config", () => ({
    loadConfig: () => ({
        port: 0,
        host: "localhost",
        uploadsDir: "uploads_drafts_fetch",
        mediaFile: "media_drafts_fetch.json"
    }),
    createConfigFile: () => { },
    saveConfig: () => { }
}));

// Dynamic imports to ensure mock applies
const { Hono } = await import('hono');
const { draftsRouter } = await import('../src/routers/drafts');
const DraftStoreModule = await import('../src/store/draftStore');
const { default: DraftsApi } = await import('../fetch/draftsapi');
const { default: apiConfig } = await import('../fetch/config/apiConfig');

// Setup test server
const app = new Hono()
app.route('/api/drafts', draftsRouter)

let server: any;
//@ts-ignore
let api: DraftsApi;

describe('Drafts API with Fetch', () => {

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

        api = new DraftsApi(apiConfig);
        console.log(`Test server running on ${apiConfig.getFullUrl()}`);
    });

    afterAll(() => {
        if (server) {
            server.stop();
        }
    });

    beforeEach(async () => {
        // Clean up any existing data
        await rm(path.dirname(TEST_DRAFTS_FILE), { recursive: true, force: true });
        await mkdir(path.dirname(TEST_DRAFTS_FILE), { recursive: true });

        // Reset storage
        try {
            // Force reload by creating new storage instance
            const { DataStorage } = await import('json-obj-manager')
            const { JSONFileAdapter } = await import('json-obj-manager/node')
            // This will create a new instance with fresh data
            DraftStoreModule.setDraftStorage(new DataStorage(new JSONFileAdapter(TEST_DRAFTS_FILE)))
        } catch {
            // Storage doesn't exist yet, that's fine
        }
    });

    afterEach(async () => {
        await rm(path.dirname(TEST_DRAFTS_FILE), { recursive: true, force: true });
        await mkdir(path.dirname(TEST_DRAFTS_FILE), { recursive: true });
        await writeFile(TEST_DRAFTS_FILE, '{}');
    });

    it('should create and retrieve a draft using fetch', async () => {
        const draftData = {
            content: 'Test draft content',
            mediaIds: ['media1', 'media2']
        };

        const created = await api.createDraft(draftData);

        expect(created).toBeDefined();
        expect(created.content).toBe(draftData.content);
        expect(created.mediaIds).toEqual(draftData.mediaIds);
        expect(created.id).toBeDefined();

        const retrieved = await api.getDraftById(created.id);
        expect(retrieved.id).toBe(created.id);
        expect(retrieved.content).toBe(draftData.content);
    });

    it('should list all drafts using fetch', async () => {
        const draftData1 = { content: 'Draft 1' };
        const draftData2 = { content: 'Draft 2' };

        await api.createDraft(draftData1);
        await api.createDraft(draftData2);

        const drafts = await api.getAllDrafts();
        expect(drafts.length).toBe(2);
    });

    it('should update a draft using fetch', async () => {
        const created = await api.createDraft({ content: 'Original' });

        const updated = await api.updateDraft(created.id, { content: 'Updated' });
        expect(updated.content).toBe('Updated');
        expect(updated.id).toBe(created.id);

        const retrieved = await api.getDraftById(created.id);
        expect(retrieved.content).toBe('Updated');
    });

    it('should delete a draft using fetch', async () => {
        const created = await api.createDraft({ content: 'To Delete' });

        const result = await api.deleteDraft(created.id);
        expect(result.message).toContain('deleted successfully');

        try {
            await api.getDraftById(created.id);
            expect(true).toBe(false); // Should not reach here
        } catch (e) {
            // Expected error (404)
        }
    });
});
