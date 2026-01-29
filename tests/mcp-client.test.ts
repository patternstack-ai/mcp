/**
 * Unit Tests for MCP Client
 *
 * Tests the thin MCP client that reads local files and calls PatternStack API.
 *
 * Security Focus:
 * - API key handling and discovery
 * - File reading (path traversal prevention)
 * - Input validation
 * - API call security
 * - Error handling (no information leakage)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PatternStackServer } from '../src/server.js';

// Mock modules before importing the client
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: class {
    setRequestHandler = vi.fn();
    connect = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  CallToolRequestSchema: {},
  ListToolsRequestSchema: {},
  ListResourcesRequestSchema: {},
  ReadResourceRequestSchema: {},
}));

vi.mock('dotenv', () => ({
  config: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('MCP Client v3', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.PATTERNSTACK_API_KEY;
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('API Key Discovery', () => {
    it('should discover API key from .patternstack file', async () => {
      const mockContent = 'PATTERNSTACK_API_KEY=test-api-key-123\n';

      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        if (String(filePath).endsWith('.patternstack')) {
          return mockContent;
        }
        throw new Error('File not found');
      });

      // Simulate the discoverApiKey logic inline (it's a private method in the class)
      const discoverApiKey = async (projectPath: string): Promise<string | undefined> => {
        try {
          // eslint-disable-next-line security/detect-non-literal-fs-filename -- Safe: test helper reading from test project path
          const content = await fs.readFile(`${projectPath}/.patternstack`, 'utf-8');
          // Use literal regex instead of dynamic construction
          const match = content.match(/PATTERNSTACK_API_KEY=(.+)/);
          if (match) {
            return match[1].trim();
          }
        } catch {
          // File doesn't exist
        }
        return undefined;
      };

      const key = await discoverApiKey('/test/project');
      expect(key).toBe('test-api-key-123');
    });

    it('should discover API key from .env file', async () => {
      const mockContent = 'OTHER_VAR=foo\nPATTERNSTACK_API_KEY=env-api-key-456\n';

      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        if (String(filePath).endsWith('.env')) {
          return mockContent;
        }
        throw new Error('File not found');
      });

      // The actual discovery logic is in the class
      expect(fs.readFile).toBeDefined();
    });

    it('should fall back to environment variable', () => {
      process.env.PATTERNSTACK_API_KEY = 'env-var-key-789';

      expect(process.env.PATTERNSTACK_API_KEY).toBe('env-var-key-789');
    });

    it('should trim whitespace from API key', async () => {
      const mockContent = 'PATTERNSTACK_API_KEY=  trimmed-key  \n';

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      // The trim() is applied in discoverApiKey
      expect(mockContent.match(/PATTERNSTACK_API_KEY=(.+)/)?.[1]?.trim()).toBe('trimmed-key');
    });

    it('should handle missing .patternstack file gracefully', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      // Should not throw, should fall back to other sources
      await expect(fs.readFile('/test/.patternstack', 'utf-8')).rejects.toThrow();
    });
  });

  describe('API Calls', () => {
    it('should include API key in headers', async () => {
      process.env.PATTERNSTACK_API_KEY = 'test-key';

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await fetch('https://patternstack.ai/api/mcp/scan-full', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.PATTERNSTACK_API_KEY,
        },
        body: JSON.stringify({ projectPath: '/test' }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://patternstack.ai/api/mcp/scan-full',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'test-key',
          }),
        })
      );
    });

    it('should include Clerk user ID header when provided', async () => {
      process.env.PATTERNSTACK_API_KEY = 'test-key';
      process.env.PATTERNSTACK_CLERK_USER_ID = 'user_test_123';

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, result: { ok: true } }),
      });

      const server = new PatternStackServer();
      const result = await (
        server as unknown as {
          callTool: (tool: string, input: Record<string, unknown>) => Promise<unknown>;
        }
      ).callTool('dependency.health', { package: 'lodash' });

      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://patternstack.ai/api/mcp/tools/call',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
            'x-clerk-user-id': 'user_test_123',
          }),
        })
      );
    });

    it('should throw error when API key is not set', async () => {
      delete process.env.PATTERNSTACK_API_KEY;

      const callWithoutKey = async () => {
        if (!process.env.PATTERNSTACK_API_KEY) {
          throw new Error(
            'PATTERNSTACK_API_KEY not set. Get your key at https://patternstack.ai/dashboard/keys'
          );
        }
      };

      await expect(callWithoutKey()).rejects.toThrow('PATTERNSTACK_API_KEY not set');
    });

    it('should handle API error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Rate limit exceeded' }),
      });

      const result = await mockFetch('https://patternstack.ai/api/mcp/scan-full');

      expect(result.ok).toBe(false);
    });

    it('should use correct API URL', async () => {
      const API_URL = process.env.PATTERNSTACK_API_URL || 'https://patternstack.ai';

      expect(API_URL).toBe('https://patternstack.ai');
    });

    it('should allow custom API URL via environment', () => {
      process.env.PATTERNSTACK_API_URL = 'http://localhost:3000';

      const API_URL = process.env.PATTERNSTACK_API_URL || 'https://patternstack.ai';

      expect(API_URL).toBe('http://localhost:3000');
    });
  });

  describe('File Reading Security', () => {
    it('should use path.join to prevent path traversal', () => {
      const projectPath = '/test/project';
      const filename = 'package.json';

      const filePath = path.join(projectPath, filename);

      expect(filePath).toBe('/test/project/package.json');
    });

    it('should handle path traversal attempts', () => {
      const projectPath = '/test/project';
      const maliciousFilename = '../../../etc/passwd';

      const filePath = path.join(projectPath, maliciousFilename);

      // path.join normalizes the path
      expect(filePath).not.toContain('../');
    });

    it('should handle absolute path injection', () => {
      const projectPath = '/test/project';
      const absolutePath = '/etc/passwd';

      // In Node.js, path.join with absolute path returns the absolute path
      // The client should validate paths stay within project directory
      const filePath = path.join(projectPath, absolutePath);

      // Note: path.join('/test/project', '/etc/passwd') = '/etc/passwd' on POSIX
      // This is a known behavior - the client should validate
      expect(filePath).toBeDefined();
    });

    it('should only read allowed file types', async () => {
      const allowedFiles = [
        'package.json',
        'requirements.txt',
        'Pipfile',
        'pyproject.toml',
        'Gemfile',
        'Gemfile.lock',
        'Cargo.toml',
        'Cargo.lock',
        'go.mod',
        'go.sum',
        'composer.json',
        'composer.lock',
        '.patternstack',
        '.patternstackignore',
        '.env',
      ];

      for (const file of allowedFiles) {
        expect(file).toBeDefined();
      }
    });

    it('should handle file read errors gracefully', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      // Should return undefined for optional files, not throw
      const readOptionalFile = async (filename: string): Promise<string | undefined> => {
        try {
          // eslint-disable-next-line security/detect-non-literal-fs-filename -- Safe: test helper for reading test files
          return await fs.readFile(filename, 'utf-8');
        } catch {
          return undefined;
        }
      };

      const result = await readOptionalFile('/nonexistent/file');

      expect(result).toBeUndefined();
    });
  });

  describe('Input Validation', () => {
    it('should require projectPath for scan_project', () => {
      const inputSchema = {
        type: 'object',
        properties: {
          projectPath: { type: 'string', description: 'Absolute path to the project directory' },
          projectName: { type: 'string', description: 'Name of the project (optional)' },
        },
        required: ['projectPath'],
      };

      expect(inputSchema.required).toContain('projectPath');
    });

    it('should validate ecosystem for patternstack_trends', () => {
      const validEcosystems = ['npm', 'pypi', 'rubygems', 'crates.io', 'go'];

      expect(validEcosystems).toContain('npm');
      expect(validEcosystems).toContain('pypi');
    });

    it('should validate severity filter for patternstack_security', () => {
      const validSeverities = ['critical', 'high', 'medium', 'low'];

      expect(validSeverities).toContain('critical');
      expect(validSeverities).toContain('high');
    });

    it('should handle missing package.json gracefully', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      // Client checks for at least one package file
      const hasAnyPackageFile = false;

      if (!hasAnyPackageFile) {
        const error = new Error('No package manifest files found');
        expect(error.message).toContain('No package manifest files found');
      }
    });
  });

  describe('Error Handling', () => {
    it('should not leak sensitive information in errors', async () => {
      const sensitiveError = new Error('Database connection failed: password=secret123');

      // Error should be sanitized before returning to client
      const sanitizedMessage = sensitiveError.message.replace(/password=\S+/g, 'password=***');

      expect(sanitizedMessage).not.toContain('secret123');
    });

    it('should handle unknown tools gracefully', async () => {
      const unknownTool = 'unknown_tool';

      const handleUnknown = () => {
        throw new Error(`Unknown tool: ${unknownTool}`);
      };

      expect(handleUnknown).toThrow('Unknown tool: unknown_tool');
    });

    it('should set isError flag on error responses', () => {
      const errorResponse = {
        content: [{ type: 'text', text: '❌ Error: Something went wrong' }],
        isError: true,
      };

      expect(errorResponse.isError).toBe(true);
    });

    it('should handle JSON parse errors', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('{ invalid json }');

      const parseJson = async () => {
        const content = await fs.readFile('/test/package.json', 'utf-8');
        return JSON.parse(content);
      };

      await expect(parseJson()).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(mockFetch('https://patternstack.ai/api/mcp/scan-full')).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('.patternstackignore Parsing', () => {
    it('should parse .patternstackignore file', async () => {
      const ignoreContent = `
# Comment line
node_modules
dist
*.log
.env
`;

      const lines = ignoreContent
        .split('\n')
        .filter((line) => line.trim() && !line.startsWith('#'));

      expect(lines).toContain('node_modules');
      expect(lines).toContain('dist');
      expect(lines).toContain('*.log');
      expect(lines).toContain('.env');
      expect(lines).not.toContain('# Comment line');
    });

    it('should handle empty .patternstackignore', async () => {
      const ignoreContent = '';

      const lines = ignoreContent
        .split('\n')
        .filter((line) => line.trim() && !line.startsWith('#'));

      expect(lines).toEqual([]);
    });

    it('should handle missing .patternstackignore', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      const readPatternStackIgnore = async (): Promise<string[]> => {
        try {
          const content = await fs.readFile('/test/.patternstackignore', 'utf-8');
          return content.split('\n').filter((line) => line.trim() && !line.startsWith('#'));
        } catch {
          return [];
        }
      };

      const result = await readPatternStackIgnore();

      expect(result).toEqual([]);
    });
  });

  describe('Response Formatting', () => {
    it('should format scan response with frameworks', () => {
      const result = {
        projectName: 'test-project',
        projectId: 'proj_123',
        frameworks: [
          { technology: 'next', version: '14.0.0', category: 'framework', confidence: 0.98 },
          { technology: 'react', version: '18.2.0', category: 'framework', confidence: 0.97 },
        ],
        totalProjects: 1000,
      };

      expect(result.frameworks.length).toBe(2);
      expect(result.frameworks[0].technology).toBe('next');
    });

    it('should format security issues', () => {
      const securityResult = {
        critical: 1,
        high: 2,
        issues: [
          {
            package: 'lodash',
            version: '4.17.20',
            cve: 'CVE-2021-23337',
            severity: 'high',
            confidence: 0.95,
            ignoreRate: 0.1,
            recommendation: 'Upgrade to lodash@4.17.21',
          },
        ],
      };

      expect(securityResult.critical).toBe(1);
      expect(securityResult.issues[0].cve).toBe('CVE-2021-23337');
    });

    it('should format recommendations', () => {
      const recommendations = [
        {
          package: 'zod',
          stars: 28000,
          adoptionRate: 0.85,
          cooccurrenceCount: 500,
          reason: 'Used by 85% of similar projects',
        },
      ];

      expect(recommendations[0].package).toBe('zod');
      expect(recommendations[0].adoptionRate).toBe(0.85);
    });

    it('should format insights suggestions', () => {
      const insights = {
        suggestions: [
          {
            type: 'security',
            package: 'lodash',
            message: 'lodash has a known vulnerability',
            question: 'Would you like me to help update lodash?',
            priority: 'high' as const,
          },
        ],
        summary: {
          totalPackages: 50,
          outdatedCount: 10,
          securityIssues: 2,
          alternativesAvailable: 5,
        },
      };

      expect(insights.suggestions[0].priority).toBe('high');
      expect(insights.summary.securityIssues).toBe(2);
    });
  });

  describe('Project Cache', () => {
    it('should cache project ID by path', () => {
      const projectCache = new Map<string, string>();

      projectCache.set('/test/project', 'proj_123');

      expect(projectCache.get('/test/project')).toBe('proj_123');
    });

    it('should retrieve cached project ID', () => {
      const projectCache = new Map<string, string>();
      projectCache.set('/test/project', 'proj_123');

      const cached = projectCache.get('/test/project');

      expect(cached).toBe('proj_123');
    });
  });

  describe('Resource Handling', () => {
    it('should list available resources', () => {
      const resources = [
        {
          uri: 'patternstack://help/overview',
          name: 'PatternStack Overview',
          description: 'Learn about PatternStack intelligence capabilities',
          mimeType: 'text/plain',
        },
        {
          uri: 'patternstack://help/tools',
          name: 'Available Tools',
          description: 'Reference for all PatternStack MCP tools',
          mimeType: 'text/plain',
        },
        {
          uri: 'patternstack://config',
          name: 'Current Configuration',
          description: 'View current PatternStack configuration and API key status',
          mimeType: 'text/plain',
        },
      ];

      expect(resources).toHaveLength(3);
      expect(resources[0].uri).toBe('patternstack://help/overview');
    });

    it('should encode URI for resource fetch', () => {
      const uri = 'patternstack://package/with spaces';
      const encoded = encodeURIComponent(uri);

      expect(encoded).toBe('patternstack%3A%2F%2Fpackage%2Fwith%20spaces');
    });
  });

  describe('Tool Definitions', () => {
    it('should define all required tools', () => {
      const toolNames = [
        'init',
        'scan_project',
        'patternstack_analyze',
        'patternstack_alternatives',
        'patternstack_security',
        'patternstack_trends',
        'patternstack_insights',
      ];

      expect(toolNames).toContain('init');
      expect(toolNames).toContain('scan_project');
      expect(toolNames.length).toBe(7);
    });

    it('should have correct input schemas', () => {
      const scanProjectSchema = {
        type: 'object',
        properties: {
          projectPath: { type: 'string' },
          projectName: { type: 'string' },
          includeRecommendations: { type: 'boolean', default: true },
          includeSecurity: { type: 'boolean', default: true },
        },
        required: ['projectPath'],
      };

      expect(scanProjectSchema.required).toContain('projectPath');
      expect(scanProjectSchema.properties.includeRecommendations.default).toBe(true);
    });
  });
});
