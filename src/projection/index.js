import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as claude from './claude.js';
import * as codex from './codex.js';
import * as opencode from './opencode.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLED_SKILL_GROUPS = [
  {
    rootDir: path.resolve(__dirname, '../../assets/openspec-skills'),
    names: ['opsx-propose', 'opsx-explore', 'opsx-apply', 'opsx-archive'],
  },
  {
    rootDir: path.resolve(__dirname, '../../assets/devos-skills'),
    names: ['devos-docs'],
  },
];

const adapters = { claude, codex, opencode };

/**
 * Collect bundled skill sources from bundled assets.
 */
export const collectBundledSkillSources = () =>
  BUNDLED_SKILL_GROUPS.flatMap(({ rootDir, names }) => names.map((name) => ({
    name,
    sourcePath: path.join(rootDir, name, 'SKILL.md'),
  }))).filter(({ sourcePath }) => fs.existsSync(sourcePath));

/**
 * Project bundled Praxis skills to a specific agent's native directory.
 */
export const projectToAgent = ({ agent, version, log }) => {
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

  return adapter.projectSkills({ skillSources, version, log });
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
export const expectedSkillNames = () => BUNDLED_SKILL_GROUPS.flatMap(({ names }) => names);
