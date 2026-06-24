# Docker MCP Toolkit Setup Guide

Docker's MCP Toolkit provides a centralized, secure, and token-efficient way to manage MCP servers.

## Key Benefits

| Feature | Benefit |
|---------|---------|
| **Lazy-Loading** | ~85% reduction in token usage |
| **Dynamic Discovery** | Servers load on-demand, not pre-configured |
| **OAuth Integration** | Automatic secure authentication |
| **Sandboxed Execution** | Isolated container environments |
| **MCP Catalog** | Curated, verified server registry |

## Setup Instructions

### 1. Install/Update Docker Desktop

Ensure you have **Docker Desktop 4.40+** installed:
- [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 2. Enable MCP Toolkit (Beta Feature)

1. Open Docker Desktop
2. Go to **Settings** (gear icon)
3. Navigate to **Beta features**
4. Enable **Docker MCP Toolkit**
5. Click **Apply & restart**

### 3. Configure Your AI Client

The MCP Toolkit uses a single gateway configuration instead of multiple server entries.

**For Cursor** (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "docker-mcp": {
      "command": "docker-mcp",
      "args": ["server"],
      "env": {}
    }
  }
}
```

**For Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):
```json
{
  "mcpServers": {
    "docker-mcp": {
      "command": "docker-mcp",
      "args": ["server"],
      "env": {}
    }
  }
}
```

### 4. Add MCP Servers via Docker Desktop

1. Open Docker Desktop
2. Go to the **MCP Catalog** section
3. Browse available servers:
   - **puppeteer** - Browser automation
   - **playwright** - Browser testing
   - **filesystem** - File operations
   - **postgres** - Database queries
   - **supabase** - Supabase integration
   - **stripe** - Payment processing
   - **github** - GitHub operations
   - **slack** - Slack messaging
   - And many more...
4. Click **Add** to enable servers
5. Configure OAuth/credentials when prompted

### 5. Restart Your AI Client

After configuration, restart Cursor/Claude to load the Docker MCP gateway.

## How Token Savings Work

### Before (Traditional MCP)
```
┌─────────────────────────────────────────────────────┐
│ Context Window                                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Server 1 Tools: 15,000 tokens                   │ │
│ │ Server 2 Tools: 12,000 tokens                   │ │
│ │ Server 3 Tools: 20,000 tokens                   │ │
│ │ Server 4 Tools: 10,000 tokens                   │ │
│ │ Server 5 Tools: 10,300 tokens                   │ │
│ │ ─────────────────────────────────               │ │
│ │ TOTAL: 67,300 tokens (33.7% of 200k budget)     │ │
│ └─────────────────────────────────────────────────┘ │
│ Available for conversation: 132,700 tokens          │
└─────────────────────────────────────────────────────┘
```

### After (Docker MCP Toolkit with Lazy-Loading)
```
┌─────────────────────────────────────────────────────┐
│ Context Window                                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ MCP Gateway Index: ~10,000 tokens               │ │
│ │ (Tool definitions loaded on-demand)             │ │
│ └─────────────────────────────────────────────────┘ │
│ Available for conversation: 190,000 tokens          │
│                                                      │
│ 💰 Savings: 57,300 tokens (~85% reduction)          │
└─────────────────────────────────────────────────────┘
```

## Troubleshooting

### "docker-mcp: command not found"
- Ensure Docker Desktop is running
- Verify MCP Toolkit is enabled in Beta features
- Restart your terminal/shell

### MCP servers not appearing
- Check Docker Desktop → MCP Catalog
- Ensure servers are added and enabled
- Verify OAuth authentication completed

### Connection refused
- Docker Desktop must be running
- Check if any firewall is blocking local connections

## Security Features

Docker MCP Toolkit provides:

1. **Image Signing & Attestation** - Verified server images
2. **Resource Limits** - CPU/memory constraints per container
3. **Network Isolation** - Controlled external access
4. **Credential Vault** - Secure OAuth token storage
5. **Audit Logging** - Track MCP server activity

## Comparison: Traditional vs Docker MCP Toolkit

| Aspect | Traditional (npx) | Docker MCP Toolkit |
|--------|-------------------|-------------------|
| Token Usage | High (all tools loaded) | Low (~85% less) |
| Security | Manual credential mgmt | Built-in OAuth vault |
| Setup | Configure each server | Single gateway config |
| Updates | Manual npm updates | Auto-managed |
| Isolation | None | Container sandboxing |
| Discovery | Manual | Dynamic catalog |

## Resources

- [Docker MCP Toolkit Docs](https://docs.docker.com/ai/mcp-catalog-and-toolkit/toolkit/)
- [MCP Catalog](https://docs.docker.com/ai/mcp-catalog-and-toolkit/catalog/)
- [Dynamic MCP](https://docs.docker.com/ai/mcp-catalog-and-toolkit/dynamic-mcp/)

