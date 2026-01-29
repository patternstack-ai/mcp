/**
 * MCP Input Schemas
 *
 * JSON Schema definitions for tool inputs.
 */

import type { ToolName } from './tools.js';

const ECOSYSTEM_ENUM = [
  'npm',
  'pypi',
  'go',
  'crates',
  'rubygems',
  'packagist',
  'hex',
  'maven',
  'nuget',
  'pub',
  'swift',
] as const;

export const INPUT_SCHEMAS: Record<ToolName, object> = {
  'dependency.explain': {
    type: 'object' as const,
    properties: {
      package: { type: 'string' as const, description: 'Package name to explain' },
      version: { type: 'string' as const, description: 'Version to analyze (optional)' },
      framework: { type: 'string' as const, description: 'Framework context (e.g., next, django)' },
      ecosystem: { type: 'string' as const, enum: ECOSYSTEM_ENUM },
      includeAlternatives: {
        type: 'boolean' as const,
        description: 'Include alternative packages',
      },
      includeMigrations: { type: 'boolean' as const, description: 'Include migration information' },
    },
    required: ['package'] as const,
  },
  'dependency.health': {
    type: 'object' as const,
    properties: {
      package: { type: 'string' as const, description: 'Package name to check' },
      ecosystem: { type: 'string' as const, enum: ECOSYSTEM_ENUM },
    },
    required: ['package'] as const,
  },
  'dependency.alternatives': {
    type: 'object' as const,
    properties: {
      package: { type: 'string' as const, description: 'Package to find alternatives for' },
      framework: { type: 'string' as const, description: 'Framework context for ranking' },
      ecosystem: { type: 'string' as const, enum: ECOSYSTEM_ENUM },
      limit: { type: 'number' as const, description: 'Max alternatives to return' },
    },
    required: ['package'] as const,
  },
  'dependency.trends': {
    type: 'object' as const,
    properties: {
      package: { type: 'string' as const, description: 'Package to get trends for' },
      framework: { type: 'string' as const, description: 'Framework context' },
      ecosystem: { type: 'string' as const, enum: ECOSYSTEM_ENUM },
    },
    required: ['package'] as const,
  },
  'dependency.safe-upgrade': {
    type: 'object' as const,
    properties: {
      package: { type: 'string' as const, description: 'Package to upgrade' },
      currentVersion: { type: 'string' as const, description: 'Current version' },
      targetVersion: {
        type: 'string' as const,
        description: 'Target version (optional, defaults to latest)',
      },
      ecosystem: { type: 'string' as const, enum: ECOSYSTEM_ENUM },
    },
    required: ['package', 'currentVersion'] as const,
  },
  'stack.recommend': {
    type: 'object' as const,
    properties: {
      framework: { type: 'string' as const, description: 'Target framework (e.g., next, django)' },
      useCases: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description:
          'Use cases: realtime, ai, ecommerce, cms, saas, api, mobile, desktop, cli, data, devtools',
      },
      persistence: {
        type: 'string' as const,
        enum: ['sql', 'nosql', 'graph', 'kv', 'none'] as const,
      },
      auth: {
        type: 'string' as const,
        enum: ['session', 'jwt', 'oauth', 'magic-link', 'none'] as const,
      },
      projectClass: {
        type: 'string' as const,
        enum: ['prototype', 'startup', 'growth', 'enterprise'] as const,
      },
      priorities: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Priorities: speed, stability, performance, cost',
      },
      constraints: {
        type: 'object' as const,
        properties: {
          mustInclude: { type: 'array' as const, items: { type: 'string' as const } },
          mustExclude: { type: 'array' as const, items: { type: 'string' as const } },
          maxDependencies: { type: 'number' as const },
        },
      },
    },
    required: ['useCases'] as const,
  },
  'stack.validate': {
    type: 'object' as const,
    properties: {
      packages: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Packages to validate',
      },
      framework: { type: 'string' as const, description: 'Framework context' },
      ecosystem: { type: 'string' as const, enum: ECOSYSTEM_ENUM },
    },
    required: ['packages'] as const,
  },
  'stack.defaults': {
    type: 'object' as const,
    properties: {
      framework: { type: 'string' as const, description: 'Framework to get defaults for' },
      strictMode: { type: 'boolean' as const, description: 'Only return required packages' },
      categories: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Filter by categories',
      },
    },
    required: ['framework'] as const,
  },
  'migration.plan': {
    type: 'object' as const,
    properties: {
      from: { type: 'string' as const, description: 'Source package (e.g., moment@2.29.0)' },
      to: { type: 'string' as const, description: 'Target package (e.g., date-fns@3.0.0)' },
      ecosystem: { type: 'string' as const, enum: ECOSYSTEM_ENUM },
      projectContext: {
        type: 'object' as const,
        properties: {
          framework: { type: 'string' as const },
          packages: { type: 'array' as const, items: { type: 'string' as const } },
          files: { type: 'array' as const, items: { type: 'string' as const } },
        },
      },
    },
    required: ['from', 'to'] as const,
  },
  'architecture.evaluate': {
    type: 'object' as const,
    properties: {
      packages: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Production dependencies',
      },
      devDependencies: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Dev dependencies',
      },
      framework: { type: 'string' as const, description: 'Expected framework' },
      ecosystem: { type: 'string' as const, enum: ECOSYSTEM_ENUM },
    },
    required: ['packages'] as const,
  },
  'signals.evaluate': {
    type: 'object' as const,
    properties: {
      action: {
        type: 'string' as const,
        enum: ['add', 'remove', 'upgrade', 'replace'] as const,
        description: 'Action type',
      },
      package: { type: 'string' as const, description: 'Package to evaluate' },
      targetPackage: {
        type: 'string' as const,
        description: 'Target package (for replace action)',
      },
      targetVersion: {
        type: 'string' as const,
        description: 'Target version (for upgrade action)',
      },
      currentStack: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Current packages',
      },
      framework: { type: 'string' as const, description: 'Framework context' },
      ecosystem: { type: 'string' as const, enum: ECOSYSTEM_ENUM },
    },
    required: ['action', 'package', 'currentStack'] as const,
  },
};
