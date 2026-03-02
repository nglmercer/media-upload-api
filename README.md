# Widget Overlay API

Lightweight media upload and management API built on Bun + Hono. It lets you upload images, audio, and video, serves the uploaded files statically, and persists metadata to a JSON store.

## Quick Start

```bash
# Install dependencies
bun install

# Run the server
bun run dev
```

## Environment Variables

### Discovery Service (Service Discovery)

The API includes an optional UDP multicast service discovery feature that allows services to find each other on the local network automatically.

| Variable | Default | Description |
|----------|---------|-------------|
| `DISCOVERY_ENABLED` | `true` | Enable/disable service discovery (`true` or `false`) |
| `DISCOVERY_SERVICE_NAME` | `media-upload-api` | Name of your service for discovery |
| `DISCOVERY_SERVICE_VERSION` | `1.0.0` | Version of your service |
| `DISCOVERY_MULTICAST_ADDRESS` | `239.255.255.250` | Multicast group address |
| `DISCOVERY_MULTICAST_PORT` | `54321` | Multicast UDP port |
| `DISCOVERY_HEARTBEAT_INTERVAL` | `5000` | Heartbeat interval in milliseconds |
| `DISCOVERY_OFFLINE_TIMEOUT` | `15000` | Timeout before marking service as offline (ms) |
| `DISCOVERY_SETUP_HOOKS` | `true` | Setup process exit hooks (`true` or `false`)

**Example - Disable Discovery:**
```bash
DISCOVERY_ENABLED=false bun run dev
```

**Example - Custom Configuration:**
```bash
DISCOVERY_SERVICE_NAME=my-api DISCOVERY_SERVICE_VERSION=2.0.0 bun run dev
```

## Documentation

- [Getting Started](./docs/getting-started.md) - Installation and usage instructions.
- [Project Structure](./docs/project-structure.md) - Overview of files and folders.
- [API Reference](./docs/api-reference.md) - Detailed API endpoints documentation.

## Quick Links

- [Bun Documentation](https://bun.sh/docs)
- [Hono Documentation](https://hono.dev/)
