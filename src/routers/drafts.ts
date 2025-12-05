import { Hono } from "hono"
import { draftStore } from "../store/draftStore"
import type { Draft } from "../store/types"
import { DraftStatus } from "../store/types"
import { draftSchema, draftUpdateSchema } from "../validators/draft"

const draftsRouter = new Hono()

// Get all drafts (con filtros opcionales por status y tags)
draftsRouter.get('/', async (c) => {
    const statusParam = c.req.query('status')
    const tagsParam = c.req.query('tags')

    let drafts = Object.values(await draftStore.getAll())

    // Filtrar por status si se proporciona
    if (statusParam !== undefined) {
        const status = parseInt(statusParam, 10)
        if (!isNaN(status) && status in DraftStatus) {
            drafts = drafts.filter(d => d.status === status)
        }
    }

    // Filtrar por tags si se proporciona (formato: ?tags=tag1,tag2)
    if (tagsParam) {
        const tags = tagsParam.split(',').map(t => t.trim())
        drafts = drafts.filter(d =>
            tags.some(tag => d.tags.includes(tag))
        )
    }

    return c.json(drafts)
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
        return c.json({
            error: 'Validation failed',
            details: result.error.issues
        }, 400)
    }

    const data = result.data
    const id = crypto.randomUUID()
    const now = Date.now()

    const draft: Draft = {
        id,
        content: data.content || '',
        mediaIds: data.mediaIds || [],
        tags: data.tags || [],
        status: data.status || DraftStatus.DRAFT,
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
        return c.json({
            error: 'Validation failed',
            details: result.error.issues
        }, 400)
    }

    const data = result.data

    const updated: Draft = {
        ...existing,
        content: data.content ?? existing.content,
        mediaIds: data.mediaIds ?? existing.mediaIds,
        tags: data.tags ?? existing.tags,
        status: data.status ?? existing.status,
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

// Endpoint adicional: Get all available statuses
draftsRouter.get('/meta/statuses', async (c) => {
    return c.json({
        statuses: [
            { value: DraftStatus.DRAFT, label: 'Draft' },
            { value: DraftStatus.IN_REVIEW, label: 'In Review' },
            { value: DraftStatus.SCHEDULED, label: 'Scheduled' },
            { value: DraftStatus.PUBLISHED, label: 'Published' },
            { value: DraftStatus.ARCHIVED, label: 'Archived' }
        ]
    })
})

export { draftsRouter }