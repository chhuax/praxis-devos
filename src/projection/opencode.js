import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildMarker, injectMarker, isProjection } from './markers.js';
import {
  canSafelyOverwrite,
  pruneManagedAssets,
  registerManagedAsset,
} from './managed-assets.js';
import { resolveUserHomeDir } from '../support/home.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openCodeSkillsDir = () => path.join(resolveUserHomeDir(), '.claude', 'skills');
const openCodeCommandsDir = () => path.join(resolveUserHomeDir(), '.config', 'opencode', 'commands');
const commandTemplateRoot = () => path.resolve(__dirname, '../templates/opencode-commands');
const commandNames = ['devos-docs-init', 'devos-docs-refresh'];

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

/**
 * Project bundled Praxis skills to ~/.claude/skills/ as shared skill directories with SKILL.md.
 * This mirrors the user-home shared skill drop used by OpenCode integrations.
 */
export const projectSkills = ({ projectDir, skillSources, version, log }) => {
  ensureDir(openCodeSkillsDir());
  const results = [];

  for (const { name, sourcePath } of skillSources) {
    const targetDir = path.join(openCodeSkillsDir(), name);
    const targetPath = path.join(targetDir, 'SKILL.md');
    ensureDir(targetDir);
    if (!canSafelyOverwrite({
      assetPath: targetPath,
      projectDir,
      allowLegacyProjection: true,
      isLegacyProjection: isProjection,
    })) {
      results.push({ name, targetPath, status: 'skipped' });
      log(`⊘ OpenCode: skipped ${name} because ${targetPath} is not a Praxis projection`);
      continue;
    }

    const content = fs.readFileSync(sourcePath, 'utf8');
    const marker = buildMarker({ source: path.relative(process.cwd(), sourcePath), version });
    const projected = injectMarker(content, marker);

    fs.writeFileSync(targetPath, projected, 'utf8');
    registerManagedAsset({
      projectDir,
      assetPath: targetPath,
      type: 'skill',
      version,
      agent: 'opencode',
      extra: {
        sourcePath: path.relative(process.cwd(), sourcePath),
      },
    });
    results.push({ name, targetPath, status: 'projected' });
    log(`✓ OpenCode: projected ${name} → ${targetPath}`);
  }

  return results;
};

export const projectCommands = ({ projectDir, version, log }) => {
  ensureDir(openCodeCommandsDir());
  const results = [];

  for (const name of commandNames) {
    const templatePath = path.join(commandTemplateRoot(), `${name}.md`);
    const targetPath = path.join(openCodeCommandsDir(), `${name}.md`);
    if (!canSafelyOverwrite({ assetPath: targetPath, projectDir })) {
      results.push({ name, targetPath, status: 'skipped' });
      log(`⊘ OpenCode: skipped docs command ${name} because ${targetPath} is not a Praxis-managed asset`);
      continue;
    }

    fs.writeFileSync(targetPath, fs.readFileSync(templatePath, 'utf8'), 'utf8');
    registerManagedAsset({
      projectDir,
      assetPath: targetPath,
      type: 'command',
      version,
      agent: 'opencode',
      extra: {
        commandName: name,
      },
    });
    results.push({ name, targetPath, status: 'projected' });
    log(`✓ OpenCode: projected docs command ${name} → ${targetPath}`);
  }

  return results;
};

export const detectProjections = () => {
  if (!fs.existsSync(openCodeSkillsDir())) {
    return [];
  }

  const dirs = fs.readdirSync(openCodeSkillsDir(), { withFileTypes: true })
    .filter((d) => d.isDirectory());

  return dirs
    .map((d) => {
      const skillMd = path.join(openCodeSkillsDir(), d.name, 'SKILL.md');
      return { name: d.name, path: skillMd, isProjection: isProjection(skillMd) };
    })
    .filter((entry) => entry.isProjection);
};

export const cleanStaleProjections = ({ validNames, log }) => {
  const existing = detectProjections();
  for (const entry of existing) {
    if (!validNames.includes(entry.name)) {
      fs.rmSync(path.dirname(entry.path), { recursive: true, force: true });
      log(`✓ OpenCode: removed stale projection ${entry.name}`);
    }
  }
};

export const pruneManagedUserAssets = ({
  projectDir,
  validSkillNames,
  keepCommandNames = commandNames,
  log,
}) => {
  const validSkillPaths = validSkillNames.map((name) => path.join(openCodeSkillsDir(), name, 'SKILL.md'));
  const validCommandPaths = keepCommandNames.map((name) => path.join(openCodeCommandsDir(), `${name}.md`));
  const removed = pruneManagedAssets({
    projectDir,
    agent: 'opencode',
    validPaths: [...validSkillPaths, ...validCommandPaths],
  });

  for (const removedPath of removed) {
    log(`✓ OpenCode: removed managed asset ${removedPath}`);
  }

  return removed;
};
