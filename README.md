# n8n Workflow MCP Server

AI-powered n8n workflow recommendation system with semantic search and MCP server integration.

## Overview

This system helps AI agents and users discover, compose, and adapt n8n automation workflows using:
- **Semantic Search**: Find similar workflows using vector embeddings
- **AI Composition**: Generate workflows from natural language requests
- **MCP Tools**: Integration with Model Context Protocol for AI agents
- **Cloudflare Infrastructure**: Deploy on Cloudflare Workers with free tier

## Features

- 🔍 **Semantic Workflow Search**: Find workflows using natural language queries
- 🤖 **AI Workflow Composition**: Generate complete n8n workflows from requirements
- 🔧 **Workflow Refinement**: Improve existing workflows with AI assistance
- ✅ **Validation**: Validate workflows for correctness and best practices
- 📦 **Easy Deployment**: One-click deployment to Cloudflare Workers

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA FACTORY                                 │
│  n8n Templates → Cleaning → Classification → Embeddings →      │
│  VectorDB + D1 Database                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               CLOUDFLARE WORKER - MCP SERVER                    │
│  MCP Tools: compose_workflow, search_workflows,                 │
│             refine_workflow, validate_workflow                   │
└─────────────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Cloudflare account (for deployment)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd n8n-workflow-mcp

# Install dependencies
npm install

# Install Wrangler CLI globally (if needed)
npm install -g wrangler
```

### Development

```bash
# Run local development server
npm run dev

# Type check
npm run typecheck

# Lint code
npm run lint

# Format code
npm run format
```

### Deployment

```bash
# Deploy to Cloudflare
npm run deploy

# Build and deploy (minified)
npm run build
```

## MCP Tools

### compose_workflow

Generate a complete n8n workflow from a user's automation request.

```json
{
  "request": "Create a workflow that syncs Typeform responses to Google Sheets",
  "requirements": {
    "integrations": ["typeform", "google-sheets"],
    "trigger_type": "form_submission",
    "complexity": "intermediate",
    "include_error_handling": true
  }
}
```

### search_workflows

Search the semantic workflow database.

```json
{
  "query": "form submission to crm with lead scoring",
  "filters": {
    "category": "lead_generation",
    "complexity": ["beginner", "intermediate"],
    "limit": 5
  }
}
```

### refine_workflow

Improve an existing workflow.

```json
{
  "workflow_id": "workflow_123",
  "modifications": [
    {
      "type": "add_node",
      "node_type": "email",
      "position": 3
    }
  ]
}
```

### validate_workflow

Validate an n8n workflow JSON.

```json
{
  "workflow": { /* n8n workflow JSON */ },
  "checks": ["structure", "nodes", "connections"]
}
```

## Cloudflare Services

This project uses the following Cloudflare services:

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| Workers | MCP Server Runtime | 100K requests/day |
| Vector DB | Semantic Search | Included |
| D1 Database | Metadata Storage | Included |
| KV | Session/Cache | 100K reads/day |
| AI | Claude/LLM | 10K requests/day |

## Project Structure

```
n8n-workflow-mcp/
├── src/
│   ├── index.ts              # Worker entry point
│   ├── mcp/                  # MCP server and tools
│   ├── data-factory/         # Template collection and processing
│   ├── search/               # Semantic search engine
│   ├── composer/             # AI workflow composer
│   ├── models/               # Type definitions
│   └── utils/                # Helper functions
├── tests/                    # Unit and integration tests
├── wrangler.toml             # Cloudflare configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies
```

## Development Phases

1. ✅ **Phase 0**: Architecture and planning
2. 🔄 **Phase 1**: Project setup (current)
3. 📋 **Phase 2**: Data Factory pipeline
4. 🔍 **Phase 3**: Semantic Search Engine
5. 🤖 **Phase 4**: AI Workflow Composer
6. 🔧 **Phase 5**: MCP Server Integration
7. 🧪 **Phase 6**: Unit Tests
8. 🧪 **Phase 7**: Integration Tests
9. 🚀 **Phase 8**: Deployment

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Open a GitHub issue
- Check the documentation in `docs/`
- Review Cloudflare Worker documentation
