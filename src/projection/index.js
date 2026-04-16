import * as claude from './claude.js';
import * as copilot from './copilot.js';
import * as codex from './codex.js';
import * as opencode from './opencode.js';
import {
  collectBundledSkillSources,
  collectDirectSkillSources,
} from './skill-sources.js';
import {
  collectGeneratedWorkflowCommandSources,
  collectGeneratedWorkflowSkillSources,
} from './openspec-generated.js';

const adapters = { claude, copilot, codex, opencode };
export { collectBundledSkillSources };

/**
 * Project bundled Praxis user-level assets to a specific agent's native directories.
 */
export const projectToAgent = ({ agent, projectDir = process.cwd(), version, log }) => {
  const adapter = adapters[agent];
  if (!adapter) {
    log(`⊘ Projection: unknown agent "${agent}", skipping`);
    return [];
  }

  const generatedWorkflowSkillSources = collectGeneratedWorkflowSkillSources({ agent });
  const generatedWorkflowCommandSources = collectGeneratedWorkflowCommandSources({ agent });
  const skillSources = [
    ...collectDirectSkillSources(),
    ...generatedWorkflowSkillSources,
  ].sort((a, b) => a.name.localeCompare(b.name));
  if (skillSources.length === 0) {
    log('⊘ Projection: no bundled skill assets found, skipping');
    return [];
  }

  const validNames = [...new Set(skillSources.map((s) => s.name))];
  adapter.cleanStaleProjections({ validNames, log });
  if (typeof adapter.pruneManagedUserAssets === 'function') {
    adapter.pruneManagedUserAssets({
      projectDir,
      validSkillNames: validNames,
      log,
    });
  }

  const results = [];
  results.push(...adapter.projectSkills({ projectDir, skillSources, version, log }));
  if (typeof adapter.projectCommands === 'function') {
    results.push(...adapter.projectCommands({
      projectDir,
      version,
      log,
      workflowCommandSources: generatedWorkflowCommandSources,
    }));
  }

  return results;
};

/**
 * Detect projections for a specific agent.
 */
export const detectForAgent = (agent) => {
  const adapter = adapters[agent];
  return adapter ? adapter.detectProjections() : [];
};

/**
 * Get the list of expected bundled skill names.
 */
export const expectedSkillNames = ({ agent } = {}) => {
  const direct = collectBundledSkillSources().map(({ name }) => name);
  if (!agent) {
    return direct;
  }

  const generated = collectGeneratedWorkflowSkillSources({ agent }).map(({ name }) => name);
  return [...new Set([...direct, ...generated])];
};

export const inspectProjectionHealth = ({ agent }) => {
  const expected = expectedSkillNames({ agent });
  const projections = detectForAgent(agent);
  const found = projections.map((entry) => entry.name);
  const missing = expected.filter((name) => !found.includes(name));
  const legacy = projections
    .map((entry) => entry.name)
    .filter((name) => name.startsWith('opsx-'));
  return {
    expected,
    found,
    missing,
    legacy,
  };
};
