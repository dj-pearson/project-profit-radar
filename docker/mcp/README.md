# MCP Docker Setup

This directory contains Docker configurations for running Model Context Protocol (MCP) servers in containers.

## Quick Start

### 1. Build all images

**Windows (PowerShell):**
```powershell
cd docker/mcp
.\build-all.ps1
```

**Linux/macOS:**
```bash
cd docker/mcp
chmod +x build-all.sh
./build-all.sh
```

### 2. Configure Environment

Copy `env.example.txt` to `.env` and fill in your credentials:

```bash
cp env.example.txt .env
```

### 3. Restart Cursor

After building the images and updating the MCP configuration, restart Cursor IDE to load the new MCP servers.

## Available MCP Servers

| Server | Description | Docker Image |
|--------|-------------|--------------|
| **playwright** | Browser automation with Playwright | `mcp-playwright:latest` |
| **puppeteer** | Browser automation with Puppeteer | `mcp-puppeteer:latest` |
| **sequential-thinking** | Step-by-step reasoning | `mcp-sequential-thinking:latest` |
| **filesystem** | File system operations | `mcp-filesystem:latest` |
| **memory** | Persistent knowledge base | `mcp-memory:latest` |
| **context7** | Upstash context storage | `mcp-context7:latest` |
| **supabase** | Supabase database operations | `mcp-supabase:latest` |

## Architecture

```
┌─────────────────┐     stdio     ┌─────────────────┐
│   Cursor IDE    │ ◄──────────► │  Docker         │
│                 │               │  Container      │
│   MCP Client    │               │  (MCP Server)   │
└─────────────────┘               └─────────────────┘
```

Each MCP server runs in its own Docker container:
- Communication happens via stdin/stdout (stdio transport)
- Containers are ephemeral (`--rm` flag)
- Volumes are used for persistence where needed

## Configuration Files

### Cursor Global Config
Location: `~/.cursor/mcp.json`

This is automatically updated to use Docker commands.

### Project-specific Config
Location: `mcp-server-config.json` in project root

## Manual Testing

Test individual MCP servers:

```bash
# Test playwright MCP
echo '{"jsonrpc":"2.0","method":"initialize","id":1}' | docker run -i --rm mcp-playwright:latest

# Test filesystem MCP (with mounted directory)
docker run -i --rm -v "$(pwd):/workspace" mcp-filesystem:latest
```

## Troubleshooting

### Docker not running
```
error during connect: This error may indicate that the docker daemon is not running.
```
**Solution:** Start Docker Desktop

### Image not found
```
Unable to find image 'mcp-playwright:latest' locally
```
**Solution:** Run the build script first

### Permission denied
```
Got permission denied while trying to connect to the Docker daemon socket
```
**Solution (Linux):** Add your user to the docker group:
```bash
sudo usermod -aG docker $USER
```

### Container name conflict
```
Conflict. The container name "mcp-xxx-session" is already in use
```
**Solution:** Remove the existing container:
```bash
docker rm -f mcp-xxx-session
```

## Volume Data

Persistent data is stored in Docker volumes:
- `mcp-memory-data` - Memory server data
- `playwright-data` - Playwright browser data
- `puppeteer-data` - Puppeteer browser data

To reset:
```bash
docker volume rm mcp-memory-data playwright-data puppeteer-data
```

## Security Notes

- Containers run as non-root users where possible
- Network access is restricted (`--network host` only for browser servers)
- File system access is limited to mounted volumes
- Credentials are passed via environment variables (not baked into images)

