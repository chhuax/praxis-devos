import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildMarker, isProjection } from './markers.js';

const CODEX_SKILLS_DIR = path.join(os.homedir(), '.agents', 'skills');

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

/**
 * Project OpenSpec skills to ~/.agents/skills/ as directories with SKILL.md.
 * Codex discovers these as native skills.
 */
export const projectSkills = ({ skillSources, version, log }) => {
  ensureDir(CODEX_SKILLS_DIR);
  const results = [];

  for (const { name, sourcePath } of skillSources) {
    const targetDir = path.join(CODEX_SKILLS_DIR, name);
    const targetPath = path.join(targetDir, 'SKILL.md');
    ensureDir(targetDir);

    const content = fs.readFileSync(sourcePath, 'utf8');
    const marker = buildMarker({ source: path.relative(process.cwd(), sourcePath), version });
    const projected = `${marker}\n${content}`;

    fs.writeFileSync(targetPath, projected, 'utf8');
    results.push({ name, targetPath, status: 'projected' });
    log(`✓ Codex: projected ${name} → ${targetPath}`);
  }

  return results;
};

/**
 * Detect existing Codex projections.
 */
export const detectProjections = () => {
  if (!fs.existsSync(CODEX_SKILLS_DIR)) {
    return [];
  }
  const dirs = fs.readdirSync(CODEX_SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('opsx-'));

  return dirs
    .map((d) => {
      const skillMd = path.join(CODEX_SKILLS_DIR, d.name, 'SKILL.md');
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
