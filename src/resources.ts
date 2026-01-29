/**
 * MCP Resources
 *
 * Documentation resources for the MCP server.
 */

import { TOOL_CONFIG } from './config/index.js';

const API_KEY = process.env.PATTERNSTACK_API_KEY;
const API_URL = process.env.PATTERNSTACK_API_URL || 'https://patternstack.ai';

export function getOverviewDoc(): string {
  return `# 🪸 PatternStack MCP

## Agent-Optimized Semantic Tool Layer

PatternStack MCP provides semantic tools designed for AGI reasoning:

### Tool Namespaces

- **dependency.*** - Package-level intelligence
- **stack.*** - Stack generation and validation
- **migration.*** - Migration planning with action graphs
- **architecture.*** - Architecture evaluation and grading
- **signals.*** - Reinforcement learning signals

### Key Features

1. **AGI-Ready Responses** - Every tool returns an \`_agi\` block with:
   - Confidence scores
   - Clear recommendations (proceed/caution/avoid)
   - Actionable next steps

2. **Usage Limits** - Tools are gated by tier with rate limits and daily usage caps.

3. **Safety Middleware** - Built-in protection:
   - Tier gating
   - Rate limiting
   - Input validation
   - Prompt injection detection

### Tiers

Free access is preview-only (summary + single risk). Full depth requires Workspace or Premium.

| Tool | Free | Workspace | Premium |
|------|------|-----------|---------|
| dependency.health | Preview | Yes | Yes |
| stack.defaults | - | Yes | Yes |
| dependency.explain | Preview | Yes | Yes |
| dependency.alternatives | - | Yes | Yes |
| dependency.trends | Preview | Yes | Yes |
| stack.recommend | - | Yes | Yes |
| stack.validate | Preview | Yes | Yes |
| migration.plan | - | - | Yes |
| dependency.safe-upgrade | - | - | Yes |
| architecture.evaluate | - | - | Yes |
| signals.evaluate | - | - | Yes |

Get your API key at: https://patternstack.ai/dashboard/keys
`;
}

export function getToolsDoc(): string {
  let doc = '# MCP Tool Reference\n\n';

  for (const [name, config] of Object.entries(TOOL_CONFIG)) {
    doc += `## ${name}\n\n`;
    doc += `${config.description}\n\n`;
    doc += `- **Complexity Weight**: ${config.weight}\n`;
    doc += `- **Timeout**: ${config.timeout / 1000}s\n`;
    doc += `- **Minimum Tier**: ${config.minTier}\n\n`;
    doc += '---\n\n';
  }

  return doc;
}

export function getConfigDoc(): string {
  return `# PatternStack Configuration

API Key: ${API_KEY ? 'Configured' : 'Not set'}
API URL: ${API_URL}

## Setup

1. Get API key from https://patternstack.ai/dashboard/keys
2. Set PATTERNSTACK_API_KEY environment variable
3. Start the MCP server

## Environment Variables

- PATTERNSTACK_API_KEY - Your API key (required)
- PATTERNSTACK_API_URL - API URL (default: https://patternstack.ai)
`;
}

export const RESOURCES = [
  {
    uri: 'patternstack://overview',
    name: 'MCP Overview',
    description: 'PatternStack MCP architecture and tool reference',
    mimeType: 'text/markdown',
  },
  {
    uri: 'patternstack://tools',
    name: 'Tool Reference',
    description: 'Detailed reference for all MCP tools',
    mimeType: 'text/markdown',
  },
  {
    uri: 'patternstack://config',
    name: 'Configuration',
    description: 'Current configuration and API key status',
    mimeType: 'text/plain',
  },
];

export function getResource(uri: string): string {
  switch (uri) {
    case 'patternstack://overview':
      return getOverviewDoc();
    case 'patternstack://tools':
      return getToolsDoc();
    case 'patternstack://config':
      return getConfigDoc();
    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
}
