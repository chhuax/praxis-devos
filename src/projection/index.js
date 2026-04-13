import * as claude from './claude.js';
import * as copilot from './copilot.js';
import * as codex from './codex.js';
import * as opencode from './opencode.js';
import { collectBundledSkillSources } from './skill-sources.js';

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

  const skillSources = collectBundledSkillSources();
  if (skillSources.length === 0) {
    log('⊘ Projection: no bundled skill assets found, skipping');
    return [];
  }

  const validNames = skillSources.map((s) => s.name);
  adapter.cleanStaleProjections({ validNames, log });
  if (typeof adapter.pruneManagedUserAssets === 'function') {
    adapter.pruneManagedUserAssets({ projectDir, validSkillNames: validNames, log });
  }

  const results = [];
  results.push(...adapter.projectSkills({ projectDir, skillSources, version, log }));
  if (typeof adapter.projectCommands === 'function') {
    results.push(...adapter.projectCommands({ projectDir, version, log }));
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
export const expectedSkillNames = () => collectBundledSkillSources().map(({ name }) => name);
