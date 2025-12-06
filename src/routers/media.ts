import { Hono } from "hono"
import path from "path"
import fs from "fs"
import { mkdir, unlink } from "fs/promises"
import { mediaStorage, ensureRecordForUrl } from "../store/mediaStore"
import type { MediaType } from "../store/types"
import { loadConfig } from "../config"
import { fileTypeFromBuffer } from 'file-type'

const mediaRouter = new Hono()

const EXT_BY_MIME: Record<string, string> = {
  // image
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  // audio
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/webm": ".weba",
  // video
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/ogg": ".ogv",
  "application/vnd.apple.mpegurl": ".m3u8",
  "application/x-mpegURL": ".m3u8",
  "video/MP2T": ".ts",
  // subtitle
  "text/vtt": ".vtt",
  "application/x-subrip": ".srt",
  "text/x-ssa": ".ssa",
  "text/x-ass": ".ass",
  // text
  "text/plain": ".txt",
  "text/markdown": ".md",
  "application/json": ".json",
  "text/xml": ".xml",
  "application/xml": ".xml",
  "text/csv": ".csv",
}

// Validation sets for file extensions
const EXT_IMAGE = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"])
const EXT_AUDIO = new Set([".mp3", ".wav", ".ogg", ".weba"])
const EXT_VIDEO = new Set([".mp4", ".webm", ".ogv", ".m3u8", ".ts"])
const EXT_SUBTITLE = new Set([".vtt", ".srt", ".ssa", ".ass", ".sub"])
const EXT_TEXT = new Set([".txt", ".md", ".json", ".xml", ".csv", ".log"])

function extFromFile(file: File): string {
  const byMime = EXT_BY_MIME[file.type]
  if (byMime) return byMime
  const name = file.name || ""
  const dot = name.lastIndexOf(".")
  return dot >= 0 ? name.slice(dot).toLowerCase() : ""
}

function isBinaryBuffer(buffer: Buffer): boolean {
  const checkLen = Math.min(buffer.length, 1000)
  for (let i = 0; i < checkLen; i++) {
    if (buffer[i] === 0) return true
  }
  return false
}

async function validateFileType(file: File, type: MediaType): Promise<boolean> {
  const buffer = await file.arrayBuffer()
  const nodeBuffer = Buffer.from(buffer)

  // 1. Try to detect type with file-type (checks magic numbers)
  let detected;
  try {
    detected = await fileTypeFromBuffer(buffer)
  } catch (e) {
    // file-type might throw on very small buffers or specific errors
    // We treat this as "detection failed"
  }

  if (detected) {
    // If it's a known binary format, check if it matches the requested type
    if (type === 'image' && detected.mime.startsWith('image/')) return true
    if (type === 'audio' && detected.mime.startsWith('audio/')) return true
    if (type === 'video') {
      if (detected.mime.startsWith('video/')) return true
      // Support for .ts files which are often detected as video/mp2t
      if (detected.mime === 'video/mp2t') return true
    }

    // For text/subtitle, ensure we didn't detect a binary media type
    if (type === 'text' || type === 'subtitle') {
      if (detected.mime.startsWith('image/') ||
        detected.mime.startsWith('audio/') ||
        detected.mime.startsWith('video/')) {
        return false
      }
      // Allow xml, json, etc.
      return true
    }

    // If we detected something but it didn't match the category
    return false
  }

  // 2. If file-type returned undefined, it might be plain text
  if (type === 'text' || type === 'subtitle') {
    // Check if it's binary (contains null bytes)
    // If it's binary, reject it (since we expect text)
    if (isBinaryBuffer(nodeBuffer)) return false
    return true
  }

  // Special handling for m3u8 (text-based but classified as video here)
  if (type === 'video') {
    const ext = extFromFile(file)
    if (ext === '.m3u8') {
      // m3u8 should be text-based
      if (isBinaryBuffer(nodeBuffer)) return false
      // basic content check
      const content = nodeBuffer.toString('utf8', 0, Math.min(nodeBuffer.length, 50))
      if (content.includes('#EXTM3U')) return true
    }

    // Special handling for .ts (MPEG-TS) if file-type failed
    if (ext === '.ts') {
      // MPEG-TS packets start with 0x47
      if (nodeBuffer.length > 0 && nodeBuffer[0] === 0x47) return true
    }
  }

  // For image/audio/video, if we couldn't detect type, reject it
  return false
}

function getDirectoryForType(type: MediaType): string {
  if (type === "subtitle") return "subtitles"
  if (type === "text") return "texts"
  return `${type}s`
}

async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.promises.stat(filePath)
    return stats.size
  } catch {
    return 0
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

mediaRouter.post("/upload/:type", async (c) => {
  const params = c.req.param()
  const type = params.type as MediaType
  if (!type || !["image", "audio", "video", "subtitle", "text"].includes(type)) {
    return c.json({ error: "Invalid media type. Use image, audio, video, subtitle, or text." }, 400)
  }

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch (e) {
    return c.json({ error: "Invalid form data. Expected multipart/form-data." }, 400)
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return c.json({ error: "Missing file field 'file'." }, 400)
  }

  const isValid = await validateFileType(file, type)
  if (!isValid) {
    return c.json({ error: `Uploaded file does not match type '${type}' or is invalid.` }, 400)
  }

  const id = crypto.randomUUID()
  const ext = extFromFile(file)

  const config = loadConfig()
  const uploadsDir = path.isAbsolute(config.uploadsDir)
    ? config.uploadsDir
    : path.join(process.cwd(), config.uploadsDir)

  const baseDir = path.join(uploadsDir, getDirectoryForType(type))
  const fileName = `${id}${ext}`
  const filePath = path.join(baseDir, fileName)

  await mkdir(baseDir, { recursive: true })

  // Persist file to disk
  await Bun.write(filePath, file)

  // Get file size
  const fileSize = await getFileSize(filePath)

  const url = `/uploads/${getDirectoryForType(type)}/${fileName}`
  const name = (formData.get("name") ?? file.name ?? fileName).toString()

  let meta: Record<string, unknown> = {}
  const metaRaw = formData.get("metadata")
  if (typeof metaRaw === "string") {
    try {
      meta = JSON.parse(metaRaw)
    } catch {
      return c.json({ error: "Invalid metadata JSON." }, 400)
    }
  }

  const record = {
    id,
    type,
    url,
    name,
    size: fileSize,
    sizeFormatted: formatFileSize(fileSize),
    metadata: meta,
  } as const

  await mediaStorage.save(id, record)

  return c.json(record, 201)
})

mediaRouter.delete('/:id', async (c) => {
  const params = c.req.param()
  const id = params.id

  try {
    const media = await mediaStorage.load(id)
    if (!media) {
      return c.json({ error: 'Media not found' }, 404)
    }

    if (media.url) {
      const config = loadConfig()
      const uploadsDir = path.isAbsolute(config.uploadsDir)
        ? config.uploadsDir
        : path.join(process.cwd(), config.uploadsDir)

      const type = media.type
      const ext = path.extname(media.url)
      const fileName = `${id}${ext}`
      const baseDir = path.join(uploadsDir, getDirectoryForType(type))
      const filePath = path.join(baseDir, fileName)

      try {
        await unlink(filePath)
      } catch (e) {
        return c.json({ error: 'Failed to delete media file' }, 500)
      }
    }

    await mediaStorage.delete(id)
    return c.json({ message: 'Media deleted successfully' })
  } catch (e) {
    return c.json({ error: 'Failed to delete media' }, 500)
  }
})

mediaRouter.post('/sync', async (c) => {
  const types: MediaType[] = ['image', 'audio', 'video', 'subtitle', 'text']
  const existing = await mediaStorage.getAll()
  const known = new Set(Object.values(existing).map((m) => m.url))

  let addedTotal = 0
  const addedByType: Record<MediaType, number> = {
    image: 0,
    audio: 0,
    video: 0,
    subtitle: 0,
    text: 0
  }

  const config = loadConfig()
  const uploadsDir = path.isAbsolute(config.uploadsDir)
    ? config.uploadsDir
    : path.join(process.cwd(), config.uploadsDir)

  for (const type of types) {
    const dir = path.join(uploadsDir, getDirectoryForType(type))
    let files: string[] = []

    try {
      files = await fs.promises.readdir(dir)
    } catch {
      continue
    }

    for (const file of files) {
      if (file.startsWith('.')) continue

      const ext = path.extname(file).toLowerCase()
      const extSet = type === 'image' ? EXT_IMAGE
        : type === 'audio' ? EXT_AUDIO
          : type === 'video' ? EXT_VIDEO
            : type === 'subtitle' ? EXT_SUBTITLE
              : EXT_TEXT

      if (!extSet.has(ext)) continue

      const url = `/uploads/${getDirectoryForType(type)}/${file}`
      if (known.has(url)) continue

      await ensureRecordForUrl({ type, url, name: file })
      known.add(url)
      addedTotal++
      addedByType[type]++
    }
  }

  return c.json({
    message: 'Sync completed successfully',
    added: addedTotal,
    details: addedByType,
  })
})

mediaRouter.get('/data', async (c) => {
  const data = await mediaStorage.getAll()
  return c.json(data)
})

mediaRouter.get('/data/:type', async (c) => {
  const params = c.req.param()
  const type = params.type as MediaType

  if (!type || !["image", "audio", "video", "subtitle", "text"].includes(type)) {
    return c.json({ error: "Invalid media type. Use image, audio, video, subtitle, or text." }, 400)
  }

  const data = await mediaStorage.getAll()
  const filtered = Object.values(data).filter((m) => m.type === type)

  return c.json(filtered)
})

mediaRouter.get('/stats', async (c) => {
  const data = await mediaStorage.getAll()
  const allMedia = Object.values(data)

  const stats = {
    total: {
      count: allMedia.length,
      size: 0,
      sizeFormatted: "0 B"
    },
    byType: {} as Record<MediaType, { count: number; size: number; sizeFormatted: string }>
  }

  const types: MediaType[] = ['image', 'audio', 'video', 'subtitle', 'text']

  for (const type of types) {
    stats.byType[type] = { count: 0, size: 0, sizeFormatted: "0 B" }
  }

  for (const media of allMedia) {
    // Calculate actual file size from disk
    const config = loadConfig()
    const uploadsDir = path.isAbsolute(config.uploadsDir)
      ? config.uploadsDir
      : path.join(process.cwd(), config.uploadsDir)

    // Reconstruct path properly
    const type = media.type
    const ext = path.extname(media.url)
    const fileName = `${media.id}${ext}`
    const baseDir = path.join(uploadsDir, getDirectoryForType(type))
    const filePath = path.join(baseDir, fileName)

    const size = await getFileSize(filePath)

    stats.total.size += size

    if (media.type in stats.byType) {
      stats.byType[media.type].count++
      stats.byType[media.type].size += size
    }
  }

  stats.total.sizeFormatted = formatFileSize(stats.total.size)

  for (const type of types) {
    stats.byType[type].sizeFormatted = formatFileSize(stats.byType[type].size)
  }

  return c.json(stats)
})

mediaRouter.get('/:id', async (c) => {
  const id = c.req.param('id')

  try {
    const media = await mediaStorage.load(id)
    if (!media) {
      return c.json({ error: 'Media not found' }, 404)
    }
    return c.json(media)
  } catch (e) {
    return c.json({ error: 'Failed to fetch media' }, 500)
  }
})

mediaRouter.get('/:id/size', async (c) => {
  const params = c.req.param()
  const id = params.id

  try {
    const media = await mediaStorage.load(id)
    if (!media) {
      return c.json({ error: 'Media not found' }, 404)
    }

    const config = loadConfig()
    const uploadsDir = path.isAbsolute(config.uploadsDir)
      ? config.uploadsDir
      : path.join(process.cwd(), config.uploadsDir)

    // Reconstruct path properly
    const type = media.type
    const ext = path.extname(media.url)
    const fileName = `${media.id}${ext}`
    const baseDir = path.join(uploadsDir, getDirectoryForType(type))
    const filePath = path.join(baseDir, fileName)

    const size = await getFileSize(filePath)

    return c.json({
      id: media.id,
      size,
      sizeFormatted: formatFileSize(size)
    })
  } catch (e) {
    return c.json({ error: 'Failed to get file size' }, 500)
  }
})

export { mediaRouter }