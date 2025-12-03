# Tests para Widget Overlay API

Este directorio contiene el conjunto completo de tests para la API de gestión de media construida con Hono y Bun.

## Estructura de Tests

```
tests/
├── setup.ts              # Configuración global de tests
├── helpers/
│   └── test-utils.ts     # Utilidades reutilizables para tests
├── basic.test.ts         # Tests básicos de infraestructura
├── config.test.ts        # Tests unitarios del sistema de configuración
├── store.test.ts         # Tests unitarios del almacenamiento de media
├── media.test.ts         # Tests de integración del router de media
├── integration.test.ts    # Tests end-to-end completos
└── README.md            # Esta documentación
```

## Scripts de Test

Disponibles en `package.json`:

- `bun test` - Ejecuta todos los tests
- `bun test --watch` - Ejecuta tests en modo watch
- `bun test --coverage` - Ejecuta tests con cobertura
- `bun test tests/unit.test.ts tests/config.test.ts` - Tests unitarios
- `bun test tests/media.test.ts tests/integration.test.ts` - Tests de integración

## Tipos de Tests

### 1. Tests Unitarios
- **config.test.ts**: Prueba el sistema de configuración
  - Creación, carga y guardado de configuración
  - Manejo de configuraciones parciales e inválidas

- **store.test.ts**: Prueba el almacenamiento de media
  - Guardado, carga y eliminación de items
  - Sincronización de URLs existentes

### 2. Tests de Integración
- **media.test.ts**: Prueba los endpoints del router
  - Upload de diferentes tipos de media (imagen, video, audio, subtítulos)
  - Validación de tipos MIME y metadata
  - Eliminación y consulta de media

- **integration.test.ts**: Pruebas end-to-end
  - Flujo completo: upload → consulta → eliminación
  - Manejo de múltiples tipos de media
  - Sincronización de archivos existentes

### 3. Tests de Infraestructura
- **basic.test.ts**: Verifica el setup de tests
  - Creación de archivos mock
  - Configuración y limpieza del entorno

## Características de los Tests

### Aislamiento
- Cada test tiene su propio entorno aislado
- Limpieza automática antes y después de cada test
- Instancias frescas de almacenamiento para cada test

### Mocking
- Archivos mock para todos los tipos de media soportados
- Headers realistas para PNG, JPEG, MP4, MP3, VTT, etc.
- FormData simulado para uploads

### Cobertura
- Tests de casos de éxito y error
- Validación de tipos y formatos
- Manejo de archivos inválidos y metadata malformada

## Ejecución

Para ejecutar todos los tests:
```bash
bun test
```

Para ejecutar un archivo específico:
```bash
bun test tests/config.test.ts
```

Para ejecutar con cobertura:
```bash
bun test --coverage
```

## Problemas Conocidos y Soluciones

### 1. Aislamiento de Tests
Los tests comparten el mismo sistema de archivos. Para resolver esto:
- Se usa cleanup completo en `beforeEach` y `afterEach`
- Se eliminan directorios `uploads/`, `media/` y `config.json`
- Se crean instancias separadas de almacenamiento

### 2. FormData en Bun
Bun maneja FormData diferente a Node.js. Los tests usan:
- Constructores nativos de `File` y `FormData`
- Headers realistas para cada tipo de media
- Validación correcta de respuestas JSON

### 3. Persistencia entre Tests
El almacenamiento `json-obj-manager` persiste datos. Solución:
- Path único para cada test: `media/test-media.json`
- Limpieza completa entre tests
- Instancias fresh del storage

## API Cubierta

### Media Management
- ✅ `POST /api/media/upload/:type` - Upload de archivos
- ✅ `DELETE /api/media/:id` - Eliminación de media
- ✅ `GET /api/media/data/:type` - Consulta por tipo
- ✅ `GET /api/media/stats` - Estadísticas
- ✅ `GET /api/media/:id/size` - Tamaño de archivo
- ✅ `POST /api/media/sync` - Sincronización

### Tipos Soportados
- ✅ Images: PNG, JPEG, WebP, GIF, SVG
- ✅ Videos: MP4, WebM, OGV
- ✅ Audio: MP3, WAV, OGG, WebA
- ✅ Subtitles: VTT, SRT, SSA, ASS

## Contribución

Para añadir nuevos tests:

1. Usar los helpers en `tests/helpers/test-utils.ts`
2. Seguir el patrón de `beforeEach`/`afterEach` para aislamiento
3. Incluir tests de éxito y error
4. Validar códigos de estado HTTP y respuestas JSON
5. Limpiar recursos creados durante el test
