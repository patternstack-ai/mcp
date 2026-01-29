/**
 * MCP Tool Configuration
 *
 * Tool definitions with tier requirements, weights, and timeouts.
 */

// All tools available to Free tier - daily limits (500/day) provide the business gate
export const TOOL_CONFIG = {
  'dependency.explain': {
    weight: 1,
    timeout: 15000,
    minTier: 'free',
    description:
      'Get comprehensive explanation of a package including health, risk, and recommendations',
  },
  'dependency.health': {
    weight: 1,
    timeout: 5000,
    minTier: 'free',
    description: 'Quick health check for a package (deprecated, vulnerable, unmaintained)',
  },
  'dependency.alternatives': {
    weight: 1,
    timeout: 10000,
    minTier: 'free',
    description: 'Find alternative packages with adoption stats and migration effort',
  },
  'dependency.trends': {
    weight: 1,
    timeout: 10000,
    minTier: 'free',
    description: 'Get trend data for a package (rising, stable, declining)',
  },
  'dependency.safe-upgrade': {
    weight: 2,
    timeout: 15000,
    minTier: 'free',
    description: 'Evaluate if upgrading a package is safe with breaking change analysis',
  },
  'stack.recommend': {
    weight: 2,
    timeout: 20000,
    minTier: 'free',
    description: 'Get stack recommendations based on use cases and requirements',
  },
  'stack.validate': {
    weight: 1,
    timeout: 10000,
    minTier: 'free',
    description: 'Validate a stack for conflicts, redundancies, and issues',
  },
  'stack.defaults': {
    weight: 1,
    timeout: 5000,
    minTier: 'free',
    description: 'Get canonical/default packages for a framework',
  },
  'migration.plan': {
    weight: 3,
    timeout: 30000,
    minTier: 'free',
    description: 'Generate a detailed migration plan with action graph',
  },
  'architecture.evaluate': {
    weight: 5,
    timeout: 45000,
    minTier: 'free',
    description: 'Comprehensive architecture evaluation with quality grades',
  },
  'signals.evaluate': {
    weight: 1,
    timeout: 10000,
    minTier: 'free',
    description: 'Get reward signal for add/remove/upgrade/replace actions',
  },
} as const;

export type ToolName = keyof typeof TOOL_CONFIG;

export const HIDDEN_TOOLS: ToolName[] = ['migration.plan'];
