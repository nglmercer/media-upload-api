# Project Structure

```
.
├─ src/
│  ├─ index.ts                # App setup, middleware, route mounting
│  ├─ routers/
│  │  └─ media.ts             # Media upload + delete endpoints
│  └─ store/
│     └─ mediaStore.ts        # JSON-backed metadata store
├─ uploads/                   # Created at runtime (images/, audios/, videos/)
├─ media/                     # Data storage directory
│  └─ media.json              # Media metadata managed by json-obj-manager
├─ fetch/                     # Client-side API wrappers
│  ├─ config/                 # API configuration
│  ├─ commons/                # Base API classes
│  └─ fetchapi.ts             # Media API client
└─ package.json
```

## Runtime behavior
- **CORS** is enabled for all origins and request logging is active.
- **Static files** are served under `/uploads/*` from the project root.
- **Media routes** are mounted at `/api/media`.

## Storage
- **Files**: `uploads/images`, `uploads/audios`, `uploads/videos`, `uploads/subtitles` (created on demand)
- **Metadata**: 
  - `media/media.json`: Stores metadata for uploaded files.
