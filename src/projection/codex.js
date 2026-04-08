import fs from 'fs';
import path from 'path';
import { buildMarker, canWriteProjection, injectMarker, isProjection } from './markers.js';
import { resolveUserHomeDir } from '../support/home.js';

const codexSkillsDir = () => path.join(resolveUserHomeDir(), '.codex', 'skills');

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

/**
 * Project bundled Praxis skills to ~/.codex/skills/ as directories with SKILL.md.
 * Codex discovers these as native skills.
 */
export const projectSkills = ({ skillSources, version, log }) => {
  ensureDir(codexSkillsDir());
  const results = [];

  for (const { name, sourcePath } of skillSources) {
    const targetDir = path.join(codexSkillsDir(), name);
    const targetPath = path.join(targetDir, 'SKILL.md');
    ensureDir(targetDir);
    if (!canWriteProjection(targetPath)) {
      results.push({ name, targetPath, status: 'skipped' });
      log(`⊘ Codex: skipped ${name} because ${targetPath} is not a Praxis projection`);
      continue;
    }

    const content = fs.readFileSync(sourcePath, 'utf8');
    const marker = buildMarker({ source: path.relative(process.cwd(), sourcePath), version });
    const projected = injectMarker(content, marker);

    fs.writeFileSync(targetPath, projected, 'utf8');
    results.push({ name, targetPath, status: 'projected' });
    log(`✓ Codex: projected ${name} → ${targetPath}`);
  }

  return results;
};

export const detectProjections = () => {
  if (!fs.existsSync(codexSkillsDir())) {
    return [];
  }
  const dirs = fs.readdirSync(codexSkillsDir(), { withFileTypes: true })
    .filter((d) => d.isDirectory());

  return dirs
    .map((d) => {
      const skillMd = path.join(codexSkillsDir(), d.name, 'SKILL.md');
      return { name: d.name, path: skillMd, isProjection: isProjection(skillMd) };
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
      log(`✓ Codex: removed stale projection ${entry.name}`);
    }
  }
};
