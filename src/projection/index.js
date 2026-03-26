import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as claude from './claude.js';
import * as codex from './codex.js';
import * as opencode from './opencode.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, '../../assets/openspec-skills');

const OPENSPEC_SKILLS = ['opsx-propose', 'opsx-explore', 'opsx-apply', 'opsx-archive'];

const adapters = { claude, codex, opencode };

/**
 * Collect OpenSpec skill sources from bundled assets.
 */
export const collectOpenSpecSkillSources = () =>
  OPENSPEC_SKILLS.map((name) => ({
    name,
    sourcePath: path.join(ASSETS_DIR, name, 'SKILL.md'),
  })).filter(({ sourcePath }) => fs.existsSync(sourcePath));

/**
 * Project OpenSpec skills to a specific agent's native directory.
 */
export const projectToAgent = ({ agent, version, log }) => {
  const adapter = adapters[agent];
  if (!adapter) {
    log(`⊘ Projection: unknown agent "${agent}", skipping`);
    return [];
  }

  const skillSources = collectOpenSpecSkillSources();
  if (skillSources.length === 0) {
    log('⊘ Projection: no OpenSpec skill assets found, skipping');
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
 * Get the list of expected OpenSpec skill names.
 */
export const expectedSkillNames = () => [...OPENSPEC_SKILLS];
