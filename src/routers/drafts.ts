import { Hono } from "hono"
import { draftStore } from "../store/draftStore"
import type { Draft, ProcessingConfig } from "../store/types"
import { DraftStatus, ProcessingStatus } from "../store/types"
import { draftSchema, draftUpdateSchema } from "../validators/draft"
import { processingService } from "../services/processingService"

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

// Endpoint para iniciar procesamiento de un draft
draftsRouter.post('/:id/process', async (c) => {
    const id = c.req.param('id')
    const draft = await draftStore.get(id)

    if (!draft) {
        return c.json({ error: 'Draft not found' }, 404)
    }

    // Verificar que el draft no esté ya en procesamiento
    if (draft.processingStatus === ProcessingStatus.PROCESSING || draft.processingStatus === ProcessingStatus.QUEUED) {
        return c.json({ error: 'Draft is already being processed' }, 400)
    }

    let body
    try {
        body = await c.req.json()
    } catch {
        return c.json({ error: 'Invalid JSON body' }, 400)
    }

    // Validar configuración de procesamiento
    const config: ProcessingConfig = body
    if (!config.videoFile || !config.videoFile.id || !config.videoFile.url) {
        return c.json({ error: 'Video file is required' }, 400)
    }

    try {
        await processingService.addToQueue(id, config)
        
        // Obtener el draft actualizado
        const updatedDraft = await draftStore.get(id)
        return c.json({
            message: 'Draft added to processing queue',
            draft: updatedDraft
        })
    } catch (error) {
        return c.json({ 
            error: 'Failed to add draft to processing queue',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500)
    }
})

// Endpoint para obtener estado del procesamiento
draftsRouter.get('/:id/processing-status', async (c) => {
    const id = c.req.param('id')
    const draft = await draftStore.get(id)

    if (!draft) {
        return c.json({ error: 'Draft not found' }, 404)
    }

    return c.json({
        draftId: id,
        processingStatus: draft.processingStatus,
        processingResult: draft.processingResult,
        processingError: draft.processingError,
        queuedAt: draft.queuedAt,
        startedProcessingAt: draft.startedProcessingAt,
        completedProcessingAt: draft.completedProcessingAt
    })
})

// Endpoint para obtener estado general de la cola
draftsRouter.get('/queue/status', async (c) => {
    const queueStatus = processingService.getQueueStatus()
    return c.json(queueStatus)
})

// Endpoint para obtener drafts en cola
draftsRouter.get('/queue/items', async (c) => {
    const statusParam = c.req.query('status')
    let drafts = Object.values(await draftStore.getAll())

    // Filtrar solo drafts con configuración de procesamiento
    drafts = drafts.filter(d => d.processingConfig)

    // Filtrar por estado de procesamiento si se proporciona
    if (statusParam) {
        drafts = drafts.filter(d => d.processingStatus === statusParam)
    }

    return c.json(drafts.map(d => ({
        id: d.id,
        processingStatus: d.processingStatus,
        queuedAt: d.queuedAt,
        startedProcessingAt: d.startedProcessingAt,
        completedProcessingAt: d.completedProcessingAt,
        processingError: d.processingError,
        processingResult: d.processingResult
    })))
})

export { draftsRouter }
