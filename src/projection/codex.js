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
  pruneManagedAssets,
  registerManagedAsset,
} from './managed-assets.js';
import { resolveUserHomeDir } from '../support/home.js';

const codexSkillsDir = () => path.join(resolveUserHomeDir(), '.codex', 'skills');

/**
 * Project bundled Praxis skills to ~/.codex/skills/ as directories with SKILL.md.
 * Codex discovers these as native skills.
 */
export const projectSkills = ({ projectDir, skillSources, version, log }) => {
  ensureDir(codexSkillsDir());
  const results = [];

  for (const {
    name,
    sourceDir,
    sourceType = 'direct',
  } of skillSources) {
    const targetDir = path.join(codexSkillsDir(), name);
    const targetPath = path.join(targetDir, 'SKILL.md');
    const sourceSkillPath = path.join(sourceDir, 'SKILL.md');
    ensureDir(targetDir);
    if (!canSafelyOverwrite({
      assetPath: targetPath,
      projectDir,
      agent: 'codex',
      allowAnyManagedOwner: true,
      allowLegacyProjection: true,
      isLegacyProjection: isProjection,
    })) {
      results.push({ name, targetPath, status: 'skipped' });
      log(`⊘ Codex: skipped ${name} because ${targetPath} is not a Praxis projection`);
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
        const marker = buildMarker({ source: path.relative(process.cwd(), sourceSkillPath), version });
        return injectMarker(content, marker);
      },
    });
    registerManagedAsset({
      projectDir,
      assetPath: targetPath,
      type: 'skill',
      version,
      agent: 'codex',
      extra: {
        sourceDir: path.relative(process.cwd(), sourceDir),
      },
    });
    results.push({ name, targetPath, status: 'projected', assetType: 'skill', sourceType });
    if (sourceType === 'openspec-workflow') {
      log(`✓ Codex: projected OpenSpec workflow skill ${name} → ${targetPath}`);
    } else {
      log(`✓ Codex: projected ${name} → ${targetPath}`);
    }
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

export const pruneManagedUserAssets = ({ projectDir, validSkillNames, log }) => {
  const validSkillPaths = validSkillNames.map((name) => path.join(codexSkillsDir(), name, 'SKILL.md'));
  const removed = pruneManagedAssets({
    projectDir,
    agent: 'codex',
    validPaths: validSkillPaths,
  });

  for (const removedPath of removed) {
    log(`✓ Codex: removed managed asset ${removedPath}`);
  }

  return removed;
};
