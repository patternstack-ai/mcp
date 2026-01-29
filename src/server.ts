/**
 * PatternStack MCP Server
 *
 * Agent-optimized MCP server with semantic tool namespace.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { TOOL_CONFIG, HIDDEN_TOOLS, INPUT_SCHEMAS, type ToolName } from './config/index.js';
import { formatResult } from './formatter.js';
import { RESOURCES, getResource } from './resources.js';

/**
 * PatternStack MCP Server
 */
export class PatternStackServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'patternstack',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Object.entries(TOOL_CONFIG)
          .filter(([name]) => !HIDDEN_TOOLS.includes(name as ToolName))
          .map(([name, config]) => ({
            name,
            description: config.description,
            inputSchema: INPUT_SCHEMAS[name as ToolName],
          })),
      };
    });

    // List resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return { resources: RESOURCES };
    });

    // Read resources
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      const content = getResource(uri);
      return {
        contents: [{ uri, mimeType: 'text/markdown', text: content }],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!Object.keys(TOOL_CONFIG).includes(name)) {
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        const result = await this.callTool(name as ToolName, args || {});
        return {
          content: [{ type: 'text' as const, text: formatResult(name as ToolName, result) }],
        };
      } catch (error) {
        const err = error as Error;
        return {
          content: [{ type: 'text' as const, text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    });
  }

  /**
   * Call a tool via the REST API
   */
  private async callTool(tool: ToolName, input: Record<string, unknown>): Promise<unknown> {
    const apiKey = process.env.PATTERNSTACK_API_KEY;
    const apiUrl = process.env.PATTERNSTACK_API_URL || 'https://patternstack.ai';
    const clerkUserId = process.env.PATTERNSTACK_CLERK_USER_ID;

    if (!apiKey) {
      throw new Error(
        'PATTERNSTACK_API_KEY not set. Get your key at https://patternstack.ai/dashboard/keys'
      );
    }

    const config = TOOL_CONFIG[tool];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      };
      if (clerkUserId) {
        headers['x-clerk-user-id'] = clerkUserId;
      }

      const response = await fetch(`${apiUrl}/api/mcp/tools/call`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tool, input }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: { message: response.statusText } }));
        const message: string | undefined = error.error?.message;
        if (
          response.status === 400 &&
          typeof message === 'string' &&
          message.includes('x-clerk-user-id')
        ) {
          throw new Error(
            'Workspace-scoped API key requires PATTERNSTACK_CLERK_USER_ID. Re-copy your MCP config from the dashboard in workspace mode.'
          );
        }
        throw new Error(message || `API error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Tool execution failed');
      }

      return result.result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🪸 PatternStack MCP started');
  }
}
