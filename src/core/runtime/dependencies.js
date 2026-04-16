import { inspectProjectionHealth } from '../../projection/index.js';
import { uniqueAgents } from '../project/state.js';
import { resolveOpenSpecRuntime } from './commands.js';
import {
  CLAUDE_SUPERPOWERS_PLUGIN,
  PRAXIS_OPENCODE_PLUGIN,
  SUPERPOWERS_OPENCODE_PLUGIN,
} from '../constants/agent-dependencies.js';
import { PRAXIS_CLI_COMMAND } from '../constants/cli.js';
import {
  bootstrapProject,
  detectSuperpowersForAgent,
  ensureRuntimeDependencies,
  formatStatus,
} from './agent-dependencies.js';
import {
  bootstrapOpenSpec,
  detectBundledOpenSpecSchemaInstallation,
  detectOpenSpecSchemaPrecedence,
  detectOpenSpecUserConfig,
  detectProjectSchemaBinding,
  ensureBundledOpenSpecSchemaInstalled,
  ensureOpenSpecRuntime,
  ensureOpenSpecUserConfig,
  OPENSPEC_PACKAGE,
} from './openspec.js';

// This module is now the thin dependency orchestrator. It combines the
// OpenSpec-specific runtime checks with per-agent dependency health so callers
// can use a single import for doctor/setup/bootstrap flows.

// Dependency doctor is read-only. It reports runtime health and projection
// coverage, and optionally fails in strict mode when required pieces are
// missing.
export const doctorProject = ({ projectDir, agents, strict = false }) => {
  const selectedAgents = uniqueAgents(agents);
  const results = [];

  const openspecRuntime = resolveOpenSpecRuntime(projectDir);
  results.push({
    name: 'openspec',
    status: openspecRuntime.status,
    detail: openspecRuntime.detail,
  });
  results.push({
    name: 'openspec:company-schema',
    ...detectBundledOpenSpecSchemaInstallation(),
  });
  results.push({
    name: 'openspec:user-config',
    ...detectOpenSpecUserConfig(),
  });
  results.push({
    name: 'openspec:project-schema',
    ...detectProjectSchemaBinding(projectDir),
  });
  results.push({
    name: 'openspec:schema-precedence',
    ...detectOpenSpecSchemaPrecedence(projectDir),
  });

  for (const agent of selectedAgents) {
    const detection = detectSuperpowersForAgent(projectDir, agent);
    results.push({
      name: `superpowers:${agent}`,
      status: detection.status,
      detail: detection.detail,
    });
  }

  for (const agent of selectedAgents) {
    const projection = inspectProjectionHealth({ agent, projectDir });
    const issues = [];

    if (projection.missing.length > 0) {
      issues.push(`missing official skill projections: ${projection.missing.join(', ')}`);
    }
    if (projection.legacy.length > 0) {
      issues.push(`legacy opsx skill projections still installed: ${projection.legacy.join(', ')}`);
    }

    if (issues.length === 0) {
      results.push({
        name: `projection:${agent}`,
        status: 'ok',
        detail: `All ${projection.expected.length} expected Praxis skills are projected with no pending OpenSpec workflow adoption issues`,
      });
    } else {
      results.push({
        name: `projection:${agent}`,
        status: 'warning',
        detail: `${issues.join('; ')}. Run \`${PRAXIS_CLI_COMMAND} setup --agent ${agent}\` to fix.`,
      });
    }
  }

  const lines = ['Dependency doctor:'];
  for (const result of results) {
    lines.push(`- [${formatStatus(result.status)}] ${result.name} — ${result.detail}`);
  }

  const hasBlockingIssue = results.some((result) =>
    result.status === 'missing' || (strict && result.status === 'unknown'));

  if (strict && hasBlockingIssue) {
    throw new Error(`${lines.join('\n')}\n\nStrict dependency check failed.`);
  }

  return lines.join('\n');
};

export {
  bootstrapOpenSpec,
  bootstrapProject,
  CLAUDE_SUPERPOWERS_PLUGIN,
  detectSuperpowersForAgent,
  detectBundledOpenSpecSchemaInstallation,
  detectOpenSpecSchemaPrecedence,
  detectOpenSpecUserConfig,
  detectProjectSchemaBinding,
  ensureBundledOpenSpecSchemaInstalled,
  ensureOpenSpecRuntime,
  ensureOpenSpecUserConfig,
  ensureRuntimeDependencies,
  formatStatus,
  OPENSPEC_PACKAGE,
  PRAXIS_OPENCODE_PLUGIN,
  SUPERPOWERS_OPENCODE_PLUGIN,
};
