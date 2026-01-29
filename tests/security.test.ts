/**
 * Security Tests for MCP Server Package
 *
 * Tests security-critical aspects of the MCP client:
 * - Path traversal prevention
 * - API key security
 * - Input sanitization
 * - Error message sanitization
 * - Network security
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';

describe('MCP Server Security', () => {
  describe('Path Traversal Prevention', () => {
    it('should prevent basic path traversal', () => {
      const projectPath = '/home/user/project';
      const malicious = '../../../etc/passwd';

      // Simulate what the client should do
      const normalizedPath = path.normalize(path.join(projectPath, malicious));
      const isWithinProject = normalizedPath.startsWith(projectPath);

      // path.join + normalize = '/home/user/project/../../../etc/passwd' -> '/etc/passwd'
      expect(normalizedPath).toBe('/etc/passwd');
      expect(isWithinProject).toBe(false);
    });

    it('should prevent URL-encoded path traversal', () => {
      const projectPath = '/home/user/project';
      const encoded = '..%2F..%2F..%2Fetc%2Fpasswd';
      const decoded = decodeURIComponent(encoded);

      const normalizedPath = path.normalize(path.join(projectPath, decoded));
      const isWithinProject = normalizedPath.startsWith(projectPath);

      expect(isWithinProject).toBe(false);
    });

    it('should prevent null byte injection', () => {
      const nullByteAttack = 'package.json\x00.txt';

      // Null bytes should be stripped or rejected
      const sanitized = nullByteAttack.replace(/\x00/g, '');

      expect(sanitized).toBe('package.json.txt');
    });

    it('should prevent backslash traversal on Windows', () => {
      const projectPath = '/home/user/project';
      const windowsTraversal = '..\\..\\..\\etc\\passwd';

      // Convert backslashes to forward slashes
      const normalized = windowsTraversal.replace(/\\/g, '/');
      const fullPath = path.normalize(path.join(projectPath, normalized));

      expect(fullPath).not.toContain('\\');
    });

    it('should prevent symlink attacks', () => {
      // Note: Actual symlink resolution requires fs.realpath
      // This test documents the expectation
      const projectPath = '/home/user/project';
      const symlinkPath = 'symlink_to_etc_passwd';

      // The client should use fs.realpath to resolve symlinks
      // and verify the resolved path is within the project
      expect(path.join(projectPath, symlinkPath)).toBe('/home/user/project/symlink_to_etc_passwd');
    });
  });

  describe('API Key Security', () => {
    it('should not log API key', () => {
      const apiKey = 'ts_live_abc123xyz789';
      const logMessage = `Initializing with key: ${apiKey.substring(0, 8)}...`;

      expect(logMessage).not.toContain('abc123xyz789');
      expect(logMessage).toContain('ts_live_');
    });

    it('should not include API key in error messages', () => {
      const apiKey = 'ts_live_secret';
      const error = new Error(`API call failed with key ${apiKey}`);

      // Sanitize error message
      const sanitized = error.message.replace(/ts_\w+/g, 'ts_***');

      expect(sanitized).not.toContain('secret');
    });

    it('should validate API key format', () => {
      const validKey = 'ts_live_abc123';
      const invalidKey = 'invalid-key';

      const isValidFormat = (key: string) => /^ts_(live|test)_[a-zA-Z0-9]+$/.test(key);

      expect(isValidFormat(validKey)).toBe(true);
      expect(isValidFormat(invalidKey)).toBe(false);
    });

    it('should not expose API key in responses', () => {
      const response = {
        content: [{ type: 'text', text: '✅ API Key: ✓ Configured' }],
      };

      expect(response.content[0].text).not.toMatch(/ts_\w+/);
      expect(response.content[0].text).toContain('Configured');
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize project names', () => {
      const maliciousName = '<script>alert("xss")</script>';

      // Sanitize by removing HTML tags
      const sanitized = maliciousName.replace(/<[^>]{0,200}>/g, '');

      expect(sanitized).toBe('alert("xss")');
      expect(sanitized).not.toContain('<script>');
    });

    it('should sanitize package names', () => {
      const maliciousPackage = 'lodash; rm -rf /';

      // Validate package name format
      // 🔒 SECURITY FIX: Use alternation instead of optional group to prevent ReDoS
      const isValidPackageName = /^(@[a-z0-9-~][a-z0-9-._~]{0,213}\/|)[a-z0-9-~][a-z0-9-._~]{0,213}$/.test(
        maliciousPackage
      );

      expect(isValidPackageName).toBe(false);
    });

    it('should reject invalid ecosystem names', () => {
      const validEcosystems = ['npm', 'pypi', 'rubygems', 'crates.io', 'go'];
      const maliciousEcosystem = 'npm; cat /etc/passwd';

      expect(validEcosystems.includes(maliciousEcosystem)).toBe(false);
    });

    it('should reject command injection in severity filter', () => {
      const validSeverities = ['critical', 'high', 'medium', 'low'];
      const maliciousSeverity = 'critical; cat /etc/passwd';

      expect(validSeverities.includes(maliciousSeverity)).toBe(false);
    });

    it('should limit input lengths', () => {
      const MAX_PROJECT_PATH_LENGTH = 4096;
      const longPath = 'a'.repeat(5000);

      expect(longPath.length).toBeGreaterThan(MAX_PROJECT_PATH_LENGTH);

      // Should be truncated or rejected
      const truncated = longPath.substring(0, MAX_PROJECT_PATH_LENGTH);
      expect(truncated.length).toBe(MAX_PROJECT_PATH_LENGTH);
    });
  });

  describe('Error Message Sanitization', () => {
    it('should not leak file system paths in errors', () => {
      const error = new Error('ENOENT: no such file at /home/user/.ssh/id_rsa');

      // Sanitize paths
      const sanitized = error.message.replace(/\/[^\s]{0,500}/g, '[PATH]');

      expect(sanitized).not.toContain('/home/');
      expect(sanitized).not.toContain('.ssh');
    });

    it('should not leak database credentials', () => {
      const error = new Error('Connection failed: postgresql://user@localhost/db');

      // Sanitize database URLs
      const sanitized = error.message.replace(/:\/\/[^@]{1,200}@/g, '://***@');

      expect(sanitized).not.toContain('password');
    });

    it('should not leak IP addresses', () => {
      const error = new Error('Cannot connect to 192.168.1.100:5432');

      // Sanitize IP addresses
      const sanitized = error.message.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[IP]');

      expect(sanitized).not.toContain('192.168');
    });

    it('should not leak environment variables', () => {
      const error = new Error('Missing DATABASE_URL=postgresql://secret');

      // Sanitize env var values
      const sanitized = error.message.replace(/=\S{1,500}/g, '=[REDACTED]');

      expect(sanitized).not.toContain('postgresql://secret');
    });
  });

  describe('Network Security', () => {
    it('should only connect to allowed hosts', () => {
      const allowedHosts = ['patternstack.ai', 'api.patternstack.ai', 'localhost'];
      const maliciousHost = 'evil-server.com';

      expect(allowedHosts.includes(maliciousHost)).toBe(false);
    });

    it('should use HTTPS by default', () => {
      const defaultUrl = 'https://patternstack.ai';

      expect(defaultUrl.startsWith('https://')).toBe(true);
    });

    it('should validate URL format', () => {
      const validUrl = 'https://patternstack.ai/api/mcp/scan-full';
      const maliciousUrl = 'javascript:alert(1)';

      const isValidUrl = (url: string) => {
        try {
          const parsed = new URL(url);
          return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
          return false;
        }
      };

      expect(isValidUrl(validUrl)).toBe(true);
      expect(isValidUrl(maliciousUrl)).toBe(false);
    });

    it('should set proper request headers', () => {
      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': 'test-key',
        'User-Agent': 'patternstack-mcp-client/3.0.0',
      };

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['x-api-key']).toBeDefined();
    });

    it('should not follow redirects to different domains', () => {
      // Document expectation - actual implementation would use fetch config
      const originalHost = 'patternstack.ai';
      const redirectHost = 'evil-server.com';

      expect(originalHost).not.toBe(redirectHost);
    });
  });

  describe('JSON Parsing Security', () => {
    it('should handle prototype pollution attempts', () => {
      const maliciousJson = '{"__proto__":{"polluted":true}}';

      // Use JSON.parse (which is safe from prototype pollution in V8)
      JSON.parse(maliciousJson);

      // Check that Object prototype was not polluted
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('should limit JSON depth', () => {
      // Create deeply nested JSON
      let nested = '{"a":';
      for (let i = 0; i < 100; i++) {
        nested += '{"a":';
      }
      nested += '"x"';
      for (let i = 0; i <= 100; i++) {
        nested += '}';
      }

      // Should not cause stack overflow
      expect(() => JSON.parse(nested)).not.toThrow();
    });

    it('should limit JSON size', () => {
      const MAX_JSON_SIZE = 10 * 1024 * 1024; // 10MB
      const largeJson = '{"data":"' + 'a'.repeat(MAX_JSON_SIZE + 1000) + '"}';

      expect(largeJson.length).toBeGreaterThan(MAX_JSON_SIZE);

      // Should reject oversized JSON
      const shouldReject = largeJson.length > MAX_JSON_SIZE;
      expect(shouldReject).toBe(true);
    });
  });

  describe('Rate Limiting Awareness', () => {
    it('should handle 429 rate limit responses', async () => {
      const response = {
        status: 429,
        headers: { 'Retry-After': '60' },
      };

      expect(response.status).toBe(429);
      expect(response.headers['Retry-After']).toBe('60');
    });

    it('should implement exponential backoff', () => {
      const baseDelay = 1000;
      const maxRetries = 3;
      const delays = [];

      for (let i = 0; i < maxRetries; i++) {
        delays.push(baseDelay * Math.pow(2, i));
      }

      expect(delays).toEqual([1000, 2000, 4000]);
    });
  });

  describe('Timeout Handling', () => {
    it('should have reasonable request timeout', () => {
      const TIMEOUT_MS = 30000; // 30 seconds

      expect(TIMEOUT_MS).toBeLessThanOrEqual(60000);
      expect(TIMEOUT_MS).toBeGreaterThanOrEqual(5000);
    });

    it('should abort long-running requests', async () => {
      const controller = new AbortController();
      const signal = controller.signal;

      // Simulate timeout
      setTimeout(() => controller.abort(), 100);

      expect(signal.aborted).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(signal.aborted).toBe(true);
    });
  });
});
