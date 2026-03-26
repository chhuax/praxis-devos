import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildMarker, isProjection } from './markers.js';

const CLAUDE_COMMANDS_DIR = path.join(os.homedir(), '.claude', 'commands');

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

/**
 * Project OpenSpec skills to ~/.claude/commands/ as flat .md files.
 * Claude Code discovers these as native slash commands (e.g. /opsx-propose).
 */
export const projectSkills = ({ skillSources, version, log }) => {
  ensureDir(CLAUDE_COMMANDS_DIR);
  const results = [];

  for (const { name, sourcePath } of skillSources) {
    const targetPath = path.join(CLAUDE_COMMANDS_DIR, `${name}.md`);
    const content = fs.readFileSync(sourcePath, 'utf8');
    const marker = buildMarker({ source: path.relative(process.cwd(), sourcePath), version });
    const projected = `${marker}\n${content}`;

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
  if (!fs.existsSync(CLAUDE_COMMANDS_DIR)) {
    return [];
  }
  const files = fs.readdirSync(CLAUDE_COMMANDS_DIR).filter((f) => f.startsWith('opsx-') && f.endsWith('.md'));
  return files
    .map((f) => {
      const fullPath = path.join(CLAUDE_COMMANDS_DIR, f);
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
