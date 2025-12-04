import { z } from 'zod'

export const draftSchema = z.object({
    content: z.string().optional(),
    mediaIds: z.array(z.string()).optional()
}).refine(data => data.content || (data.mediaIds && data.mediaIds.length > 0), {
    message: "Draft must have content or mediaIds"
})

export const draftUpdateSchema = z.object({
    content: z.string().optional(),
    mediaIds: z.array(z.string()).optional()
})

export type DraftInput = z.infer<typeof draftSchema>
