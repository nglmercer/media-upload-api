import { z } from 'zod'
import { DraftStatus } from '../store/types'

// Validador para el status (debe ser un número válido del enum)
const statusSchema = z.nativeEnum(DraftStatus)

// Schema para crear un draft (todos opcionales)
export const draftSchema = z.object({
    content: z.string().optional(),
    mediaIds: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    status: statusSchema.optional()
}).refine(
    data => data.content || (data.mediaIds && data.mediaIds.length > 0),
    { message: "Draft must have content or mediaIds" }
)

// Schema para actualizar un draft (todos los campos opcionales)
export const draftUpdateSchema = z.object({
    content: z.string().optional(),
    mediaIds: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    status: statusSchema.optional()
})

export type DraftInput = z.infer<typeof draftSchema>