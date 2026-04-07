import fs from 'fs';
import path from 'path';
import { buildMarker, canWriteProjection, injectMarker, isProjection } from './markers.js';
import { resolveUserHomeDir } from '../support/home.js';

const claudeSkillsDir = () => path.join(resolveUserHomeDir(), '.claude', 'skills');

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

/**
 * Project OpenSpec skills to ~/.claude/skills/ as skill directories with SKILL.md.
 * Claude Code discovers these as native OpenSpec skills.
 */
export const projectSkills = ({ skillSources, version, log }) => {
  ensureDir(claudeSkillsDir());
  const results = [];

  for (const { name, sourcePath } of skillSources) {
    const targetDir = path.join(claudeSkillsDir(), name);
    const targetPath = path.join(targetDir, 'SKILL.md');
    ensureDir(targetDir);
    if (!canWriteProjection(targetPath)) {
      results.push({ name, targetPath, status: 'skipped' });
      log(`⊘ Claude: skipped ${name} because ${targetPath} is not a Praxis projection`);
      continue;
    }
    const content = fs.readFileSync(sourcePath, 'utf8');
    const marker = buildMarker({ source: path.relative(process.cwd(), sourcePath), version });
    const projected = injectMarker(content, marker);

    fs.writeFileSync(targetPath, projected, 'utf8');
    results.push({ name, targetPath, status: 'projected' });
    log(`✓ Claude: projected ${name} → ${targetPath}`);
  }

  return results;
};

/**
 * Detect existing Claude projections.
 */
export const detectProjections = () => {
  if (!fs.existsSync(claudeSkillsDir())) {
    return [];
  }
  const dirs = fs.readdirSync(claudeSkillsDir(), { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('opsx-'));
  return dirs
    .map((d) => {
      const fullPath = path.join(claudeSkillsDir(), d.name, 'SKILL.md');
      return { name: d.name, path: fullPath, isProjection: isProjection(fullPath) };
    })
    .filter((entry) => entry.isProjection);
};

/**
 * Remove stale projections that no longer have a matching source.
 */
export const cleanStaleProjections = ({ validNames, log }) => {
  const existing = detectProjections();
  for (const entry of existing) {
    if (!validNames.includes(entry.name)) {
      fs.rmSync(path.dirname(entry.path), { recursive: true, force: true });
      log(`✓ Claude: removed stale projection ${entry.name}`);
    }
  }
};
