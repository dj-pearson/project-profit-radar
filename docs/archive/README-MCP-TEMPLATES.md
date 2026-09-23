# MCP Configuration Templates

## Overview

The MCP (Model Context Protocol) configuration files have been secured to prevent accidental token commits. The actual configuration files (`.mcprc` and `mcp-server-config.json`) are now gitignored, while template versions are provided for setup.

## Template Files

### 1. `.mcprc.example`

Template for the main MCP runtime configuration.

### 2. `mcp-server-config.example.json`

Template for MCP server configuration.

## Setup Process

### For First-Time Setup:

```bash
# Copy templates to create your local configuration files
cp .mcprc.example .mcprc
cp mcp-server-config.example.json mcp-server-config.json

# These files (.mcprc and mcp-server-config.json) are gitignored and won't be committed
```

### Setting Up Your Supabase Token:

1. **Get Your Personal Access Token:**

   - Visit [Supabase Dashboard - Account Tokens](https://supabase.com/dashboard/account/tokens)
   - Create a new token with appropriate permissions
   - Copy the token (starts with `sbp_`)

2. **Set Environment Variable:**

   ```bash
   # Method 1: In your shell profile (.bashrc, .zshrc, etc.)
   export SUPABASE_ACCESS_TOKEN="sbp_your_token_here"

   # Method 2: Create .env.mcp.local file (recommended)
   echo "SUPABASE_ACCESS_TOKEN=sbp_your_token_here" > .env.mcp.local
   ```

3. **Verify Setup:**
   ```bash
   npm run security-check
   npm run mcp:supabase  # Should work without errors
   ```

## Template Contents

Both template files use environment variable references:

```json
"--access-token", "${SUPABASE_ACCESS_TOKEN}"
```

This ensures no actual tokens are stored in configuration files.

## Security Features

- ✅ **Local files are gitignored** - Your actual config files won't be committed
- ✅ **Templates are safe to commit** - Only contain environment variable references
- ✅ **Personal token isolation** - Each developer uses their own token
- ✅ **No shared secrets** - Tokens are not distributed through version control

## Team Onboarding

When new team members join:

1. **Clone repository**
2. **Copy templates**: `cp .mcprc.example .mcprc && cp mcp-server-config.example.json mcp-server-config.json`
3. **Get personal Supabase token** from dashboard
4. **Set environment variable** with their token
5. **Verify setup** with `npm run security-check`

## Important Notes

- **Never commit** the actual `.mcprc` or `mcp-server-config.json` files
- **Always use environment variables** for tokens in configuration
- **Run security check** before commits: `npm run security-check`
- **Each team member** should have their own Supabase access token

## Troubleshooting

### If MCP servers fail to start:

1. Check that `SUPABASE_ACCESS_TOKEN` environment variable is set
2. Verify token is valid in Supabase dashboard
3. Ensure local config files exist (copy from templates if missing)

### If files appear in git status:

1. Run `npm run security-check` to identify issues
2. Ensure `.mcprc` and `mcp-server-config.json` are in `.gitignore`
3. Use `git rm --cached filename` to untrack if accidentally committed
