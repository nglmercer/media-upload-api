import { z } from "zod"

// Media types
export const MediaTypeSchema = z.enum(["image", "audio", "video", "subtitle", "text"])
export type MediaType = z.infer<typeof MediaTypeSchema>

// Media item schema
export const MediaItemSchema = z.object({
  id: z.string(),
  type: MediaTypeSchema,
  url: z.string(),
  name: z.string().optional(),
  size: z.number().optional(),
  metadata: z.record(z.string(), z.any()).optional()
})
export type MediaItem = z.infer<typeof MediaItemSchema>

// Draft status - keep enum as actual values for runtime usage
export const DraftStatus = {
  DRAFT: 0,
  IN_REVIEW: 1,
  SCHEDULED: 2,
  PUBLISHED: 3,
  ARCHIVED: 4
} as const

export type DraftStatus = typeof DraftStatus[keyof typeof DraftStatus]

// Zod schema for DraftStatus
export const DraftStatusSchema = z.nativeEnum(DraftStatus)
export type DraftStatusType = z.infer<typeof DraftStatusSchema>

// Draft schema
export const DraftSchema = z.object({
  id: z.string(),
  content: z.string(),
  mediaIds: z.array(z.string()),
  tags: z.array(z.string()),
  status: DraftStatusSchema,
  createdAt: z.number(),
  updatedAt: z.number()
})
export type Draft = z.infer<typeof DraftSchema>

// Draft input - omit id, createdAt, updatedAt
export const DraftInputSchema = DraftSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
})
export type DraftInput = z.infer<typeof DraftInputSchema>

// Draft update - partial of DraftInput
export const DraftUpdateSchema = DraftInputSchema.partial()
export type DraftUpdate = z.infer<typeof DraftUpdateSchema>
