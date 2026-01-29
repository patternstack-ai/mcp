# PatternStack MCP v3 - Enhanced Thin Client

## Overview

PatternStack MCP v3 implements improvements inspired by Vercel's Next.js DevTools MCP while maintaining the core "thin client" architecture that protects PatternStack's IP.

**Architecture:** Thin MCP client → PatternStack API → Business logic (server-side)

## What Changed

### ✅ v2 → v3 Improvements

#### 1. **More Specialized Tools** (Inspired by Next.js DevTools)

**Before (v2):** Only 1 tool

- `scan_project` - Full scan with everything

**After (v3):** 6 specialized tools

- `init` - Initialize and auto-discover configuration
- `scan_project` - Full project scan (same as v2)
- `patternstack_analyze` - Quick local analysis without persisting
- `patternstack_alternatives` - Find package alternatives with adoption stats
- `patternstack_security` - Security vulnerability scanning
- `patternstack_trends` - Trending packages by ecosystem

**Why:** Follows Next.js DevTools pattern of discrete, focused tools instead of one monolithic tool. Better for:

- Context window management (AI can call only what it needs)
- User experience (clearer what each tool does)
- API design (each endpoint has single responsibility)

#### 2. **MCP Resources with URI Pattern** (Inspired by Next.js DevTools)

**Pattern from Next.js DevTools:**

```
cache-components://overview
nextjs-fundamentals://use-client
```

**PatternStack v3 implementation:**

```
patternstack://help/overview     - Learn about PatternStack
patternstack://help/tools         - Tool reference
patternstack://config             - View current config
```

**Future expansion potential:**

```
patternstack://package/react      - Package intelligence
patternstack://project/123/alerts - Security alerts
patternstack://trends/npm         - Ecosystem trends
```

**Why:** Discrete URI sections prevent overwhelming AI's context window. AI can selectively load only needed documentation.

#### 3. **Auto-Discovery** (Inspired by Next.js DevTools)

**Next.js DevTools:** Auto-discovers Next.js dev server by scanning ports 3000, 3001, 3002...

**PatternStack v3:** Auto-discovers API key from:

1. `.patternstack` file in project root
2. `.env` file
3. Environment variables

**Code:**

```typescript
// Check .patternstack file first
const patternstackFile = path.join(projectPath, '.patternstack');
const content = await fs.readFile(patternstackFile, 'utf-8');
const match = content.match(/PATTERNSTACK_API_KEY=(.+)/);
```

**Why:** Reduces friction - developers don't need to manually configure API key in multiple places.

#### 4. **Init Tool** (Inspired by Next.js DevTools)

**Next.js DevTools:** Has `init` tool that establishes documentation requirements

**PatternStack v3:** `init` tool that:

- Auto-discovers API key
- Validates configuration
- Lists available tools
- Provides setup instructions

**Why:** Establishes context at start of session. AI knows what tools are available and configuration status.

#### 5. **Better Context Formatting**

**Before (v2):** Monolithic text output

**After (v3):** Discrete sections with clear headers

- Overview help
- Tools help
- Config info

**Why:** Easier for AI to parse and understand. Follows Next.js DevTools pattern of structured knowledge sections.

## New API Endpoints

All endpoints follow thin-client pattern - client sends raw data, server processes:

### `/api/mcp/analyze` (POST)

Quick local analysis without persisting to server

**Request:**

```json
{
  "projectPath": "/path/to/project",
  "packageJson": {...},
  "requirementsTxt": "...",
  "goMod": "...",
  "cargoToml": "...",
  "gemfile": "..."
}
```

**Response:**

```json
{
  "success": true,
  "ecosystem": "npm",
  "frameworks": ["Next.js", "React"],
  "packageCount": 42
}
```

### `/api/mcp/alternatives` (POST)

Find alternatives to a package

**Request:**

```json
{
  "packageName": "express",
  "ecosystem": "npm"
}
```

**Response:**

```json
{
  "success": true,
  "alternatives": [
    {
      "name": "fastify",
      "stars": 25000,
      "adoptionRate": 0.15,
      "reason": "Alternative to express in the framework category"
    }
  ]
}
```

### `/api/mcp/security` (POST)

Security vulnerability scanning

**Request:**

```json
{
  "projectPath": "/path/to/project",
  "packageJson": {...},
  "severityFilter": "critical"
}
```

**Response:**

```json
{
  "success": true,
  "vulnerabilities": [
    {
      "package": "lodash",
      "version": "4.17.15",
      "cve": "CVE-2021-23337",
      "severity": "high",
      "fix": "Upgrade to 4.17.21"
    }
  ]
}
```

### `/api/mcp/trends` (POST)

Trending packages by ecosystem

**Request:**

```json
{
  "ecosystem": "npm",
  "category": "framework",
  "limit": 10
}
```

**Response:**

```json
{
  "success": true,
  "trends": [
    {
      "name": "next",
      "stars": 120000,
      "adoptionRate": 0.45,
      "growth": 0.25
    }
  ]
}
```

## What Stayed the Same (Thin Client Architecture)

### ✅ IP Protection Maintained

**No changes to core principle:**

- Client only reads local files (package.json, requirements.txt, etc.)
- Client sends raw data to API
- **ALL detection logic stays server-side**
- Client only formats responses for LLM

**Example from v3:**

```typescript
// Client reads files (no detection!)
const packageJson = await readOptionalFile('package.json');
const requirementsTxt = await readOptionalFile('requirements.txt');

// Client sends to API (detection happens server-side)
const result = await this.callApi('/api/mcp/analyze', 'POST', {
  packageJson,
  requirementsTxt,
});

// Client formats response for LLM
return { content: [{ type: 'text', text: this.formatAnalyzeResponse(result) }] };
```

### ✅ Authentication & Security

All new endpoints use same security as v2:

- Rate limiting
- API key verification (bcrypt)
- Scope enforcement (READ + MCP)
- No PII exposure
- Generic error messages (no enumeration)

## Comparison to Vercel's Next.js DevTools MCP

| Feature                        | Next.js DevTools | PatternStack v3 | Notes                                                            |
| ------------------------------ | ---------------- | ------------- | ---------------------------------------------------------------- |
| **Thin client architecture**   | ❌               | ✅            | Next.js has detection in client; PatternStack keeps it server-side |
| **Multiple specialized tools** | ✅               | ✅            | Both have focused, discrete tools                                |
| **Resource URIs**              | ✅               | ✅            | Both use `protocol://path` pattern                               |
| **Auto-discovery**             | ✅               | ✅            | Next.js discovers ports; PatternStack discovers API keys           |
| **Init tool**                  | ✅               | ✅            | Both establish context at start                                  |
| **Runtime connection**         | ✅               | ❌            | Next.js connects to dev server; PatternStack uses API              |
| **Browser automation**         | ✅               | ❌            | Next.js uses Playwright; not needed for PatternStack               |

## Migration Guide

### For Users

**If you're already using PatternStack MCP v2:**

1. No breaking changes - v2 tools still work
2. New tools available automatically
3. Optional: Create `.patternstack` file for auto-discovery

**To use v3:**

Update your Claude Desktop config:

```json
{
  "mcpServers": {
    "patternstack": {
      "command": "npx",
      "args": ["-y", "@patternstack/mcp-server@latest"],
      "env": {
        "PATTERNSTACK_API_KEY": "your-key"
      }
    }
  }
}
```

Or use `.patternstack` file:

```bash
echo "PATTERNSTACK_API_KEY=your-key" > .patternstack
```

### For Developers

**New tools to test:**

```bash
# Start dev server
cd packages/mcp-server
npm run dev

# Test in separate terminal
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npm run dev
```

**Available tools:**

- `init` - Test auto-discovery
- `scan_project` - Same as v2
- `patternstack_analyze` - Quick analysis
- `patternstack_alternatives` - Find alternatives
- `patternstack_security` - Security scan
- `patternstack_trends` - View trends

## Next Steps

### Potential Future Enhancements

1. **More Resources**

   ```
   patternstack://package/react
   patternstack://ecosystem/npm/trends
   patternstack://alerts/critical
   ```

2. **Caching**
   - Cache package intelligence locally
   - Reduce API calls for repeated queries

3. **Offline Mode**
   - Basic analysis without API
   - Sync when connection available

4. **Webhook Integration**
   - Real-time security alerts
   - Trend notifications

5. **Multi-project Support**
   - Track multiple projects
   - Cross-project insights

## Competitive Moat

**Question:** Is Next.js DevTools MCP a threat?

**Answer:** No - different problem domains

- **Next.js DevTools** = Development tooling for building _with_ Next.js
- **PatternStack** = Intelligence platform for choosing _what_ tech to use

**Your moat is:**

- Crowdsourced recommendation data
- Package intelligence database
- Social proof metrics
- Community voting
- Cross-framework insights

**MCP is just delivery mechanism** - not the moat. Your value is the data and intelligence.

## Summary

PatternStack MCP v3 adopts best practices from Vercel's Next.js DevTools MCP while maintaining the core thin-client architecture that protects PatternStack's IP. The improvements focus on:

1. ✅ Better developer experience (auto-discovery, init tool)
2. ✅ Clearer API design (specialized tools, not monolithic)
3. ✅ Efficient context management (resource URIs)
4. ✅ **Maintained IP protection** (all logic server-side)

The architecture remains: **Thin client → API → Business logic (server-side)**
