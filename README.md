# Widget Overlay API

Una API RESTful para gestionar drafts y procesamiento de videos con ffmpeg-lib.

## Features

- **Media Management**: Upload y gestión de archivos multimedia
- **Draft System**: Creación y gestión de drafts con contenido
- **Video Processing**: Procesamiento de videos con ffmpeg-lib
- **Queue Management**: Sistema de colas para procesamiento asíncrono
- **S3 Integration**: Mock de S3 para almacenamiento de archivos procesados
- **WebSocket Support**: Comunicación en tiempo real
- **TypeScript**: Tipado completo para mejor desarrollo

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Language**: TypeScript
- **Storage**: JSON files (json-obj-manager)
- **Video Processing**: ffmpeg-lib
- **Testing**: Bun test
- **Validation**: Zod

## Quick Start

### Prerequisites

- Node.js 18+ o Bun
- FFmpeg instalado en el sistema

### Installation

```bash
# Clone el repositorio
git clone https://github.com/nglmercer/widget-overlay-api.git
cd widget-overlay-api

# Instale dependencias
npm install

# Instale ffmpeg-lib
npm install ffmpeg-lib

# Cree directorios necesarios
mkdir -p uploads/temp
mkdir -p uploads/processed
```

### Development

```bash
# Iniciar servidor de desarrollo
npm run dev

# Ejecutar tests
npm test

# Type checking
npm run typecheck
```

## API Documentation

### Media Endpoints

#### Upload Media
```http
POST /api/media/upload/:type
Content-Type: multipart/form-data

# Types: image, video, audio, subtitle, text
```

#### Get Media
```http
GET /api/media/:id          # Obtener media por ID
GET /api/media/data/:type    # Obtener media por tipo
DELETE /api/media/:id        # Eliminar media
GET /api/media/stats         # Estadísticas de media
```

### Drafts Endpoints

#### Draft Management
```http
POST   /api/drafts           # Crear draft
GET    /api/drafts           # Listar drafts
GET    /api/drafts/:id       # Obtener draft por ID
PUT    /api/drafts/:id       # Actualizar draft
DELETE /api/drafts/:id       # Eliminar draft
```

#### Video Processing
```http
POST /api/drafts/:id/process
Content-Type: application/json

{
  "videoFile": {
    "id": "video-123",
    "name": "main-video.mp4",
    "url": "/uploads/main-video.mp4"
  },
  "audioTracks": [
    {
      "id": "audio-en",
      "name": "English Audio",
      "language": "en",
      "url": "/uploads/audio-en.mp3"
    }
  ],
  "subtitleTracks": [
    {
      "id": "subs-en",
      "name": "English Subtitles",
      "language": "en",
      "url": "/uploads/subs-en.srt",
      "format": "srt"
    }
  ],
  "outputFormat": "mp4",
  "quality": "medium"
}
```

#### Processing Status
```http
GET /api/drafts/:id/processing-status    # Estado de procesamiento
GET /api/drafts/queue/status            # Estado general de la cola
GET /api/drafts/queue/items             # Items en la cola
```

## Video Processing

### Supported Features

- **Video Input**: MP4, AVI, MOV, MKV
- **Audio Tracks**: MP3, AAC, WAV (múltiples tracks)
- **Subtitles**: SRT, VTT, ASS (múltiples tracks)
- **Output Formats**: MP4 (por defecto)
- **Quality Levels**: Low, Medium, High

### Processing Flow

1. **Upload Media**: Subir video, audio y subtítulos
2. **Create Draft**: Crear draft con contenido básico
3. **Configure Processing**: Enviar configuración a `/api/drafts/:id/process`
4. **Queue Processing**: El draft se agrega a la cola
5. **Async Processing**: FFmpeg procesa el video
6. **Upload Result**: Se sube a S3 mock
7. **Complete Status**: El draft se marca como completado

### Quality Settings

| Quality | Video CRF | Audio Bitrate | Description |
|---------|------------|---------------|-------------|
| Low     | 28         | 96k           | Menor calidad, menor tamaño |
| Medium  | 23         | 128k          | Balance calidad/tamaño |
| High    | 18         | 192k          | Máxima calidad |

## File Structure

```
src/
├── config.ts              # Configuración de la aplicación
├── index.ts               # Entry point
├── Emitter.ts            # Sistema de eventos
├── websocket-adapter.ts   # Adaptador WebSocket
├── routers/
│   ├── drafts.ts         # Endpoints de drafts
│   └── media.ts         # Endpoints de media
├── store/
│   ├── draftStore.ts     # Almacenamiento de drafts
│   ├── mediaStore.ts     # Almacenamiento de media
│   └── types.ts         # Tipos TypeScript
├── services/
│   ├── processingService.ts # Servicio de procesamiento
│   └── s3Mock.ts        # Mock de S3
└── validators/
    └── draft.ts         # Validación de drafts

uploads/
├── temp/                # Archivos temporales
├── processed/           # Archivos procesados
└── [archivos originales]

tests/                   # Tests unitarios e integración
docs/                    # Documentación
```

## Configuration

La configuración se guarda en `config.json`:

```json
{
  "host": "0.0.0.0",
  "port": 3000,
  "mediaFile": "media/media.json",
  "uploadsDir": "uploads"
}
```

## Environment Variables

```bash
# Puerto del servidor (opcional, default: 3000)
PORT=3000

# Directorio de uploads (opcional, default: uploads)
UPLOADS_DIR=uploads
```

## Testing

```bash
# Ejecutar todos los tests
npm test

# Tests unitarios
npm run test:unit

# Tests de integración
npm run test:integration

# Coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Development Workflow

### 1. Upload Media Files

```bash
# Subir video principal
curl -X POST http://localhost:3000/api/media/upload/video \
  -F "file=@video.mp4" \
  -F 'metadata={"name":"main-video","tags":["main"]}'

# Subir audio opcional
curl -X POST http://localhost:3000/api/media/upload/audio \
  -F "file=@audio.mp3" \
  -F 'metadata={"name":"english-audio","language":"en"}'

# Subir subtítulos opcionales
curl -X POST http://localhost:3000/api/media/upload/subtitle \
  -F "file=@subtitles.srt" \
  -F 'metadata={"name":"english-subs","language":"en","format":"srt"}'
```

### 2. Create Draft

```bash
curl -X POST http://localhost:3000/api/drafts \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Mi video procesado",
    "mediaIds": ["video-123", "audio-456"],
    "tags": ["processed", "demo"]
  }'
```

### 3. Start Processing

```bash
curl -X POST http://localhost:3000/api/drafts/draft-123/process \
  -H "Content-Type: application/json" \
  -d '{
    "videoFile": {
      "id": "video-123",
      "name": "main-video.mp4",
      "url": "/uploads/video-123.mp4"
    },
    "audioTracks": [{
      "id": "audio-456",
      "name": "English Audio",
      "language": "en",
      "url": "/uploads/audio-456.mp3"
    }],
    "subtitleTracks": [{
      "id": "subs-789",
      "name": "English Subtitles",
      "language": "en",
      "url": "/uploads/subs-789.srt",
      "format": "srt"
    }],
    "quality": "high"
  }'
```

### 4. Monitor Processing

```bash
# Ver estado del draft
curl http://localhost:3000/api/drafts/draft-123/processing-status

# Ver estado de la cola
curl http://localhost:3000/api/drafts/queue/status

# Ver items en cola
curl http://localhost:3000/api/drafts/queue/items
```

## Error Handling

### Common Error Codes

- **400**: Bad Request - Validación fallida
- **404**: Not Found - Recurso no encontrado
- **500**: Internal Server Error - Error del servidor

### Processing Errors

- **QUEUED**: El draft está en cola
- **PROCESSING**: Se está procesando actualmente
- **COMPLETED**: Procesamiento exitoso
- **FAILED**: Error durante el procesamiento

## Performance Considerations

- **CPU Usage**: FFmpeg es intensivo, monitorizar uso
- **Storage**: Los archivos temporales se limpian automáticamente
- **Memory**: Procesamiento secuencial para evitar sobrecarga
- **Network**: S3 mock local para desarrollo

## Production Deployment

### Considerations

1. **FFmpeg**: Instalar FFmpeg en el servidor
2. **Storage**: Implementar S3 real en lugar del mock
3. **Queue**: Considerar Redis para colas distribuidas
4. **Monitoring**: Implementar logs y métricas
5. **Security**: Validación de inputs y rate limiting

### Docker Deployment

```dockerfile
FROM oven/bun:latest

# Instalar FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /app
COPY package*.json ./
RUN bun install

COPY . .

EXPOSE 3000
CMD ["bun", "src/index.ts"]
```

## Contributing

1. Fork el proyecto
2. Crear feature branch
3. Hacer cambios con tests
4. Ejecutar `npm run typecheck`
5. Submit pull request

## License

MIT License - ver archivo LICENSE

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: GitHub Issues
- **Examples**: Ver sección de Development Workflow

## Changelog

### v2.0.0 - Video Processing
- ✨ Implementación de ffmpeg-lib
- ✨ Sistema de colas de procesamiento
- ✨ Mock de S3
- ✨ Endpoints de procesamiento
- ✨ Soporte para múltiples tracks de audio/subtítulos
- ✨ Configuración de calidad

### v1.0.0 - Base API
- ✨ Media management
- ✨ Draft system
- ✨ WebSocket support
- ✨ Testing suite
