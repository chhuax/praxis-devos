import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildMarker, injectMarker, isProjection } from './markers.js';
import { copyBundleDirectory, ensureDir } from './bundles.js';
import { composeProjectedCommand, composeProjectedSkill } from './skill-sources.js';
import {
  canSafelyOverwrite,
  pruneManagedAssets,
  registerManagedAsset,
} from './managed-assets.js';
import { resolveUserHomeDir } from '../support/home.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// OpenCode currently shares ~/.claude/skills/ as its native user-level skill surface.
const openCodeSkillsDir = () => path.join(resolveUserHomeDir(), '.claude', 'skills');
const openCodeCommandsDir = () => path.join(resolveUserHomeDir(), '.config', 'opencode', 'commands');
const commandAssetRoot = () => path.resolve(__dirname, '../../assets/commands');
const commandNames = ['devos-docs-init', 'devos-docs-refresh'];

/**
 * Project bundled Praxis skills to ~/.claude/skills/ as shared skill directories with SKILL.md.
 * This mirrors the user-home shared skill drop used by OpenCode integrations.
 */
export const projectSkills = ({ projectDir, skillSources, version, log }) => {
  ensureDir(openCodeSkillsDir());
  const results = [];

  for (const {
    name,
    sourceDir,
    overlayPath = null,
    overlayAssetsDir = null,
    sourceType = 'direct',
  } of skillSources) {
    const targetDir = path.join(openCodeSkillsDir(), name);
    const targetPath = path.join(targetDir, 'SKILL.md');
    const sourceSkillPath = path.join(sourceDir, 'SKILL.md');
    ensureDir(targetDir);
    if (!canSafelyOverwrite({
      assetPath: targetPath,
      projectDir,
      agent: 'opencode',
      allowAnyManagedOwner: true,
      allowLegacyProjection: true,
      isLegacyProjection: isProjection,
    })) {
      results.push({ name, targetPath, status: 'skipped' });
      log(`⊘ OpenCode: skipped ${name} because ${targetPath} is not a Praxis projection`);
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
        const finalContent = sourceType === 'openspec-generated'
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
      agent: 'opencode',
      extra: {
        sourceDir: path.relative(process.cwd(), sourceDir),
        ...(overlayPath ? { overlayPath: path.relative(process.cwd(), overlayPath) } : {}),
        ...(overlayAssetsDir ? { overlayAssetsDir: path.relative(process.cwd(), overlayAssetsDir) } : {}),
      },
    });
    results.push({ name, targetPath, status: 'projected', assetType: 'skill', sourceType });
    if (sourceType === 'openspec-generated') {
      log(`✓ OpenCode: adopted OpenSpec workflow skill ${name} → ${targetPath}`);
    } else {
      log(`✓ OpenCode: projected ${name} → ${targetPath}`);
    }
  }

  return results;
};

export const projectCommands = ({ projectDir, version, log, workflowCommandSources = [] }) => {
  ensureDir(openCodeCommandsDir());
  const results = [];

  for (const {
    name,
    sourcePath,
    sourceType,
    targetRelativePath,
    overlayPath = null,
    overlayAssetsDir = null,
  } of workflowCommandSources) {
    const targetPath = path.join(openCodeCommandsDir(), targetRelativePath);
    ensureDir(path.dirname(targetPath));
    if (!canSafelyOverwrite({
      assetPath: targetPath,
      projectDir,
      agent: 'opencode',
      allowAnyManagedOwner: true,
    })) {
      results.push({ name, targetPath, status: 'skipped', assetType: 'command', sourceType });
      log(`⊘ OpenCode: skipped OpenSpec workflow command ${name} because ${targetPath} is not a Praxis-managed asset`);
      continue;
    }

    const content = fs.readFileSync(sourcePath, 'utf8');
    const finalContent = sourceType === 'openspec-generated'
      ? composeProjectedCommand({ upstreamContent: content, overlayPath })
      : content;
    fs.writeFileSync(targetPath, finalContent, 'utf8');
    if (overlayAssetsDir) {
      copyBundleDirectory({ sourceDir: overlayAssetsDir, targetDir: path.dirname(targetPath) });
    }
    registerManagedAsset({
      projectDir,
      assetPath: targetPath,
      type: 'command',
      version,
      agent: 'opencode',
      extra: {
        commandName: name,
        sourcePath: path.relative(process.cwd(), sourcePath),
        ...(overlayPath ? { overlayPath: path.relative(process.cwd(), overlayPath) } : {}),
        ...(overlayAssetsDir ? { overlayAssetsDir: path.relative(process.cwd(), overlayAssetsDir) } : {}),
      },
    });
    results.push({ name, targetPath, status: 'projected', assetType: 'command', sourceType });
    log(`✓ OpenCode: adopted OpenSpec workflow command ${name} → ${targetPath}`);
  }

  for (const name of commandNames) {
    const templatePath = path.join(commandAssetRoot(), `${name}.md`);
    const targetPath = path.join(openCodeCommandsDir(), `${name}.md`);
    if (!canSafelyOverwrite({
      assetPath: targetPath,
      projectDir,
      agent: 'opencode',
      allowAnyManagedOwner: true,
    })) {
      results.push({ name, targetPath, status: 'skipped', assetType: 'command', sourceType: 'direct' });
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
    results.push({ name, targetPath, status: 'projected', assetType: 'command', sourceType: 'direct' });
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
