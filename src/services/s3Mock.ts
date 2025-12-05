import { S3UploadResult } from '../store/types'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { loadConfig } from '../config'

// Mock de S3 para desarrollo y testing
export class S3MockService {
  private bucketName: string
  private uploadsDir: string

  constructor() {
    this.bucketName = 'mock-media-bucket'
    this.uploadsDir = './uploads/processed'
    this.ensureUploadsDir()
  }

  private async ensureUploadsDir() {
    try {
      await mkdir(this.uploadsDir, { recursive: true })
    } catch (error) {
      // Directorio ya existe
    }
  }

  /**
   * Sube un archivo al mock de S3
   */
  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string = 'application/octet-stream'
  ): Promise<S3UploadResult> {
    const filePath = path.join(this.uploadsDir, path.basename(key))
    
    // Guardar archivo localmente
    await writeFile(filePath, buffer)
    
    // Generar URL mock
    const config = loadConfig()
    const baseUrl = `http://localhost:${config.port}/uploads/processed`
    const url = `${baseUrl}/${path.basename(key)}`
    
    // Generar etag mock (hash simple)
    const etag = Buffer.from(key).toString('base64').slice(0, 32)

    return {
      key,
      url,
      etag,
      bucket: this.bucketName
    }
  }

  /**
   * Genera una URL firmada mock
   */
  getSignedUrl(key: string, expiresIn: number = 3600): string {
    const config = loadConfig()
    return `http://localhost:${config.port}/uploads/processed/${path.basename(key)}?expires=${Date.now() + expiresIn * 1000}`
  }

  /**
   * Elimina un archivo del mock de S3
   */
  async deleteFile(key: string): Promise<void> {
    const fs = await import('fs/promises')
    const filePath = path.join(this.uploadsDir, path.basename(key))
    
    try {
      await fs.unlink(filePath)
    } catch (error) {
      // Archivo no existe, ignorar
    }
  }

  /**
   * Verifica si un archivo existe
   */
  async fileExists(key: string): Promise<boolean> {
    const fs = await import('fs/promises')
    const filePath = path.join(this.uploadsDir, path.basename(key))
    
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }
}

// Singleton instance
export const s3MockService = new S3MockService()
