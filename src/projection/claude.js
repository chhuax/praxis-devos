import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildMarker, injectMarker, isProjection } from './markers.js';
import { copyBundleDirectory, ensureDir } from './bundles.js';
import { composeProjectedSkill } from './skill-sources.js';
import {
  canSafelyOverwrite,
  pruneManagedAssets,
  registerManagedAsset,
} from './managed-assets.js';
import { resolveUserHomeDir } from '../support/home.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const claudeSkillsDir = () => path.join(resolveUserHomeDir(), '.claude', 'skills');
const claudeCommandsDir = () => path.join(resolveUserHomeDir(), '.claude', 'commands');
const commandAssetRoot = () => path.resolve(__dirname, '../../assets/commands');
const commandNames = ['devos-docs-init', 'devos-docs-refresh'];

/**
 * Project bundled Praxis skills to ~/.claude/skills/ as skill directories with SKILL.md.
 * Claude Code discovers these as native skills.
 */
export const projectSkills = ({ projectDir, skillSources, version, log }) => {
  ensureDir(claudeSkillsDir());
  const results = [];

  for (const {
    name,
    sourceDir,
    overlayPath = null,
    overlayAssetsDir = null,
    sourceType = 'direct',
  } of skillSources) {
    const targetDir = path.join(claudeSkillsDir(), name);
    const targetPath = path.join(targetDir, 'SKILL.md');
    const sourceSkillPath = path.join(sourceDir, 'SKILL.md');
    ensureDir(targetDir);
    if (!canSafelyOverwrite({
      assetPath: targetPath,
      projectDir,
      agent: 'claude',
      allowAnyManagedOwner: true,
      allowLegacyProjection: true,
      isLegacyProjection: isProjection,
    })) {
      results.push({ name, targetPath, status: 'skipped' });
      log(`⊘ Claude: skipped ${name} because ${targetPath} is not a Praxis projection`);
      continue;
    }
    copyBundleDirectory({
      sourceDir,
      targetDir,
      transformFile: ({ sourcePath }) => {
        if (sourcePath !== sourceSkillPath) {
          return null;
        }

        const content = fs.readFileSync(sourceSkillPath, 'utf8');
        const finalContent = sourceType === 'openspec-upstream'
          ? composeProjectedSkill({ projectedName: name, upstreamContent: content, overlayPath })
          : content;
        const marker = buildMarker({ source: path.relative(process.cwd(), sourceSkillPath), version });
        return injectMarker(finalContent, marker);
      },
    });
    if (overlayAssetsDir) {
      copyBundleDirectory({ sourceDir: overlayAssetsDir, targetDir });
    }
    registerManagedAsset({
      projectDir,
      assetPath: targetPath,
      type: 'skill',
      version,
      agent: 'claude',
      extra: {
        sourceDir: path.relative(process.cwd(), sourceDir),
        ...(overlayPath ? { overlayPath: path.relative(process.cwd(), overlayPath) } : {}),
        ...(overlayAssetsDir ? { overlayAssetsDir: path.relative(process.cwd(), overlayAssetsDir) } : {}),
      },
    });
    results.push({ name, targetPath, status: 'projected' });
    log(`✓ Claude: projected ${name} → ${targetPath}`);
  }

  return results;
};

export const projectCommands = ({ projectDir, version, log }) => {
  ensureDir(claudeCommandsDir());
  const results = [];

  for (const name of commandNames) {
    const templatePath = path.join(commandAssetRoot(), `${name}.md`);
    const targetPath = path.join(claudeCommandsDir(), `${name}.md`);
    if (!canSafelyOverwrite({
      assetPath: targetPath,
      projectDir,
      agent: 'claude',
      allowAnyManagedOwner: true,
    })) {
      results.push({ name, targetPath, status: 'skipped' });
      log(`⊘ Claude: skipped docs command ${name} because ${targetPath} is not a Praxis-managed asset`);
      continue;
    }

    fs.writeFileSync(targetPath, fs.readFileSync(templatePath, 'utf8'), 'utf8');
    registerManagedAsset({
      projectDir,
      assetPath: targetPath,
      type: 'command',
      version,
      agent: 'claude',
      extra: {
        commandName: name,
      },
    });
    results.push({ name, targetPath, status: 'projected' });
    log(`✓ Claude: projected docs command ${name} → ${targetPath}`);
  }

  return results;
};

export const detectProjections = () => {
  if (!fs.existsSync(claudeSkillsDir())) {
    return [];
  }
  const dirs = fs.readdirSync(claudeSkillsDir(), { withFileTypes: true })
    .filter((d) => d.isDirectory());
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

export const pruneManagedUserAssets = ({
  projectDir,
  validSkillNames,
  keepCommandNames = commandNames,
  log,
}) => {
  const validSkillPaths = validSkillNames.map((name) => path.join(claudeSkillsDir(), name, 'SKILL.md'));
  const validCommandPaths = keepCommandNames.map((name) => path.join(claudeCommandsDir(), `${name}.md`));
  const removed = pruneManagedAssets({
    projectDir,
    agent: 'claude',
    validPaths: [...validSkillPaths, ...validCommandPaths],
  });

  for (const removedPath of removed) {
    log(`✓ Claude: removed managed asset ${removedPath}`);
  }

  return removed;
};
