import { Hono } from "hono"
import { draftStore } from "../store/draftStore"
import type { Draft } from "../store/types"

const draftsRouter = new Hono()

// Get all drafts
draftsRouter.get('/', async (c) => {
    const drafts = await draftStore.getAll()
    return c.json(Object.values(drafts))
})

// Get single draft
draftsRouter.get('/:id', async (c) => {
    const id = c.req.param('id')
    const draft = await draftStore.get(id)

    if (!draft) {
        return c.json({ error: 'Draft not found' }, 404)
    }

    return c.json(draft)
})

// Create draft
draftsRouter.post('/', async (c) => {
    let body: Partial<Draft>
    try {
        body = await c.req.json()
    } catch {
        return c.json({ error: 'Invalid JSON body' }, 400)
    }

    if (!body.content && !body.mediaIds) {
        return c.json({ error: 'Draft must have content or mediaIds' }, 400)
    }

    const id = crypto.randomUUID()
    const now = Date.now()

    const draft: Draft = {
        id,
        content: body.content || '',
        mediaIds: body.mediaIds || [],
        createdAt: now,
        updatedAt: now
    }

    await draftStore.save(id, draft)
    return c.json(draft, 201)
})

// Update draft
draftsRouter.put('/:id', async (c) => {
    const id = c.req.param('id')
    const existing = await draftStore.get(id)

    if (!existing) {
        return c.json({ error: 'Draft not found' }, 404)
    }

    let body: Partial<Draft>
    try {
        body = await c.req.json()
    } catch {
        return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const updated: Draft = {
        ...existing,
        content: body.content ?? existing.content,
        mediaIds: body.mediaIds ?? existing.mediaIds,
        updatedAt: Date.now()
    }

    await draftStore.save(id, updated)
    return c.json(updated)
})

// Delete draft
draftsRouter.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const existing = await draftStore.get(id)

    if (!existing) {
        return c.json({ error: 'Draft not found' }, 404)
    }

    await draftStore.delete(id)
    return c.json({ message: 'Draft deleted successfully' })
})

export { draftsRouter }
