import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as claude from './claude.js';
import * as codex from './codex.js';
import * as opencode from './opencode.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundledSkillsRoot = () => path.resolve(__dirname, '../../assets/skills');

const adapters = { claude, codex, opencode };

/**
 * Collect bundled skill sources from bundled assets.
 */
export const collectBundledSkillSources = () =>
  (fs.existsSync(bundledSkillsRoot())
    ? fs.readdirSync(bundledSkillsRoot(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        sourceDir: path.join(bundledSkillsRoot(), entry.name),
      }))
      .filter(({ sourceDir }) => fs.existsSync(path.join(sourceDir, 'SKILL.md')))
      .sort((a, b) => a.name.localeCompare(b.name))
    : []);

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
