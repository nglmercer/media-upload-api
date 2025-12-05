// Tipos para el API de medios
export type MediaType = "image" | "audio" | "video" | "subtitle" | "text"

export interface MediaItem {
  id: string;
  type: MediaType;
  url: string;
  name?: string;
  size?: number; // Size in bytes
  metadata?: {
    [key: string]: any;
  };
}
// Draft status enum
export enum DraftStatus {
  DRAFT = 0,
  IN_REVIEW = 1,
  SCHEDULED = 2,
  PUBLISHED = 3,
  ARCHIVED = 4
}

export interface Draft {
  id: string
  content: string
  mediaIds: string[]
  tags: string[]
  status: DraftStatus
  createdAt: number
  updatedAt: number
}

export type DraftInput = Omit<Draft, 'id' | 'createdAt' | 'updatedAt'>
export type DraftUpdate = Partial<DraftInput>