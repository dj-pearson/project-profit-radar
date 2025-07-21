# Supabase MCP Server Setup Guide

## Overview

The Supabase MCP server has been added to your BuildDesk project, providing Claude Code with comprehensive access to your Supabase database and platform features.

## What This Enables

With the Supabase MCP server, Claude Code can now:

### Database Operations
- **CRUD Operations**: Create, read, update, and delete records across all your BuildDesk tables
- **Advanced Queries**: Complex filtering, joins, and aggregations using natural language
- **Schema Management**: View and modify table structures, relationships, and constraints
- **Data Analysis**: Generate reports on projects, financials, users, and business metrics

### Specific BuildDesk Capabilities
- **Project Management**: Query project data, budgets, timelines, and completion rates
- **Financial Analysis**: Analyze profit margins, costs, revenue, and financial performance
- **User Management**: Handle user accounts, permissions, and company relationships
- **Document Handling**: Manage project documents, photos, and file metadata
- **Compliance Tracking**: Monitor permits, environmental requirements, and regulations
- **Equipment Management**: Track equipment usage, maintenance, and warranties
- **Lead Management**: Analyze sales pipeline, lead conversion, and customer data

### Advanced Features
- **TypeScript Generation**: Create type definitions from your database schema
- **Edge Functions**: Invoke your Supabase Edge Functions
- **Storage Management**: Upload, download, and organize files
- **Real-time Data**: Access live data updates
- **Development Workflows**: Use database branching for safe development

## Setup Instructions

### 1. Create a Supabase Personal Access Token

1. Visit [Supabase Dashboard - Account Tokens](https://supabase.com/dashboard/account/tokens)
2. Click "Generate new token"
3. Token Configuration:
   - **Name**: `BuildDesk MCP`
   - **Scopes**: Select at minimum:
     - `read:projects` - Read access to your projects
     - `write:projects` - Write access for project modifications
     - `read:organizations` - If using organization features
   - **Expiration**: Set according to your security preferences

4. **Important**: Copy the token immediately - you won't be able to see it again!

### 2. Configure Environment Variables

#### Option A: Create Local Environment File
1. Copy the example file:
   ```bash
   cp .env.mcp.example .env.mcp.local
   ```

2. Edit `.env.mcp.local` and replace `your_personal_access_token_here` with your actual token:
   ```env
   SUPABASE_ACCESS_TOKEN=sbp_your_actual_token_here
   ```

3. Source the environment file before using MCP:
   ```bash
   source .env.mcp.local
   ```

#### Option B: System Environment Variable
Set the environment variable in your system:

**Windows (PowerShell):**
```powershell
$env:SUPABASE_ACCESS_TOKEN="sbp_your_actual_token_here"
```

**Windows (CMD):**
```cmd
set SUPABASE_ACCESS_TOKEN=sbp_your_actual_token_here
```

**macOS/Linux:**
```bash
export SUPABASE_ACCESS_TOKEN="sbp_your_actual_token_here"
```

### 3. Test the Connection

Run the MCP server directly to test:
```bash
npm run mcp:supabase
```

You should see the server start without errors. Press Ctrl+C to stop.

### 4. Using with Claude Desktop

The MCP server is already configured in your `mcp-server-config.json` and `.mcprc` files. Claude Desktop will automatically connect when you restart it.

## Usage Examples

Once configured, you can ask Claude Code to:

### Business Analysis
- "Show me the profit margins for all projects completed this quarter"
- "Which clients have the highest project values?"
- "Generate a report on equipment utilization rates"

### Database Operations
- "Create a new project table field for tracking sustainability metrics"
- "Update all projects in 'Planning' status to include estimated start dates"
- "Show me the database schema for the projects table"

### Development Tasks
- "Generate TypeScript types for all my database tables"
- "Create a test data set for the leads table"
- "Check for any data inconsistencies in the user_profiles table"

### Reporting and Analytics
- "Create a dashboard query for monthly revenue trends"
- "Find all projects that are over budget by more than 10%"
- "List all permits expiring in the next 30 days"

## Troubleshooting

### Common Issues

**1. "Access token not found" error**
- Ensure `SUPABASE_ACCESS_TOKEN` environment variable is set
- Verify the token hasn't expired
- Check that you're using the correct token format (starts with `sbp_`)

**2. "Project not found" error**
- Verify your project ID (`ilhzuvemiuyfuxfegtlv`) is correct
- Ensure your access token has the necessary permissions
- Check that the project is active in your Supabase dashboard

**3. "Permission denied" errors**
- Review the scopes selected when creating your access token
- Ensure you have the necessary permissions in your Supabase organization
- Try creating a new token with broader scopes if needed

**4. Connection timeouts**
- Check your internet connection
- Verify Supabase service status
- Try increasing timeout settings if on a slow connection

### Getting Help

If you encounter issues:
1. Check the [Supabase MCP documentation](https://supabase.com/docs/guides/api/mcp)
2. Review the [official MCP documentation](https://modelcontextprotocol.io/)
3. Check the server logs for detailed error messages
4. Ensure all dependencies are up to date

## Security Best Practices

1. **Token Security**:
   - Never commit access tokens to version control
   - Use environment variables or secure configuration management
   - Regularly rotate access tokens
   - Use minimal required scopes

2. **Access Control**:
   - Review and audit database permissions regularly
   - Use Row Level Security (RLS) policies where appropriate
   - Monitor access logs for unusual activity

3. **Development vs Production**:
   - Use separate access tokens for development and production
   - Consider database branching for development work
   - Test schema changes in development environments first

## Advanced Configuration

### Custom Server Configuration

You can modify the MCP server configuration in `mcp-server-config.json` to customize:
- Connection timeouts
- Retry behavior
- Logging levels
- Additional environment variables

### Integration with CI/CD

For automated workflows, you can:
- Set the access token in your CI/CD environment variables
- Use the MCP server in automated testing
- Generate database documentation automatically
- Validate schema changes before deployment

This integration transforms your BuildDesk development workflow, allowing natural language interaction with your entire Supabase infrastructure through Claude Code. 