import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { resolveUserHomeDir } from '../support/home.js';
import { runFile, resolveCommandForExecution } from '../core/runtime/commands.js';

const PROJECT_CONFIG_KEY = 'praxis-devos';
const gitCommand = () => resolveCommandForExecution('git');
const PACK_RESOURCE_LAYOUTS = {
  skills: {
    flatDir: ['skills'],
    commonDir: ['common', 'skills'],
    stackDir: ['stacks', '<stack>', 'skills'],
    requiredFile: 'SKILL.md',
  },
  commands: {
    flatDir: ['commands'],
    commonDir: ['common', 'commands'],
    stackDir: ['stacks', '<stack>', 'commands'],
    requiredFile: '.md',
  },
};

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
};

const projectPackageJsonPath = (projectDir) => path.join(projectDir, 'package.json');
const uniqueSorted = (values = []) => [...new Set(values)].sort((a, b) => a.localeCompare(b));

const listResourceEntries = ({ resourcesRoot, requiredFile }) => {
  if (!fs.existsSync(resourcesRoot)) {
    return [];
  }

  if (requiredFile === '.md') {
    return fs.readdirSync(resourcesRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name.slice(0, -3))
      .sort((a, b) => a.localeCompare(b));
  }

  return fs.readdirSync(resourcesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(resourcesRoot, name, requiredFile)))
    .sort((a, b) => a.localeCompare(b));
};

const normalizeStacks = (stacks, entryIndex) => {
  if (stacks == null) {
    return [];
  }

  if (!Array.isArray(stacks) || !stacks.every((value) => typeof value === 'string' && value.trim())) {
    throw new Error(`Invalid praxis-devos.skillPacks[${entryIndex}].stacks: expected an array of non-empty strings`);
  }

  return uniqueSorted(stacks.map((value) => value.trim()));
};

const normalizeSkillPackEntry = (entry, entryIndex) => {
  if (typeof entry === 'string' && entry.trim()) {
    return {
      path: entry.trim(),
      stacks: [],
    };
  }

  if (entry && typeof entry === 'object' && !Array.isArray(entry) && typeof entry.path === 'string' && entry.path.trim()) {
    return {
      path: entry.path.trim(),
      stacks: normalizeStacks(entry.stacks, entryIndex),
    };
  }

  throw new Error(`Invalid praxis-devos.skillPacks[${entryIndex}]: expected a string path or { path, stacks? }`);
};

const readProjectSkillPackConfig = (projectDir) => {
  const pkg = readJson(projectPackageJsonPath(projectDir));
  const config = pkg?.[PROJECT_CONFIG_KEY];
  if (config == null) {
    return [];
  }

  const skillPacks = config?.skillPacks;
  if (skillPacks == null) {
    return [];
  }

  if (!Array.isArray(skillPacks)) {
    throw new Error('Invalid package.json: praxis-devos.skillPacks must be an array');
  }

  return skillPacks.map((entry, index) => normalizeSkillPackEntry(entry, index));
};

const isGitUrl = (value) => /^(git\+)?(ssh|https?|file):\/\//.test(value)
  || /^git@[^:]+:.+/.test(value);

const normalizeGitUrl = (value) => value.startsWith('git+') ? value.slice(4) : value;
const gitPackCacheRoot = () => path.join(resolveUserHomeDir(), '.praxis-devos', 'pack-cache');
const installedPackOwnerRoot = () => path.join(resolveUserHomeDir(), '.praxis-devos', 'installed-packs');

const cachedGitPackDir = (gitUrl) => {
  const hash = crypto.createHash('sha256').update(normalizeGitUrl(gitUrl)).digest('hex').slice(0, 16);
  return path.join(gitPackCacheRoot(), hash);
};

const ensureGitPackCheckedOut = (gitUrl, { refresh = true } = {}) => {
  const normalizedUrl = normalizeGitUrl(gitUrl);
  const targetDir = cachedGitPackDir(normalizedUrl);

  if (!fs.existsSync(targetDir)) {
    if (!refresh) {
      throw new Error(`Git skill pack cache is missing for ${gitUrl}; run setup, update, or install-pack to refresh it`);
    }

    fs.mkdirSync(gitPackCacheRoot(), { recursive: true });
    const cloneResult = runFile(gitCommand(), ['clone', '--depth', '1', normalizedUrl, targetDir], {
      cwd: gitPackCacheRoot(),
    });
    if (!cloneResult.ok) {
      throw new Error(`Failed to clone git pack ${gitUrl}: ${cloneResult.stderr}`);
    }
    return targetDir;
  }

  if (!refresh) {
    return targetDir;
  }

  const fetchResult = runFile(gitCommand(), ['-C', targetDir, 'fetch', '--all', '--prune'], {
    cwd: targetDir,
  });
  if (!fetchResult.ok) {
    throw new Error(`Failed to fetch git pack ${gitUrl}: ${fetchResult.stderr}`);
  }

  const pullResult = runFile(gitCommand(), ['-C', targetDir, 'pull', '--ff-only'], {
    cwd: targetDir,
  });
  if (!pullResult.ok) {
    throw new Error(`Failed to update git pack ${gitUrl}: ${pullResult.stderr}`);
  }

  return targetDir;
};

const resolvePackRoot = ({ projectDir, packPath, refreshGit = true }) => {
  const resolvedLocal = path.isAbsolute(packPath)
    ? path.resolve(packPath)
    : path.resolve(projectDir, packPath);

  if (fs.existsSync(resolvedLocal) && fs.statSync(resolvedLocal).isDirectory()) {
    return {
      packRoot: resolvedLocal,
      sourceKind: 'local',
      resolvedFrom: packPath,
    };
  }

  if (isGitUrl(packPath)) {
    return {
      packRoot: ensureGitPackCheckedOut(packPath, { refresh: refreshGit }),
      sourceKind: 'git',
      resolvedFrom: normalizeGitUrl(packPath),
    };
  }

  throw new Error(`Configured skill pack path does not exist or is not a directory: ${packPath}`);
};

const resourceRoot = (packRoot, segments, stack = null) => {
  const resolvedSegments = segments.map((segment) => (segment === '<stack>' ? stack : segment));
  return path.join(packRoot, ...resolvedSegments);
};

function hasSupportedStackResources(packRoot) {
  const stacksRoot = path.join(packRoot, 'stacks');
  if (!fs.existsSync(stacksRoot)) {
    return false;
  }

  return fs.readdirSync(stacksRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .some((entry) => Object.values(PACK_RESOURCE_LAYOUTS).some((layout) => (
      fs.existsSync(resourceRoot(packRoot, layout.stackDir, entry.name))
    )));
}

const hasAnySupportedResourceLayout = (packRoot) => Object.values(PACK_RESOURCE_LAYOUTS).some((layout) => {
  const flatRoot = resourceRoot(packRoot, layout.flatDir);
  const commonRoot = resourceRoot(packRoot, layout.commonDir);
  return fs.existsSync(flatRoot) || fs.existsSync(commonRoot) || hasSupportedStackResources(packRoot);
});

const inferPackLayout = (packRoot) => {
  const flatRoots = Object.values(PACK_RESOURCE_LAYOUTS)
    .map((layout) => resourceRoot(packRoot, layout.flatDir))
    .filter((root) => fs.existsSync(root));
  const commonRoots = Object.values(PACK_RESOURCE_LAYOUTS)
    .map((layout) => resourceRoot(packRoot, layout.commonDir))
    .filter((root) => fs.existsSync(root));
  const hasStacks = hasSupportedStackResources(packRoot);

  if (flatRoots.length > 0 && (commonRoots.length > 0 || hasStacks)) {
    throw new Error(`Ambiguous pack layout at ${packRoot}: found both flat and common|stacks layouts`);
  }

  if (flatRoots.length > 0) {
    return 'flat';
  }

  if (commonRoots.length > 0 || hasStacks) {
    return 'common-stacks';
  }

  throw new Error(`Unsupported pack layout at ${packRoot}: expected supported resources under flat or common/stacks structure`);
};

const listAvailableStacks = (packRoot) => {
  const stacksRoot = path.join(packRoot, 'stacks');
  if (!fs.existsSync(stacksRoot)) {
    return [];
  }

  return fs.readdirSync(stacksRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((stack) => Object.values(PACK_RESOURCE_LAYOUTS).some((layout) => (
      fs.existsSync(resourceRoot(packRoot, layout.stackDir, stack))
    )))
    .sort((a, b) => a.localeCompare(b));
};

const packNameForRoot = (packRoot) => (
  readJson(path.join(packRoot, 'package.json'))?.name
  || path.basename(packRoot)
);

const resourceSourceFromEntry = ({ resourceType, packName, packRoot, resourcesRoot, entryName }) => {
  const layout = PACK_RESOURCE_LAYOUTS[resourceType];
  const sourcePath = layout.requiredFile === '.md'
    ? path.join(resourcesRoot, `${entryName}.md`)
    : path.join(resourcesRoot, entryName, layout.requiredFile);
  const sourceDir = layout.requiredFile === '.md'
    ? resourcesRoot
    : path.join(resourcesRoot, entryName);
  const relativeSourcePath = path.relative(packRoot, sourcePath).replace(/\\/g, '/');

  return {
    name: entryName,
    sourceDir,
    sourcePath,
    sourceType: 'external-pack',
    sourceRef: `${packName}:${relativeSourcePath}`,
    sourcePack: packName,
    resourceType,
  };
};

const collectResourceSourcesFromRoot = ({ resourceType, packName, packRoot, resourcesRoot }) => {
  const layout = PACK_RESOURCE_LAYOUTS[resourceType];
  return listResourceEntries({
    resourcesRoot,
    requiredFile: layout.requiredFile,
  }).map((entryName) => resourceSourceFromEntry({
    resourceType,
    packName,
    packRoot,
    resourcesRoot,
    entryName,
  }));
};

export const inspectPack = ({ projectDir, packPath, refreshGit = true }) => {
  const {
    packRoot,
    sourceKind,
    resolvedFrom,
  } = resolvePackRoot({ projectDir, packPath, refreshGit });

  if (!hasAnySupportedResourceLayout(packRoot)) {
    throw new Error(`Unsupported pack layout at ${packRoot}: expected supported resources such as skills/ or commands/`);
  }

  const layout = inferPackLayout(packRoot);
  return {
    packRoot,
    packName: packNameForRoot(packRoot),
    layout,
    availableStacks: layout === 'common-stacks' ? listAvailableStacks(packRoot) : [],
    sourceKind,
    resolvedFrom,
  };
};

export const installedPackOwnerDir = ({ inspection }) => {
  const ownerKey = inspection.sourceKind === 'git'
    ? inspection.resolvedFrom
    : path.resolve(inspection.packRoot);
  const hash = crypto.createHash('sha256')
    .update(`${inspection.sourceKind}:${ownerKey}`)
    .digest('hex')
    .slice(0, 16);

  return path.join(installedPackOwnerRoot(), hash);
};

export const collectConfiguredPackEntries = ({ projectDir }) => readProjectSkillPackConfig(projectDir);

export const collectPackResourceSources = ({
  projectDir,
  entries = [],
  resourceType,
  refreshGit = true,
}) => {
  const layout = PACK_RESOURCE_LAYOUTS[resourceType];
  const sources = [];

  for (const entry of entries) {
    const inspection = inspectPack({
      projectDir,
      packPath: entry.path,
      refreshGit,
    });
    const { packRoot, packName } = inspection;

    if (inspection.layout === 'flat') {
      if (entry.stacks.length > 0) {
        throw new Error(`Configured skill pack ${entry.path} does not support stacks; remove praxis-devos.skillPacks[].stacks`);
      }

      sources.push(...collectResourceSourcesFromRoot({
        resourceType,
        packName,
        packRoot,
        resourcesRoot: resourceRoot(packRoot, layout.flatDir),
      }));
      continue;
    }

    sources.push(...collectResourceSourcesFromRoot({
      resourceType,
      packName,
      packRoot,
      resourcesRoot: resourceRoot(packRoot, layout.commonDir),
    }));

    for (const stack of entry.stacks) {
      const stackRoot = resourceRoot(packRoot, layout.stackDir, stack);
      if (!fs.existsSync(stackRoot) || !fs.statSync(stackRoot).isDirectory()) {
        continue;
      }

      sources.push(...collectResourceSourcesFromRoot({
        resourceType,
        packName,
        packRoot,
        resourcesRoot: stackRoot,
      }));
    }
  }

  return sources.sort((a, b) => a.name.localeCompare(b.name));
};
