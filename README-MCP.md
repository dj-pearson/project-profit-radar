# MCP Server Integrations

This project now includes multiple MCP (Model Context Protocol) server integrations that provide enhanced capabilities through Claude Code.

## Available MCP Servers

### 1. Puppeteer MCP Server
Web automation and browser control capabilities.

### 2. Context7 MCP Server
Advanced context management and semantic search capabilities.

## What is MCP Puppeteer?

The MCP Puppeteer server allows Claude Code to:
- Navigate web pages programmatically
- Take screenshots of websites
- Extract content from web pages
- Interact with web elements (clicking, typing, etc.)
- Test web applications
- Automate web-based tasks

## What is Context7 MCP?

The Context7 MCP server provides:
- Advanced context management for long conversations
- Semantic search capabilities across documentation
- Intelligent content indexing and retrieval
- Context-aware information extraction
- Enhanced memory and recall for Claude Code

## Installation

Both MCP servers have been installed and configured in this project:

```bash
npm install @modelcontextprotocol/server-puppeteer
npm install @upstash/context7-mcp
```

## Configuration

The MCP servers are configured in two files:

1. **mcp-server-config.json** - Main configuration file
2. **.mcprc** - Alternative configuration file

Both files contain the same configuration:

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-puppeteer"],
      "env": {
        "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD": "true"
      }
    },
    "context7": {
      "command": "npx",
      "args": ["@upstash/context7-mcp"],
      "env": {}
    }
  }
}
```

## Usage

### Running the MCP Servers

You can run each MCP server directly using:

```bash
# Run Puppeteer MCP server
npm run mcp:puppeteer

# Run Context7 MCP server
npm run mcp:context7
```

### Available Commands

#### Puppeteer MCP Server
Once the Puppeteer MCP server is running, Claude Code can use these tools:

- `puppeteer_navigate` - Navigate to a URL
- `puppeteer_screenshot` - Take a screenshot of the current page
- `puppeteer_click` - Click on elements
- `puppeteer_type` - Type text into input fields
- `puppeteer_extract` - Extract text content from elements
- `puppeteer_evaluate` - Run JavaScript on the page

#### Context7 MCP Server
Once the Context7 MCP server is running, Claude Code can use these tools:

- `context7_search` - Search through indexed content
- `context7_index` - Index new content for search
- `context7_recall` - Retrieve relevant context from memory
- `context7_summarize` - Generate summaries of content
- `context7_analyze` - Analyze content semantically

### Example Use Cases for BuildDesk

#### Puppeteer MCP Server Use Cases:

1. **Testing the BuildDesk application**
   - Automated UI testing
   - Screenshot generation for documentation
   - End-to-end testing workflows

2. **Data extraction from external sources**
   - Scraping construction industry data
   - Monitoring competitor websites
   - Extracting permit information from government sites

3. **Integration testing**
   - Testing third-party integrations (QuickBooks, calendar APIs)
   - Verifying payment flows with Stripe
   - Testing OAuth authentication flows

4. **Documentation and reporting**
   - Generating visual reports
   - Creating automated screenshots for user guides
   - Monitoring application performance

#### Context7 MCP Server Use Cases:

1. **Enhanced documentation management**
   - Indexing and searching construction documentation
   - Semantic search across project files
   - Context-aware help system

2. **Intelligent code assistance**
   - Better understanding of codebase context
   - Improved code suggestions based on project history
   - Enhanced debugging with contextual information

3. **Project knowledge management**
   - Building institutional knowledge base
   - Context-aware project recommendations
   - Intelligent content retrieval for similar projects

4. **Advanced search capabilities**
   - Semantic search across all project data
   - Context-aware search results
   - Intelligent content summarization

## Environment Variables

### Puppeteer MCP Server
The configuration uses `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` to avoid downloading Chromium during installation, assuming it's already available in the system.

### Context7 MCP Server  
The Context7 MCP server uses default configuration. For advanced configuration, you may need to set up additional environment variables based on your specific needs.

## Notes

- Both MCP servers run as separate processes and communicate with Claude Code through the Model Context Protocol
- Puppeteer requires a headless browser environment (Chromium/Chrome)
- Context7 provides enhanced context management and semantic search capabilities
- The servers can be used for both development and production automation tasks
- Security considerations: Be careful when using Puppeteer with external websites and ensure proper rate limiting

## Troubleshooting

If you encounter issues:

1. Ensure Node.js 18+ is installed
2. Check that the MCP servers start without errors:
   - `npm run mcp:puppeteer`
   - `npm run mcp:context7`
3. Verify Chromium/Chrome is available in the system (for Puppeteer)
4. Check the MCP configuration files are properly formatted
5. Ensure both packages are properly installed:
   - `@modelcontextprotocol/server-puppeteer`
   - `@upstash/context7-mcp`

For more information about MCP, visit: https://modelcontextprotocol.io/