import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import path from 'path'
import { rm, writeFile, mkdir } from 'fs/promises'
import { Hono } from 'hono'

const TEST_MEDIA_FILE = path.join(process.cwd(), "media/media_drafts.json");
const TEST_UPLOADS_DIR = path.join(process.cwd(), "uploads_drafts");

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
const { draftsRouter } = await import('../src/routers/drafts');
const DraftStoreModule = await import('../src/store/draftStore');

describe('Drafts API', () => {
    let app: Hono

    beforeEach(async () => {
        // Clean up first
        await rm(path.dirname(TEST_MEDIA_FILE), { recursive: true, force: true });
        await mkdir(path.dirname(TEST_MEDIA_FILE), { recursive: true })

        // Initialize store
        try {
            const { DataStorage } = await import('json-obj-manager')
            const { JSONFileAdapter } = await import('json-obj-manager/node')
            const draftsFile = path.join(path.dirname(TEST_MEDIA_FILE), 'drafts.json')
            await writeFile(draftsFile, '{}')
            DraftStoreModule.setDraftStorage(new DataStorage(new JSONFileAdapter(draftsFile)))
        } catch { }

        app = new Hono()
        app.route('/api/drafts', draftsRouter)
    })

    afterEach(async () => {
        await rm(path.dirname(TEST_MEDIA_FILE), { recursive: true, force: true });
    })

    it('should create a new draft', async () => {
        const draftData = {
            content: 'Test draft content',
            mediaIds: ['media-1', 'media-2']
        }

        const req = new Request('http://localhost/api/drafts', {
            method: 'POST',
            body: JSON.stringify(draftData),
            headers: { 'Content-Type': 'application/json' }
        })

        const res = await app.request(req)
        expect(res.status).toBe(201)

        const data = await res.json()
        expect(data.id).toBeDefined()
        expect(data.content).toBe(draftData.content)
        expect(data.mediaIds).toEqual(draftData.mediaIds)
        expect(data.createdAt).toBeDefined()
        expect(data.updatedAt).toBeDefined()
    })

    it('should list all drafts', async () => {
        // Create a draft first
        const draftData = { content: 'Draft 1' }
        await app.request(new Request('http://localhost/api/drafts', {
            method: 'POST',
            body: JSON.stringify(draftData),
            headers: { 'Content-Type': 'application/json' }
        }))

        const req = new Request('http://localhost/api/drafts')
        const res = await app.request(req)
        expect(res.status).toBe(200)

        const data = await res.json()
        expect(Array.isArray(data)).toBe(true)
        expect(data.length).toBe(1)
        expect(data[0].content).toBe('Draft 1')
    })

    it('should get a draft by id', async () => {
        // Create a draft
        const createRes = await app.request(new Request('http://localhost/api/drafts', {
            method: 'POST',
            body: JSON.stringify({ content: 'Draft to get' }),
            headers: { 'Content-Type': 'application/json' }
        }))
        const created = await createRes.json()

        // Get it
        const req = new Request(`http://localhost/api/drafts/${created.id}`)
        const res = await app.request(req)
        expect(res.status).toBe(200)

        const data = await res.json()
        expect(data.id).toBe(created.id)
        expect(data.content).toBe('Draft to get')
    })

    it('should update a draft', async () => {
        // Create a draft
        const createRes = await app.request(new Request('http://localhost/api/drafts', {
            method: 'POST',
            body: JSON.stringify({ content: 'Original content' }),
            headers: { 'Content-Type': 'application/json' }
        }))
        const created = await createRes.json()

        // Update it
        const updateData = { content: 'Updated content' }
        const req = new Request(`http://localhost/api/drafts/${created.id}`, {
            method: 'PUT',
            body: JSON.stringify(updateData),
            headers: { 'Content-Type': 'application/json' }
        })

        const res = await app.request(req)
        expect(res.status).toBe(200)

        const data = await res.json()
        expect(data.id).toBe(created.id)
        expect(data.content).toBe('Updated content')
        expect(data.updatedAt).not.toBe(created.updatedAt)
    })

    it('should delete a draft', async () => {
        // Create a draft
        const createRes = await app.request(new Request('http://localhost/api/drafts', {
            method: 'POST',
            body: JSON.stringify({ content: 'Draft to delete' }),
            headers: { 'Content-Type': 'application/json' }
        }))
        const created = await createRes.json()

        // Delete it
        const req = new Request(`http://localhost/api/drafts/${created.id}`, {
            method: 'DELETE'
        })

        const res = await app.request(req)
        expect(res.status).toBe(200)

        // Verify it's gone
        const getRes = await app.request(new Request(`http://localhost/api/drafts/${created.id}`))
        expect(getRes.status).toBe(404)
    })
})
