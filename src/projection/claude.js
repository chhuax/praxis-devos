import fs from 'fs';
import path from 'path';
import { buildMarker, canWriteProjection, injectMarker, isProjection } from './markers.js';
import { resolveUserHomeDir } from '../support/home.js';

const claudeCommandsDir = () => path.join(resolveUserHomeDir(), '.claude', 'commands');

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

/**
 * Project OpenSpec skills to ~/.claude/commands/ as flat .md files.
 * Claude Code discovers these as native slash commands (e.g. /opsx-propose).
 */
export const projectSkills = ({ skillSources, version, log }) => {
  ensureDir(claudeCommandsDir());
  const results = [];

  for (const { name, sourcePath } of skillSources) {
    const targetPath = path.join(claudeCommandsDir(), `${name}.md`);
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
  if (!fs.existsSync(claudeCommandsDir())) {
    return [];
  }
  const files = fs.readdirSync(claudeCommandsDir()).filter((f) => f.startsWith('opsx-') && f.endsWith('.md'));
  return files
    .map((f) => {
      const fullPath = path.join(claudeCommandsDir(), f);
      return { name: f.replace('.md', ''), path: fullPath, isProjection: isProjection(fullPath) };
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
      fs.unlinkSync(entry.path);
      log(`✓ Claude: removed stale projection ${entry.name}`);
    }
  }
};
