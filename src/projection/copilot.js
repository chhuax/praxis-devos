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

const copilotSkillsDir = () => path.join(resolveUserHomeDir(), '.claude', 'skills');
const sourcePathForManifest = (sourceDir) => {
  const relative = path.relative(process.cwd(), sourceDir);
  return relative && !relative.startsWith('..') ? relative : sourceDir;
};

export const projectSkills = ({ projectDir, skillSources, version, log }) => {
  ensureDir(copilotSkillsDir());
  const results = [];

  for (const {
    name,
    sourceDir,
    sourceType = 'direct',
    sourceRef,
    sourcePack,
  } of skillSources) {
    const targetDir = path.join(copilotSkillsDir(), name);
    const targetPath = path.join(targetDir, 'SKILL.md');
    const sourceSkillPath = path.join(sourceDir, 'SKILL.md');
    ensureDir(targetDir);
    if (!canSafelyOverwrite({
      assetPath: targetPath,
      projectDir,
      agent: 'copilot',
      allowAnyManagedOwner: true,
      allowLegacyProjection: true,
      isLegacyProjection: isProjection,
    })) {
      results.push({ name, targetPath, status: 'skipped' });
      log(`⊘ GitHub Copilot: skipped ${name} because ${targetPath} is not a Praxis projection`);
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
      agent: 'copilot',
      extra: {
        sourceDir: sourcePathForManifest(sourceDir),
        ...(sourcePack ? { sourcePack } : {}),
      },
    });
    results.push({ name, targetPath, status: 'projected', assetType: 'skill', sourceType });
    if (sourceType === 'openspec-workflow') {
      log(`✓ GitHub Copilot: projected OpenSpec workflow skill ${name} → ${targetPath}`);
    } else {
      log(`✓ GitHub Copilot: projected ${name} → ${targetPath}`);
    }
  }

  return results;
};

export const resolveCommandTargetPath = () => null;
export const projectCommands = ({ log }) => {
  log('⊘ GitHub Copilot: command projection is not supported; projecting skills only');
  return [];
};

export const detectSkillProjections = () => {
  if (!fs.existsSync(copilotSkillsDir())) {
    return [];
  }

  const dirs = fs.readdirSync(copilotSkillsDir(), { withFileTypes: true })
    .filter((d) => d.isDirectory());

  return dirs
    .map((d) => {
      const skillMd = path.join(copilotSkillsDir(), d.name, 'SKILL.md');
      return { name: d.name, path: skillMd, isProjection: isProjection(skillMd) };
    })
    .filter((entry) => entry.isProjection);
};

export const detectProjections = () => detectSkillProjections();

export const cleanStaleSkillProjections = ({ projectDir, validNames, log }) => {
  const existing = detectSkillProjections();
  for (const entry of existing) {
    if (!validNames.includes(entry.name)) {
      const managedByAnyOwner = isManagedAsset({ assetPath: entry.path });
      const managedByCurrentOwner = isManagedAsset({ assetPath: entry.path, projectDir, agent: 'copilot' });
      if (managedByAnyOwner && !managedByCurrentOwner) {
        continue;
      }

      fs.rmSync(path.dirname(entry.path), { recursive: true, force: true });
      log(`✓ GitHub Copilot: removed stale projection ${entry.name}`);
    }
  }
};

export const cleanStaleProjections = ({ validNames, log }) => cleanStaleSkillProjections({ validNames, log });

export const pruneManagedSkillAssets = ({
  projectDir,
  validSkillNames,
  log,
}) => {
  const validSkillPaths = validSkillNames.map((name) => path.join(copilotSkillsDir(), name, 'SKILL.md'));
  const removed = pruneManagedAssets({
    projectDir,
    agent: 'copilot',
    type: 'skill',
    validPaths: validSkillPaths,
  });

  for (const removedPath of removed) {
    log(`✓ GitHub Copilot: removed managed skill asset ${removedPath}`);
  }

  return removed;
};

export const pruneManagedCommandAssets = () => [];
