# API Reference

## Media API
Base URL: `/api/media`

### Upload media
`POST /upload/:type`
- **Params**: `:type` = `image` | `audio` | `video` | `subtitle`
- **Headers**: `Content-Type: multipart/form-data`
- **Body**:
  - `file` (required) — the binary file
  - `name` (optional) — display name
  - `metadata` (optional) — JSON string (e.g. `{"duration": 120}`)
- **Response**: `201 Created` with Media object.

### List media
`GET /data`
- **Response**: Array of all media records.

`GET /data/:type`
- **Params**: `:type` = `image` | `audio` | `video` | `subtitle`
- **Response**: Array of media records of the specified type.

### Get Media Stats
`GET /stats`
- **Response**: Statistics about stored media (count, size).

### Get Media Size
`GET /:id/size`
- **Params**: `:id` = UUID
- **Response**: Size information for the media file.

### Delete media
`DELETE /:id`
- **Params**: `:id` = UUID
- **Response**: `200 OK`

### Sync Media
`POST /sync`
- Scans the uploads directory and adds missing files to the database.
