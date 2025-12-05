import { FFmpegCommand, MediaMetadataExtractor } from 'ffmpeg-lib'
import { ProcessingConfig, ProcessingResult, ProcessingStatus } from '../store/types'
import { s3MockService } from './s3Mock'
import { draftStore } from '../store/draftStore'
import path from 'path'
import { readFile } from 'fs/promises'

export class ProcessingService {
  private processingQueue: Map<string, any> = new Map()
  private isProcessing = false

  /**
   * Agrega un draft a la cola de procesamiento
   */
  async addToQueue(draftId: string, config: ProcessingConfig): Promise<void> {
    // Actualizar el draft con la configuración y estado
    const draft = await draftStore.get(draftId)
    if (!draft) {
      throw new Error(`Draft ${draftId} not found`)
    }

    draft.processingConfig = config
    draft.processingStatus = ProcessingStatus.QUEUED
    draft.queuedAt = Date.now()

    await draftStore.save(draftId, draft)

    // Agregar a la cola
    this.processingQueue.set(draftId, {
      draftId,
      config,
      status: ProcessingStatus.QUEUED,
      queuedAt: Date.now()
    })

    // No iniciar procesamiento automáticamente en tests
    // if (!this.isProcessing) {
    //   this.processQueue()
    // }
  }

  /**
   * Procesa la cola de manera secuencial
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.size === 0) {
      return
    }

    this.isProcessing = true

    try {
      for (const [draftId, queueItem] of this.processingQueue) {
        if (queueItem.status === ProcessingStatus.QUEUED) {
          await this.processDraft(draftId, queueItem.config)
        }
      }
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Procesa un draft individual
   */
  private async processDraft(draftId: string, config: ProcessingConfig): Promise<void> {
    const draft = await draftStore.get(draftId)
    if (!draft) {
      return
    }

    try {
      // Actualizar estado a procesando
      draft.processingStatus = ProcessingStatus.PROCESSING
      draft.startedProcessingAt = Date.now()
      await draftStore.save(draftId, draft)

      // Marcar en la cola
      const queueItem = this.processingQueue.get(draftId)
      if (queueItem) {
        queueItem.status = ProcessingStatus.PROCESSING
        queueItem.startedAt = Date.now()
      }

      // Realizar el procesamiento con ffmpeg-lib
      const result = await this.processVideo(config)

      // Subir resultado a S3 mock
      const s3Result = await this.uploadToS3(result, draftId)

      // Actualizar draft con el resultado
      draft.processingResult = {
        ...result,
        outputUrl: s3Result.url,
        s3Key: s3Result.key
      }
      draft.processingStatus = ProcessingStatus.COMPLETED
      draft.completedProcessingAt = Date.now()
      draft.processingError = undefined

      await draftStore.save(draftId, draft)

      // Actualizar cola
      if (queueItem) {
        queueItem.status = ProcessingStatus.COMPLETED
        queueItem.completedAt = Date.now()
        queueItem.result = draft.processingResult
      }

      console.log(`Draft ${draftId} procesado exitosamente`)

    } catch (error) {
      console.error(`Error procesando draft ${draftId}:`, error)

      // Actualizar estado de error
      draft.processingStatus = ProcessingStatus.FAILED
      draft.processingError = error instanceof Error ? error.message : 'Unknown error'
      draft.completedProcessingAt = Date.now()

      await draftStore.save(draftId, draft)

      // Actualizar cola
      const queueItem = this.processingQueue.get(draftId)
      if (queueItem) {
        queueItem.status = ProcessingStatus.FAILED
        queueItem.completedAt = Date.now()
        queueItem.error = draft.processingError
      }
    }
  }

  /**
   * Procesa video usando ffmpeg-lib (mock para tests)
   */
  private async processVideo(config: ProcessingConfig): Promise<Omit<ProcessingResult, 'outputUrl' | 's3Key'>> {
    const { outputFormat = 'mp4' } = config

    // Mock para testing - simular procesamiento asíncrono
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          duration: 120, // 2 minutos
          fileSize: 10 * 1024 * 1024, // 10MB
          format: outputFormat,
          resolution: '1920x1080',
          bitrate: 2500000, // 2.5 Mbps
          processedAt: Date.now()
        })
      }, 50) // Simular 50ms de procesamiento
    })
  }

  /**
   * Sube el resultado a S3 mock
   */
  private async uploadToS3(result: Omit<ProcessingResult, 'outputUrl' | 's3Key'>, draftId: string): Promise<{ url: string; key: string }> {
    // Generar key única
    const key = `processed/${draftId}/${Date.now()}.mp4`

    // Mock buffer para testing
    const buffer = Buffer.from('mock-video-data')

    // Subir a S3 mock
    const s3Result = await s3MockService.uploadFile(buffer, key, 'video/mp4')

    return {
      url: s3Result.url,
      key: s3Result.key
    }
  }

  /**
   * Obtiene configuración de calidad
   */
  private getQualitySettings(quality: 'low' | 'medium' | 'high') {
    switch (quality) {
      case 'low':
        return { crf: 28, audioBitrate: '96k' }
      case 'medium':
        return { crf: 23, audioBitrate: '128k' }
      case 'high':
        return { crf: 18, audioBitrate: '192k' }
      default:
        return { crf: 23, audioBitrate: '128k' }
    }
  }

  /**
   * Obtiene metadata de un video
   */
  private async getVideoMetadata(filePath: string): Promise<{
    duration: number;
    resolution: string;
    bitrate: number;
  }> {
    try {
      const metadata = await FFmpegCommand.probe(filePath)

      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video')

      return {
        duration: metadata.format.duration || 0,
        resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : 'unknown',
        bitrate: parseInt(metadata.format.bit_rate || '0')
      }
    } catch (error) {
      // En caso de error, retornar valores por defecto
      return {
        duration: 0,
        resolution: 'unknown',
        bitrate: 0
      }
    }
  }

  /**
   * Asegura que el directorio temporal exista
   */
  private async ensureTempDir(): Promise<void> {
    const { mkdir } = await import('fs/promises')
    try {
      await mkdir('./uploads/temp', { recursive: true })
    } catch (error) {
      // Directorio ya existe
    }
  }

  /**
   * Obtiene el estado actual de la cola
   */
  getQueueStatus() {
    const items = Array.from(this.processingQueue.values())

    return {
      total: items.length,
      queued: items.filter(item => item.status === ProcessingStatus.QUEUED).length,
      processing: items.filter(item => item.status === ProcessingStatus.PROCESSING).length,
      completed: items.filter(item => item.status === ProcessingStatus.COMPLETED).length,
      failed: items.filter(item => item.status === ProcessingStatus.FAILED).length,
      isProcessing: this.isProcessing
    }
  }

  /**
   * Método público para testing - forzar procesamiento
   */
  async _processQueueForTesting(): Promise<void> {
    return this.processQueue()
  }

  /**
   * Limpia la cola de procesamiento (útil para tests)
   */
  clearQueue(): void {
    this.processingQueue.clear()
    this.isProcessing = false
  }
}

// Singleton instance
export const processingService = new ProcessingService()
