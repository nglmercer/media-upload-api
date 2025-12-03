// Tipos para el API de medios
export type MediaType = "image" | "audio" | "video" | "subtitle"

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
