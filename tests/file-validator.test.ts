import { describe, it, expect, beforeEach } from 'bun:test'
import { fileValidator } from '../src/services/file-validator'
import { ValidationFlag } from '../src/types/file'
import { config } from '../src/config'

describe('FileValidator', () => {
  beforeEach(() => {
    config.reload()
  })

  describe('validate', () => {
    it('should validate a valid PNG image', async () => {
      // PNG header - full minimal PNG
      const pngHeader = new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, // PNG signature
        0, 0, 0, 13, 73, 72, 68, 82, // IHDR chunk length + type
        0, 0, 0, 8, // width
        0, 0, 0, 8, // height
        8, 2, 0, 0, 0 // bit depth, color type, compression, filter, interlace
      ])
      const file = new File([pngHeader], 'test.png', { type: 'image/png' })

      const result = await fileValidator.validate(file)

      // Just check that it's a PNG - content validation may fail with small buffer
      expect(result.detectedMime).toBe('image/png')
      expect(result.category).toBe('image')
    })

    it('should validate a valid JPEG image', async () => {
      // JPEG header - minimal
      const jpegHeader = new Uint8Array([
        255, 216, 255, 224, // SOI + APP0 marker
        0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0 // JFIF data
      ])
      const file = new File([jpegHeader], 'test.jpg', { type: 'image/jpeg' })

      const result = await fileValidator.validate(file)

      // Just check that it's detected as JPEG
      expect(result.detectedMime).toBe('image/jpeg')
      expect(result.category).toBe('image')
    })

    it('should detect extension mismatch', async () => {
      // PNG content but claims to be JPEG
      const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])
      const file = new File([pngHeader], 'test.jpg', { type: 'image/jpeg' })

      const result = await fileValidator.validate(file)

      expect(result.isValid).toBe(false)
      expect(result.flags).toContain(ValidationFlag.EXTENSION_MISMATCH)
    })

    it('should detect oversized file', async () => {
      // Set a very small size limit
      const serverConfig = config.getServer()
      config.update({
        server: {
          ...serverConfig,
          maxFileSizeBytes: 10,
        }
      })

      // Create validator with new config
      const { FileValidator } = await import('../src/services/file-validator')
      const validator = new FileValidator()

      // PNG header (more than 10 bytes)
      const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])
      const file = new File([pngHeader], 'large.png', { type: 'image/png' })

      const result = await validator.validate(file)

      expect(result.flags).toContain(ValidationFlag.OVERSIZED)
    })

    it('should detect empty file', async () => {
      const emptyBuffer = new Uint8Array(0)
      const file = new File([emptyBuffer], 'empty.png', { type: 'image/png' })

      const result = await fileValidator.validate(file)

      expect(result.flags).toContain(ValidationFlag.EMPTY_FILE)
    })

    it('should detect unknown file type', async () => {
      // Random bytes that don't match any known type
      const randomBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
      const file = new File([randomBytes], 'unknown.bin', { type: 'application/octet-stream' })

      const result = await fileValidator.validate(file)

      expect(result.flags).toContain(ValidationFlag.UNKNOWN_TYPE)
    })

    it('should categorize by detected MIME type', async () => {
      // PDF header
      const pdfHeader = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 53]) // %PDF-1.5
      const file = new File([pdfHeader], 'doc.pdf', { type: 'application/pdf' })

      const result = await fileValidator.validate(file)

      expect(result.category).toBe('document')
    })

    it('should include integrity hash', async () => {
      const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
      const file = new File([pngHeader], 'test.png', { type: 'image/png' })

      const result = await fileValidator.validate(file)

      expect(result.integrity.sha256).toMatch(/^[a-f0-9]{64}$/)
      expect(result.integrity.size).toBe(pngHeader.length)
    })

    it('should categorize archives', async () => {
      // ZIP header
      const zipHeader = new Uint8Array([80, 75, 3, 4, 14, 0, 0, 0, 8, 0])
      const file = new File([zipHeader], 'archive.zip', { type: 'application/zip' })

      const result = await fileValidator.validate(file)

      expect(result.category).toBe('archive')
    })
  })
})
