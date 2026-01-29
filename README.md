# 🪸 @patternstack/mcp

PatternStack MCP Server - Crowdsourced package intelligence for AI coding assistants. Like Waze, but for your dependencies.

## Features

- 🔮 **Automatic Insights** - Zero prompting required. Insights surface as you code.
- 🔍 **Framework Detection** - Scans package files to detect your tech stack
- 🛤️ **Crowdsourced Data** - See what real projects use together
- 🔒 **Security Alerts** - CVE warnings via Dependabot/GitHub Advisory Database
- ⚡ **Always Current** - 30-day half-life ensures fresh, relevant data

## Quick Start

```bash
npx -y @patternstack/mcp patternstack-v4
```

## Setup

### 1. Get Your API Key

Visit [patternstack.ai/dashboard/keys](https://patternstack.ai/dashboard/keys) and generate an API key.

### 2. Add to Your MCP Config

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "patternstack": {
      "command": "npx",
      "args": ["-y", "@patternstack/mcp", "patternstack-v4"],
      "env": {
        "PATTERNSTACK_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Workspace API keys**: add your user ID so PatternStack can verify workspace membership on each request:

```json
{
  "mcpServers": {
    "patternstack": {
      "command": "npx",
      "args": ["-y", "@patternstack/mcp", "patternstack-v4"],
      "env": {
        "PATTERNSTACK_API_KEY": "ps_ws_...",
        "PATTERNSTACK_CLERK_USER_ID": "user_..."
      }
    }
  }
}
```

**Claude Code** (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "patternstack": {
      "command": "npx",
      "args": ["-y", "@patternstack/mcp", "patternstack-v4"],
      "env": {
        "PATTERNSTACK_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### 3. Run init

After restarting your AI assistant, type:

```
init
```

This verifies your API key, detects your tech stack, and confirms everything is working.

## API Key Configuration

The MCP client looks for API keys in this order (first found wins):

| Priority | Source               | Description                                      |
| -------- | -------------------- | ------------------------------------------------ |
| 1        | Environment Variable | `PATTERNSTACK_API_KEY` in MCP config               |
| 2        | `.patternstack` file   | JSON file in project root: `{ "apiKey": "..." }` |
| 3        | `.env` file          | `PATTERNSTACK_API_KEY=...` in project `.env`       |
| 4        | Global config        | `~/.patternstackrc` with `{ "apiKey": "..." }`     |

**Free includes full MCP access**: Free accounts get full MCP access with 500 requests/day. Workspace (1,000/day) and Premium (5,000/day) tiers offer higher limits for teams.

**Workspace keys require a user ID**: set `PATTERNSTACK_CLERK_USER_ID` (or `PATTERNSTACK_USER_ID`) in your MCP config env so PatternStack can verify you’re still an active workspace member.

**Best Practice:** Use environment variable in MCP config for security. Never commit API keys to version control.

## MCP Tools

| Tool                      | Description                                                       | Tier       |
| ------------------------- | ----------------------------------------------------------------- | ---------- |
| `init`                    | Initialize PatternStack, validate API key, auto-discover config     | Workspace+ |
| `scan_project`            | Full scan with framework detection, security, and recommendations | Workspace+ |
| `patternstack_analyze`      | Quick local analysis without persisting                           | Workspace+ |
| `patternstack_alternatives` | Find alternatives to a package with adoption stats                | Workspace+ |
| `patternstack_security`     | Check for security vulnerabilities                                | Workspace+ |
| `patternstack_trends`       | Get trending packages in an ecosystem                             | Workspace+ |
| `patternstack_insights`     | Get suggestions Claude should offer you (collaborative)           | Workspace+ |
| `search_packages`         | Search packages by name or category with trend/health data        | Workspace+ |
| `compare_packages`        | Compare multiple packages with scores and recommendations         | Workspace+ |
| `migration_guide`         | Get migration guidance for deprecated/declining packages          | Premium    |
| `ai_insight`              | AI-powered package explanations and recommendations               | Premium    |

**Note:** Framework parameters only accept Tier 1 application frameworks (Next.js, Django, Rails, etc.), not UI libraries (React, Vue). For React projects, use `next`, `remix`, or `gatsby` as the framework.

## How It Works

```
Real Projects → Package Files → Co-occurrence Counts → Temporal Weighting → Recommendations
              (Empirical)       (Crowdsourced)         (Time-decay)         (Data-driven)
```

**No AI/ML** - Pure statistics from real project data:

- `PackageCooccurrence` table stores actual counts from real projects
- 30-day half-life decay weights recent data more heavily
- Adoption rates are real: `count / totalProjectsWithA`

## Supported Ecosystems

- JavaScript/TypeScript (npm)
- Python (PyPI)
- Go (go.mod)
- Rust (Cargo)
- Ruby (Bundler)
- PHP (Composer)
- Elixir (Hex)
- Java/Kotlin (Maven)
- C#/.NET (NuGet)
- Dart/Flutter (Pub)
- Swift (SwiftPM)

## Development

```bash
cd packages/mcp-server
npm install
npm run build
npm run dev
```

## License

MIT
