import { Hono } from "hono"
import { draftStore } from "../store/draftStore"
import type { Draft } from "../store/types"
import { draftSchema, draftUpdateSchema } from "../validators/draft"

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
    let body
    try {
        body = await c.req.json()
    } catch {
        return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const result = draftSchema.safeParse(body)
    if (!result.success) {
        return c.json({ error: result.error.issues }, 400)
    }

    const data = result.data
    const id = crypto.randomUUID()
    const now = Date.now()

    const draft: Draft = {
        id,
        content: data.content || '',
        mediaIds: data.mediaIds || [],
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

    let body
    try {
        body = await c.req.json()
    } catch {
        return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const result = draftUpdateSchema.safeParse(body)
    if (!result.success) {
        return c.json({ error: result.error.issues }, 400)
    }

    const data = result.data

    const updated: Draft = {
        ...existing,
        content: data.content ?? existing.content,
        mediaIds: data.mediaIds ?? existing.mediaIds,
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
