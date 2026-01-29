/**
 * MCP Result Formatter
 *
 * Formats tool results for display in markdown.
 */

import type { ToolName } from './config/index.js';

/**
 * Format AGI guidance block
 */
function formatAgi(agi: Record<string, unknown>): string {
  let text = '\n---\n## AGI Guidance\n';
  for (const [key, value] of Object.entries(agi)) {
    if (Array.isArray(value)) {
      text += `- **${key}**: ${value.join(', ')}\n`;
    } else if (typeof value === 'object' && value !== null) {
      text += `- **${key}**: ${JSON.stringify(value)}\n`;
    } else {
      text += `- **${key}**: ${value}\n`;
    }
  }
  return text;
}

/**
 * Format tool result for display
 */
export function formatResult(tool: ToolName, result: unknown): string {
  const data = result as Record<string, unknown>;
  let text = '';

  switch (tool) {
    case 'dependency.explain': {
      const pkg = data.package as { name: string; version: string; ecosystem: string };
      const health = data.health as {
        status: string;
        securityIssues: number;
        maintenanceScore: number;
      };
      const risk = data.risk as { level: string; factors: string[]; mitigations: string[] };

      text = `# ${pkg.name}@${pkg.version}\n\n`;
      text += `**Ecosystem**: ${pkg.ecosystem}\n`;
      text += `**Status**: ${health.status}\n`;
      text += `**Security Issues**: ${health.securityIssues}\n`;
      text += `**Maintenance Score**: ${health.maintenanceScore}/100\n\n`;

      if (risk.level !== 'low') {
        text += `## Risk: ${risk.level.toUpperCase()}\n`;
        if (risk.factors.length > 0) {
          text += `**Factors**: ${risk.factors.join(', ')}\n`;
        }
        if (risk.mitigations.length > 0) {
          text += `**Mitigations**: ${risk.mitigations.join(', ')}\n`;
        }
        text += '\n';
      }
      break;
    }

    case 'dependency.health': {
      const status = data.status as string;
      const safe = (data._agi as { safe: boolean })?.safe;
      const action = (data._agi as { action: string })?.action;

      text = `# Health Check\n\n`;
      text += `**Status**: ${status}\n`;
      text += `**Safe**: ${safe ? 'Yes' : 'No'}\n`;
      text += `**Action**: ${action}\n`;

      if (data.deprecated) {
        text += `\n**Deprecated**: ${data.deprecationReason || 'Yes'}\n`;
      }

      const issues = data.securityIssues as Array<{
        severity: string;
        cve: string;
        title: string;
      }>;
      if (issues && issues.length > 0) {
        text += `\n## Security Issues\n`;
        for (const issue of issues) {
          text += `- **${issue.cve}** (${issue.severity}): ${issue.title}\n`;
        }
      }
      break;
    }

    case 'stack.recommend': {
      const stack = data.stack as { framework: string; ecosystem: string; description: string };
      const packages = data.packages as Array<{
        name: string;
        category: string;
        reason: string;
        confidence: number;
      }>;

      text = `# Recommended Stack: ${stack.framework}\n\n`;
      text += `${stack.description}\n\n`;
      text += `## Packages\n\n`;

      for (const pkg of packages) {
        text += `### ${pkg.name}\n`;
        text += `- **Category**: ${pkg.category}\n`;
        text += `- **Confidence**: ${(pkg.confidence * 100).toFixed(0)}%\n`;
        text += `- **Reason**: ${pkg.reason}\n\n`;
      }

      const agi = data._agi as { installCommand: string };
      if (agi?.installCommand) {
        text += `## Install\n\`\`\`bash\n${agi.installCommand}\n\`\`\`\n`;
      }
      break;
    }

    case 'stack.validate': {
      const valid = data.valid as boolean;
      const score = data.score as number;
      const issues = data.issues as Array<{
        type: string;
        severity: string;
        packages: string[];
        message: string;
      }>;

      text = `# Stack Validation\n\n`;
      text += `**Valid**: ${valid ? 'Yes' : 'No'}\n`;
      text += `**Score**: ${score}/100\n\n`;

      if (issues && issues.length > 0) {
        text += `## Issues\n\n`;
        for (const issue of issues) {
          const icon = issue.severity === 'error' ? '' : '';
          text += `${icon} **${issue.type}** (${issue.severity}): ${issue.message}\n`;
          text += `  Packages: ${issue.packages.join(', ')}\n\n`;
        }
      }
      break;
    }

    case 'migration.plan': {
      const migration = data.migration as {
        from: { package: string };
        to: { package: string };
        summary: string;
        difficulty: string;
      };
      const impact = data.impact as { estimatedFiles: number; breakingChanges: number };
      const steps = data.steps as Array<{
        order: number;
        type: string;
        description: string;
        automated: boolean;
      }>;

      text = `# Migration Plan\n\n`;
      text += `**From**: ${migration.from.package}\n`;
      text += `**To**: ${migration.to.package}\n`;
      text += `**Difficulty**: ${migration.difficulty}\n\n`;
      text += `${migration.summary}\n\n`;

      text += `## Impact\n`;
      text += `- **Estimated Files**: ${impact.estimatedFiles}\n`;
      text += `- **Breaking Changes**: ${impact.breakingChanges}\n\n`;

      text += `## Steps\n\n`;
      for (const step of steps) {
        const auto = step.automated ? '(automated)' : '(manual)';
        text += `${step.order}. **${step.type}** ${auto}: ${step.description}\n`;
      }
      break;
    }

    case 'architecture.evaluate': {
      const quality = data.quality as {
        overall: number;
        grade: string;
        summary: string;
        dimensions: Record<string, number>;
      };
      const issues = data.issues as Array<{
        name: string;
        severity: string;
        description: string;
      }>;

      text = `# Architecture Evaluation\n\n`;
      text += `**Grade**: ${quality.grade}\n`;
      text += `**Score**: ${quality.overall}/100\n\n`;
      text += `${quality.summary}\n\n`;

      text += `## Dimensions\n`;
      for (const [dim, score] of Object.entries(quality.dimensions)) {
        text += `- **${dim}**: ${score}/100\n`;
      }

      if (issues && issues.length > 0) {
        text += `\n## Issues\n`;
        for (const issue of issues) {
          text += `- **${issue.name}** (${issue.severity}): ${issue.description}\n`;
        }
      }
      break;
    }

    case 'signals.evaluate': {
      const reward = data.reward as number;
      const recommendation = data.recommendation as string;
      const reasoning = data.reasoning as string[];

      const icon = reward > 0.3 ? '' : reward < -0.3 ? '' : '';
      text = `# Signal Evaluation ${icon}\n\n`;
      text += `**Reward**: ${reward.toFixed(2)}\n`;
      text += `**Recommendation**: ${recommendation}\n\n`;

      if (reasoning && reasoning.length > 0) {
        text += `## Reasoning\n`;
        for (const reason of reasoning) {
          text += `- ${reason}\n`;
        }
      }
      break;
    }

    default:
      text = `# ${tool} Result\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
  }

  // Add _agi guidance if present
  if (data._agi && typeof data._agi === 'object') {
    text += formatAgi(data._agi as Record<string, unknown>);
  }

  return text;
}
