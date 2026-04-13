import fs from 'fs';
import path from 'path';
import { buildMarker, injectMarker, isProjection } from './markers.js';
import { copyBundleDirectory, ensureDir } from './bundles.js';
import { composeProjectedSkill } from './skill-sources.js';
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
    overlayPath = null,
    overlayAssetsDir = null,
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
      agent: 'codex',
      extra: {
        sourceDir: path.relative(process.cwd(), sourceDir),
        ...(overlayPath ? { overlayPath: path.relative(process.cwd(), overlayPath) } : {}),
        ...(overlayAssetsDir ? { overlayAssetsDir: path.relative(process.cwd(), overlayAssetsDir) } : {}),
      },
    });
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
