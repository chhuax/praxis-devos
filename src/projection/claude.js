import fs from 'fs';
import path from 'path';
import { buildMarker, injectMarker, isProjection } from './markers.js';
import {
  copyBundleDirectory,
  ensureDir,
  isWorkflowCommandFile,
  pruneTopLevelBundleFiles,
} from './bundles.js';
import {
  canSafelyOverwrite,
  isManagedAsset,
  pruneManagedAssets,
  registerManagedAsset,
} from './managed-assets.js';
import { resolveUserHomeDir } from '../support/home.js';

const claudeSkillsDir = () => path.join(resolveUserHomeDir(), '.claude', 'skills');
const claudeCommandsDir = () => path.join(resolveUserHomeDir(), '.claude', 'commands');
const sourcePathForManifest = (sourceDir) => {
  const relative = path.relative(process.cwd(), sourceDir);
  return relative && !relative.startsWith('..') ? relative : sourceDir;
};

export const projectSkills = ({ projectDir, skillSources, version, log }) => {
  ensureDir(claudeSkillsDir());
  const results = [];

  for (const {
    name,
    sourceDir,
    sourceType = 'direct',
    sourceRef,
    sourcePack,
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
    if (sourceType === 'openspec-workflow') {
      pruneTopLevelBundleFiles({
        sourceDir,
        targetDir,
        shouldPruneFile: ({ sourcePath, targetPath }) => isWorkflowCommandFile(sourcePath ?? targetPath),
      });
    }

    copyBundleDirectory({
      sourceDir,
      targetDir,
      shouldCopyFile: ({ sourcePath }) => sourceType !== 'openspec-workflow' || sourcePath === sourceSkillPath,
      transformFile: ({ sourcePath }) => {
        if (sourcePath !== sourceSkillPath) {
          return null;
        }

        const content = fs.readFileSync(sourceSkillPath, 'utf8');
        const marker = buildMarker({ source: sourceRef || path.relative(process.cwd(), sourceSkillPath), version });
        return injectMarker(content, marker);
      },
    });
    registerManagedAsset({
      projectDir,
      assetPath: targetPath,
      type: 'skill',
      version,
      agent: 'claude',
      extra: {
        sourceDir: sourcePathForManifest(sourceDir),
        ...(sourcePack ? { sourcePack } : {}),
      },
    });
    results.push({ name, targetPath, status: 'projected', assetType: 'skill', sourceType });
    if (sourceType === 'openspec-workflow') {
      log(`✓ Claude: projected OpenSpec workflow skill ${name} → ${targetPath}`);
    } else {
      log(`✓ Claude: projected ${name} → ${targetPath}`);
    }
  }

  return results;
};

export const resolveCommandTargetPath = (source) => path.join(
  claudeCommandsDir(),
  source.targetRelativePaths?.claude || `${source.name}.md`,
);

export const projectCommands = ({
  projectDir,
  version,
  log,
  commandSources = [],
}) => {
  ensureDir(claudeCommandsDir());
  const results = [];

  for (const source of commandSources) {
    const {
      name,
      sourcePath,
      sourceDir,
      content,
      sourceRef,
      sourcePack,
      sourceType = 'direct',
    } = source;
    const targetPath = resolveCommandTargetPath(source);
    ensureDir(path.dirname(targetPath));
    if (!canSafelyOverwrite({
      assetPath: targetPath,
      projectDir,
      agent: 'claude',
      allowAnyManagedOwner: true,
    })) {
      results.push({ name, targetPath, status: 'skipped', assetType: 'command', sourceType });
      if (sourceType === 'direct') {
        log(`⊘ Claude: skipped docs command ${name} because ${targetPath} is not a Praxis-managed asset`);
      } else {
        log(`⊘ Claude: skipped command ${name} because ${targetPath} is not a Praxis-managed asset`);
      }
      continue;
    }

    fs.writeFileSync(targetPath, typeof content === 'string' ? content : fs.readFileSync(sourcePath, 'utf8'), 'utf8');
    registerManagedAsset({
      projectDir,
      assetPath: targetPath,
      type: 'command',
      version,
      agent: 'claude',
      extra: {
        commandName: name,
        sourceType,
        ...(sourceDir ? { sourceDir: sourcePathForManifest(sourceDir) } : {}),
        ...(sourcePack ? { sourcePack } : {}),
        ...(sourceRef ? { sourceRef } : {}),
      },
    });
    results.push({ name, targetPath, status: 'projected', assetType: 'command', sourceType });
    if (sourceType === 'openspec-workflow') {
      log(`✓ Claude: projected OpenSpec workflow command ${name} → ${targetPath}`);
    } else if (sourceType === 'external-pack') {
      log(`✓ Claude: projected pack command ${name} → ${targetPath}`);
    } else {
      log(`✓ Claude: projected docs command ${name} → ${targetPath}`);
    }
  }

  return results;
};

export const detectSkillProjections = () => {
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

export const detectProjections = () => detectSkillProjections();

export const cleanStaleSkillProjections = ({ projectDir, validNames, log }) => {
  const existing = detectSkillProjections();
  for (const entry of existing) {
    if (!validNames.includes(entry.name)) {
      const managedByAnyOwner = isManagedAsset({ assetPath: entry.path });
      const managedByCurrentOwner = isManagedAsset({ assetPath: entry.path, projectDir, agent: 'claude' });
      if (managedByAnyOwner && !managedByCurrentOwner) {
        continue;
      }

      fs.rmSync(path.dirname(entry.path), { recursive: true, force: true });
      log(`✓ Claude: removed stale projection ${entry.name}`);
    }
  }
};

export const cleanStaleProjections = ({ validNames, log }) => cleanStaleSkillProjections({ validNames, log });

export const pruneManagedSkillAssets = ({
  projectDir,
  validSkillNames,
  log,
}) => {
  const validSkillPaths = validSkillNames.map((name) => path.join(claudeSkillsDir(), name, 'SKILL.md'));
  const removed = pruneManagedAssets({
    projectDir,
    agent: 'claude',
    type: 'skill',
    validPaths: validSkillPaths,
  });

  for (const removedPath of removed) {
    log(`✓ Claude: removed managed skill asset ${removedPath}`);
  }

  return removed;
};

export const pruneManagedCommandAssets = ({
  projectDir,
  validCommandPaths,
  log,
}) => {
  const removed = pruneManagedAssets({
    projectDir,
    agent: 'claude',
    type: 'command',
    validPaths: validCommandPaths,
  });

  for (const removedPath of removed) {
    log(`✓ Claude: removed managed command asset ${removedPath}`);
  }

  return removed;
};
