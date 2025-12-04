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

export interface Draft {
  id: string;
  content: string;
  mediaIds: string[];
  createdAt: number;
  updatedAt: number;
}
