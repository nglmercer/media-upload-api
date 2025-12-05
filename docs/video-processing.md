# Video Processing con FFmpeg-lib

Esta documentación describe la implementación del sistema de procesamiento de videos utilizando ffmpeg-lib para el proyecto widget-overlay-api.

## Overview

El sistema de procesamiento de videos permite:

- Seleccionar un video obligatorio
- Agregar tracks de audio opcionales
- Agregar subtítulos opcionales
- Procesar con ffmpeg-lib
- Subir resultados a S3 (mock)
- Gestionar cola de procesamiento con estados

## Arquitectura

### Componentes Principales

1. **Types** (`src/store/types.ts`)
   - Define tipos para procesamiento, configuración y estados

2. **S3 Mock Service** (`src/services/s3Mock.ts`)
   - Simula el servicio S3 para desarrollo
   - Almacena archivos localmente en `./uploads/processed`

3. **Processing Service** (`src/services/processingService.ts`)
   - Orquesta el procesamiento con ffmpeg-lib
   - Gestiona la cola de procesamiento
   - Actualiza estados de los drafts

4. **Drafts Router** (`src/routers/drafts.ts`)
   - Endpoints para gestionar drafts y procesamiento
   - APIs para consulta de estados de cola

## Estados de Procesamiento

```typescript
enum ProcessingStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
```

## API Endpoints

### Drafts

#### `POST /api/drafts/:id/process`
Inicia el procesamiento de un draft.

**Body:**
```json
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

**Response:**
```json
{
  "message": "Draft added to processing queue",
  "draft": {
    "id": "draft-123",
    "processingStatus": "queued",
    "processingConfig": {...},
    "queuedAt": 1672531200000
  }
}
```

#### `GET /api/drafts/:id/processing-status`
Obtiene el estado de procesamiento de un draft.

**Response:**
```json
{
  "draftId": "draft-123",
  "processingStatus": "processing",
  "processingResult": null,
  "processingError": null,
  "queuedAt": 1672531200000,
  "startedProcessingAt": 1672531260000,
  "completedProcessingAt": null
}
```

### Cola de Procesamiento

#### `GET /api/drafts/queue/status`
Obtiene el estado general de la cola.

**Response:**
```json
{
  "total": 5,
  "queued": 2,
  "processing": 1,
  "completed": 2,
  "failed": 0,
  "isProcessing": true
}
```

#### `GET /api/drafts/queue/items`
Obtiene los items en la cola (opcionalmente filtrados por estado).

**Query Parameters:**
- `status`: Filtrar por estado de procesamiento

**Response:**
```json
[
  {
    "id": "draft-123",
    "processingStatus": "processing",
    "queuedAt": 1672531200000,
    "startedProcessingAt": 1672531260000,
    "completedProcessingAt": null,
    "processingError": null,
    "processingResult": null
  }
]
```

## Flujo de Procesamiento

1. **Creación del Draft**: Se crea un draft con contenido y media básicos
2. **Configuración de Procesamiento**: Se envía configuración a `/api/drafts/:id/process`
3. **Queue**: El draft se agrega a la cola con estado `QUEUED`
4. **Processing**: El servicio procesa secuencialmente los items en cola
5. **FFmpeg Processing**: Se ejecuta ffmpeg-lib con la configuración especificada
6. **Upload**: El resultado se sube al S3 mock
7. **Completion**: Se actualiza el draft con el resultado y estado `COMPLETED`

## Configuración de Calidad

El sistema soporta tres niveles de calidad:

- **Low**: CRF 28, Audio 96k
- **Medium**: CRF 23, Audio 128k (default)
- **High**: CRF 18, Audio 192k

## Formatos Soportados

### Video
- Formatos de entrada: MP4, AVI, MOV, MKV, etc.
- Formato de salida: MP4 (por defecto)

### Audio
- Formatos: MP3, AAC, WAV, etc.
- Múltiples tracks de audio soportados

### Subtítulos
- Formatos: SRT, VTT, ASS
- Múltiples tracks de subtítulos soportados

## Almacenamiento

### Estructura de Directorios

```
uploads/
├── temp/              # Archivos temporales de procesamiento
├── processed/         # Archivos procesados finales
└── [archivos originales]
```

### S3 Mock

El mock de S3 simula:
- Upload de archivos a `./uploads/processed`
- Generación de URLs firmadas
- Metadata de archivos (etag, bucket, etc.)

## Errores y Manejo

### Estados de Error

- **FAILED**: El procesamiento falló
- `processingError`: Mensaje de error específico
- `completedProcessingAt`: Timestamp del error

### Tipos de Errores Comunes

1. **Archivo no encontrado**: Video o archivos de medios inexistentes
2. **Error de FFmpeg**: Problemas durante el procesamiento
3. **Error de S3**: Fallos en el upload del resultado
4. **Validación**: Configuración inválida

## Testing

### Tests Unitarios

```bash
bun test tests/processing.test.ts
```

### Tests de Integración

```bash
bun test tests/integration.test.ts
```

### Coverage

```bash
bun test --coverage
```

## Desarrollo

### Configuración Inicial

1. Instalar dependencias:
```bash
npm install ffmpeg-lib
```

2. Crear directorios necesarios:
```bash
mkdir -p uploads/temp
mkdir -p uploads/processed
```

3. Iniciar servidor:
```bash
bun run dev
```

### Variables de Entorno

No se requieren variables de entorno adicionales para el desarrollo.

## Optimizaciones Futuras

1. **Procesamiento Paralelo**: Múltiples items simultáneos
2. **Worker Processes**: Separar FFmpeg a procesos dedicados
3. **Cache**: Evitar reprocesamiento de archivos idénticos
4. **Progress Tracking**: Reporte de progreso en tiempo real
5. **Quality Presets**: Configuraciones predefinidas de calidad

## Consideraciones de Performance

- **Memory**: Los archivos temporales se limpian automáticamente
- **CPU**: FFmpeg es intensivo, considerar límites concurrentes
- **Storage**: Monitorizar espacio en disco para archivos temporales
- **Network**: S3 mock local, implementar S3 real para producción

## Seguridad

- **Input Validation**: Validación estricta de archivos de entrada
- **Path Traversal**: Sanitización de rutas de archivos
- **Resource Limits**: Límites de tamaño y duración de videos
- **Access Control**: Verificación de permisos para drafts

## Monitorización

### Logs

El sistema genera logs para:
- Inicio/fin de procesamiento
- Errores de FFmpeg
- Estados de cola
- Operaciones de S3

### Métricas

- Tiempo promedio de procesamiento
- Tasa de éxito/fracaso
- Tamaño promedio de archivos
- Utilización de recursos
