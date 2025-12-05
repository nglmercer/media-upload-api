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

// Estados para el procesamiento de drafts
export enum ProcessingStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Tipos para los tracks de media
export interface AudioTrack {
  id: string;
  name: string;
  language?: string;
  url: string;
  metadata?: Record<string, any>;
}

export interface SubtitleTrack {
  id: string;
  name: string;
  language?: string;
  url: string;
  format?: 'srt' | 'vtt' | 'ass';
  metadata?: Record<string, any>;
}

// Configuración de procesamiento para un draft
export interface ProcessingConfig {
  videoFile: {
    id: string;
    name: string;
    url: string;
  };
  audioTracks: AudioTrack[];
  subtitleTracks: SubtitleTrack[];
  outputFormat?: string;
  quality?: 'low' | 'medium' | 'high';
}

// Información del resultado del procesamiento
export interface ProcessingResult {
  outputUrl: string;
  s3Key: string;
  duration: number;
  fileSize: number;
  format: string;
  resolution?: string;
  bitrate?: number;
  processedAt: number;
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
  // Nuevos campos para procesamiento
  processingConfig?: ProcessingConfig;
  processingStatus?: ProcessingStatus;
  processingResult?: ProcessingResult;
  processingError?: string;
  queuedAt?: number;
  startedProcessingAt?: number;
  completedProcessingAt?: number;
}

export type DraftInput = Omit<Draft, 'id' | 'createdAt' | 'updatedAt'>
export type DraftUpdate = Partial<DraftInput>

// Tipos para la cola de procesamiento
export interface QueueItem {
  id: string;
  draftId: string;
  config: ProcessingConfig;
  status: ProcessingStatus;
  queuedAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  result?: ProcessingResult;
}

// Tipos para el mock de S3
export interface S3UploadResult {
  key: string;
  url: string;
  etag: string;
  bucket: string;
}
