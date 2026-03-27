# API Reference

## Files API
Base URL: `/api/files`

### Upload file
`POST /`
- **Headers**: `Content-Type: multipart/form-data`
- **Body**:
  - `file` (required) — the binary file
  - `metadata` (optional) — JSON string
- **Response**: `201 Created` with File object.

### List files
`GET /`
- **Query Params**:
  - `category` (optional) — filter by category
  - `status` (optional) — filter by status
  - `page` (optional) — page number (default: 1)
  - `pageSize` (optional) — items per page (default: 50)
- **Response**: Object with `files` array and `pagination` info.

### List categories
`GET /categories`
- **Response**: Available file categories.

### List suspicious files
`GET /suspicious`
- **Response**: Suspicious and quarantine files.

### Get file metadata
`GET /:id`
- **Params**: `:id` = UUID
- **Response**: File metadata object.

### Download file
`GET /:id/download`
- **Params**: `:id` = UUID
- **Response**: Binary file download.

### Delete file
`DELETE /:id`
- **Params**: `:id` = UUID
- **Response**: Success message.

### Update file status
`PUT /:id/status`
- **Params**: `:id` = UUID
- **Body**: `{ "status": "valid" | "suspicious" | "quarantine" | "deleted" }`
- **Response**: Updated file object.

## Quota API
Base URL: `/api/quota`

### Get user quota
`GET /`
- **Response**: User quota information (used, limit, etc.).

### Get global quota
`GET /global`
- **Response**: Global quota statistics.
