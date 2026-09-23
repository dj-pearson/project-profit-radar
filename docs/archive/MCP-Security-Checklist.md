# 🔒 MCP Security Checklist

## Overview

This checklist ensures your Model Context Protocol (MCP) setup is secure and no sensitive information is committed to version control.

## ✅ Git Security Checklist

### Files That Should NEVER Be Committed

- [ ] `.env.mcp.local` - Your local MCP environment variables
- [ ] `.env.mcp` - Any MCP environment file with actual tokens
- [ ] `claude_desktop_config.json` - May contain access tokens
- [ ] Any file with your actual Supabase access token
- [ ] `.mcprc.local` - Local MCP runtime config with tokens
- [ ] `mcp-server-config.local.json` - Local MCP server config

### Files That ARE Safe to Commit

- [x] `.env.mcp.example` - Template without real tokens
- [x] `mcp-server-config.json` - Template with environment variables
- [x] `.mcprc` - Template with environment variables
- [x] `README-MCP.md` - Documentation
- [x] `Supabase-MCP-Setup.md` - Setup instructions

## 🛡️ Current .gitignore Protection

Your `.gitignore` now includes:

```gitignore
# MCP environment files with access tokens
.env.mcp
.env.mcp.local
.env.mcp.production
.env.mcp.dev
.env.mcp.staging

# MCP configuration files that may contain tokens
.mcprc.local
mcp-server-config.local.json
claude_desktop_config.json

# VS Code MCP settings
.vscode/mcp.json
.vscode/settings.local.json

# Supabase MCP specific
supabase-mcp-config.json
**/supabase-access-token*
**/supabase-service-key*

# Any files containing tokens/keys/credentials
**/*token*
**/*key*
**/*credential*
```

## 🔐 Security Best Practices

### 1. Environment Variables

**✅ DO:**

- Use environment variables for all sensitive data
- Use the format `${SUPABASE_ACCESS_TOKEN}` in config files
- Keep tokens in `.env.mcp.local` (ignored by git)

**❌ DON'T:**

- Hard-code tokens directly in config files
- Commit any file containing actual token values
- Share tokens in chat, email, or documentation

### 2. Token Management

**✅ Recommended Setup:**

```bash
# In .env.mcp.local (never committed)
SUPABASE_ACCESS_TOKEN=sbp_your_actual_token_here

# In mcp-server-config.json (committed safely)
"--access-token", "${SUPABASE_ACCESS_TOKEN}"
```

### 3. File Naming Conventions

- **Safe to commit**: `*.example`, `*.template`, `*.md`
- **Never commit**: `*.local`, `*token*`, `*key*`, `*secret*`

## 🔍 Security Verification Commands

### Check for Accidentally Committed Secrets

```bash
# Search for potential token patterns in your repo
git log --all --full-history -- "*token*" "*key*" "*secret*"

# Check for Supabase patterns
git log -p | grep -i "sbp_\|supabase.*key\|access.*token"

# Verify current files are properly ignored
git status --ignored
```

### Remove Accidentally Committed Secrets

```bash
# If you accidentally committed a secret, remove it from history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env.mcp' \
  --prune-empty --tag-name-filter cat -- --all

# Or use git-filter-repo (recommended)
git filter-repo --path .env.mcp --invert-paths
```

## 🚨 Emergency Response

### If You Accidentally Commit a Token:

1. **Immediately Revoke the Token**

   - Go to [Supabase Dashboard - Account Tokens](https://supabase.com/dashboard/account/tokens)
   - Delete the compromised token
   - Generate a new one

2. **Remove from Git History**

   ```bash
   # Remove the file from git history
   git filter-repo --path filename-with-token --invert-paths

   # Force push to update remote
   git push origin --force --all
   ```

3. **Update Your Environment**
   - Set the new token in your local environment
   - Update any team members who might be using the old token

## 📋 Team Setup Guidelines

### For New Team Members:

1. **Never share your personal access token**
2. **Each team member should have their own Supabase access token**
3. **Follow this setup process:**

   ```bash
   # Clone the repo
   git clone <repo-url>

   # Copy the environment template
   cp .env.mcp.example .env.mcp.local

   # Add your personal token to .env.mcp.local
   # Never commit this file!
   ```

4. **Verify your local setup:**

   ```bash
   # Check that sensitive files are ignored
   git status

   # Should NOT show .env.mcp.local or any files with your token
   ```

## ✅ Final Security Verification

Run this checklist before any commit:

- [ ] No actual tokens in any committed files
- [ ] All sensitive files are in `.gitignore`
- [ ] Environment variables use `${VAR_NAME}` format
- [ ] `.env.mcp.local` exists locally but is gitignored
- [ ] `git status` shows no sensitive files staged

### Quick Security Check Command:

```bash
# Run this before committing
echo "Checking for potential secrets..."
git diff --cached | grep -i "sbp_\|token\|key\|secret" && echo "⚠️  POTENTIAL SECRET FOUND!" || echo "✅ No secrets detected"
```

## 📞 Need Help?

If you're unsure about any file:

1. Check if it contains actual token values (not `${VARIABLE}` references)
2. If it contains real secrets, add it to `.gitignore`
3. If already committed, follow the emergency response steps above

Remember: **When in doubt, don't commit it!** It's always safer to ask for review than to accidentally expose secrets.
