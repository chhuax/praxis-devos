import { detectForAgent, expectedSkillNames } from '../../projection/index.js';
import { uniqueAgents } from '../project/state.js';
import { resolveOpenSpecRuntime } from './commands.js';
import {
  CLAUDE_SUPERPOWERS_PLUGIN,
  PRAXIS_OPENCODE_PLUGIN,
  SUPERPOWERS_OPENCODE_PLUGIN,
} from '../constants/agent-dependencies.js';
import {
  bootstrapProject,
  detectSuperpowersForAgent,
  ensureRuntimeDependencies,
  formatStatus,
} from './agent-dependencies.js';
import { bootstrapOpenSpec, ensureOpenSpecRuntime, OPENSPEC_PACKAGE } from './openspec.js';

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

  for (const agent of selectedAgents) {
    const detection = detectSuperpowersForAgent(projectDir, agent);
    results.push({
      name: `superpowers:${agent}`,
      status: detection.status,
      detail: detection.detail,
    });
  }

  for (const agent of selectedAgents) {
    const projections = detectForAgent(agent);
    const expected = expectedSkillNames();
    const found = projections.map((p) => p.name);
    const missing = expected.filter((name) => !found.includes(name));

    if (missing.length === 0) {
      results.push({
        name: `projection:${agent}`,
        status: 'ok',
        detail: `All ${expected.length} bundled Praxis skills projected`,
      });
    } else {
      results.push({
        name: `projection:${agent}`,
        status: 'warning',
        detail: `Missing projections: ${missing.join(', ')}. Run \`npx praxis-devos setup --agent ${agent}\` to fix.`,
      });
    }
  }

  const lines = ['Dependency doctor:'];
  for (const result of results) {
    lines.push(`- [${formatStatus(result.status)}] ${result.name} — ${result.detail}`);
  }

  lines.push('');
  lines.push('Recommended next step:');
  if (selectedAgents.length === 1) {
    lines.push(`- npx praxis-devos setup --agent ${selectedAgents[0]}`);
  } else {
    lines.push(`- npx praxis-devos setup --agents ${selectedAgents.join(',')}`);
  }
  lines.push('');
  lines.push('Advanced repair command:');
  lines.push(`- npx praxis-devos bootstrap --agents ${selectedAgents.join(',')}`);

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
  ensureOpenSpecRuntime,
  ensureRuntimeDependencies,
  formatStatus,
  OPENSPEC_PACKAGE,
  PRAXIS_OPENCODE_PLUGIN,
  SUPERPOWERS_OPENCODE_PLUGIN,
};
