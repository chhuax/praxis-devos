import fs from 'fs';
import path from 'path';
import { resolveUserHomeDir } from '../support/home.js';

const MANAGED_ASSETS_VERSION = 2;

export const managedAssetsPath = () => path.join(
  resolveUserHomeDir(),
  '.praxis-devos',
  'managed-assets.json',
);

const normalizeAssetPath = (assetPath) => path.resolve(assetPath);
const normalizeProject = (projectDir) => path.resolve(projectDir);
const normalizeOwnerRef = (projectDir, agent = null) => `${normalizeProject(projectDir)}::${agent || 'shared'}`;
const isOwnerForProject = (ownerRef, projectDir) => ownerRef.startsWith(`${normalizeProject(projectDir)}::`);

const defaultManifest = () => ({
  version: MANAGED_ASSETS_VERSION,
  assets: {},
});

const uniqueStrings = (values = []) => [...new Set(
  values.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim()),
)];

const inferLegacyAssetType = (assetPath, entry = {}) => {
  if (typeof entry?.type === 'string' && entry.type.trim()) {
    return entry.type.trim();
  }

  const normalizedPath = normalizeAssetPath(assetPath);
  if (path.basename(normalizedPath) === 'SKILL.md') {
    return 'skill';
  }

  if (
    normalizedPath.endsWith('.md')
    || normalizedPath.includes(`${path.sep}commands${path.sep}`)
  ) {
    return 'command';
  }

  return null;
};

const inferLegacyOwners = (entry = {}, agents = []) => {
  const explicitOwners = uniqueStrings(entry.owners);
  if (explicitOwners.length > 0) {
    return explicitOwners;
  }

  const directOwner = uniqueStrings([
    entry.owner,
    entry.ownerRef,
  ]);
  if (directOwner.length > 0) {
    return directOwner;
  }

  const legacyProjectDir = typeof entry.projectDir === 'string' && entry.projectDir.trim()
    ? entry.projectDir.trim()
    : typeof entry.project === 'string' && entry.project.trim()
      ? entry.project.trim()
      : null;

  if (!legacyProjectDir) {
    return [];
  }

  if (agents.length > 0) {
    return agents.map((agent) => normalizeOwnerRef(legacyProjectDir, agent));
  }

  return [normalizeOwnerRef(legacyProjectDir, null)];
};

const normalizeManagedAssetEntry = (assetPath, entry = {}) => {
  const agents = uniqueStrings([
    ...(Array.isArray(entry?.agents) ? entry.agents : []),
    entry?.agent,
  ]);
  const owners = inferLegacyOwners(entry, agents);
  const type = inferLegacyAssetType(assetPath, entry);

  return {
    ...entry,
    ...(type ? { type } : {}),
    ...(agents.length > 0 ? {
      agents,
      agent: agents.length === 1 ? agents[0] : undefined,
    } : {}),
    owners,
  };
};

const normalizeManagedManifest = (parsed) => {
  const manifest = defaultManifest();
  const assets = parsed && typeof parsed.assets === 'object' && parsed.assets ? parsed.assets : {};
  let changed = parsed?.version !== MANAGED_ASSETS_VERSION;

  for (const [assetPath, entry] of Object.entries(assets)) {
    const normalizedPath = normalizeAssetPath(assetPath);
    const normalizedEntry = normalizeManagedAssetEntry(normalizedPath, entry);
    manifest.assets[normalizedPath] = normalizedEntry;

    if (normalizedPath !== assetPath) {
      changed = true;
    }
    if (JSON.stringify(normalizedEntry) !== JSON.stringify(entry || {})) {
      changed = true;
    }
  }

  return { manifest, changed };
};

export const readManagedAssets = () => {
  const filePath = managedAssetsPath();
  if (!fs.existsSync(filePath)) {
    return defaultManifest();
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const { manifest, changed } = normalizeManagedManifest(parsed);
    if (changed) {
      writeManagedAssets(manifest);
    }
    return manifest;
  } catch {
    return defaultManifest();
  }
};

export const writeManagedAssets = (manifest) => {
  const filePath = managedAssetsPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify({
    version: MANAGED_ASSETS_VERSION,
    assets: manifest?.assets || {},
  }, null, 2)}\n`, 'utf8');
};

export const listManagedAssets = ({ type = null, agent = null, projectDir = null } = {}) => {
  const ownerRef = projectDir && agent ? normalizeOwnerRef(projectDir, agent) : null;
  return Object.entries(readManagedAssets().assets)
    .filter(([_, entry]) => (type ? entry?.type === type : true))
    .filter(([_, entry]) => {
      if (!agent) {
        return true;
      }

      const agentValues = [
        ...(Array.isArray(entry?.agents) ? entry.agents : []),
        ...(entry?.agent ? [entry.agent] : []),
      ];

      return agentValues.includes(agent);
    })
    .filter(([_, entry]) => {
      if (!projectDir) {
        return true;
      }

      const owners = entry?.owners || [];
      if (ownerRef) {
        return owners.includes(ownerRef);
      }

      return owners.some((value) => isOwnerForProject(value, projectDir));
    })
    .map(([assetPath, entry]) => ({ path: assetPath, ...entry }));
};

export const isManagedAsset = ({ assetPath, projectDir = null, agent = null }) => {
  const entry = readManagedAssets().assets[normalizeAssetPath(assetPath)];
  if (!entry) {
    return false;
  }

  if (!projectDir) {
    return true;
  }

  const owners = entry.owners || [];
  if (agent) {
    return owners.includes(normalizeOwnerRef(projectDir, agent));
  }

  return owners.some((value) => isOwnerForProject(value, projectDir));
};

export const registerManagedAsset = ({
  projectDir,
  assetPath,
  type,
  version,
  agent = null,
  source = 'praxis-devos',
  extra = {},
}) => {
  const normalizedPath = normalizeAssetPath(assetPath);
  const normalizedOwner = normalizeOwnerRef(projectDir, agent);
  const manifest = readManagedAssets();
  const current = manifest.assets[normalizedPath] || {};
  const owners = [...new Set([...(current.owners || []), normalizedOwner])];
  const agents = [...new Set([
    ...(Array.isArray(current.agents) ? current.agents : []),
    ...(current.agent ? [current.agent] : []),
    ...(agent ? [agent] : []),
  ])];
  const installedAt = current.installedAt || new Date().toISOString();

  manifest.assets[normalizedPath] = {
    source,
    version,
    type,
    agent: agents.length === 1 ? agents[0] : undefined,
    agents,
    installedAt,
    owners,
    ...extra,
  };

  writeManagedAssets(manifest);
  return manifest.assets[normalizedPath];
};

export const unregisterManagedAsset = ({ projectDir, assetPath, agent = null }) => {
  const normalizedPath = normalizeAssetPath(assetPath);
  const normalizedOwner = agent ? normalizeOwnerRef(projectDir, agent) : null;
  const manifest = readManagedAssets();
  const current = manifest.assets[normalizedPath];

  if (!current) {
    return { removed: false, deleted: false };
  }

  const nextOwners = (current.owners || []).filter((owner) => (
    normalizedOwner ? owner !== normalizedOwner : !isOwnerForProject(owner, projectDir)
  ));
  if (nextOwners.length === 0) {
    delete manifest.assets[normalizedPath];
    writeManagedAssets(manifest);
    return { removed: true, deleted: true };
  }

  manifest.assets[normalizedPath] = {
    ...current,
    owners: nextOwners,
  };
  writeManagedAssets(manifest);
  return { removed: true, deleted: false };
};

export const canSafelyOverwrite = ({
  assetPath,
  projectDir = null,
  agent = null,
  allowAnyManagedOwner = false,
  allowLegacyProjection = false,
  isLegacyProjection = () => false,
}) => {
  if (!fs.existsSync(assetPath)) {
    return true;
  }

  if (allowAnyManagedOwner && isManagedAsset({ assetPath })) {
    return true;
  }

  if (isManagedAsset({ assetPath, projectDir, agent })) {
    return true;
  }

  if (allowLegacyProjection && isLegacyProjection(assetPath)) {
    return true;
  }

  return false;
};

export const pruneManagedAssets = ({ projectDir, agent = null, type = null, validPaths = [] }) => {
  const keep = new Set(validPaths.map((entry) => normalizeAssetPath(entry)));
  const assets = listManagedAssets({ projectDir, agent, type });
  const removed = [];

  for (const entry of assets) {
    if (keep.has(normalizeAssetPath(entry.path))) {
      continue;
    }

    const unregisterResult = unregisterManagedAsset({ projectDir, assetPath: entry.path, agent });
    if (unregisterResult.deleted) {
      fs.rmSync(entry.path, { recursive: true, force: true });
      if (path.basename(entry.path) === 'SKILL.md') {
        const parentDir = path.dirname(entry.path);
        try {
          if (fs.existsSync(parentDir) && fs.readdirSync(parentDir).length === 0) {
            fs.rmSync(parentDir, { recursive: true, force: true });
          }
        } catch {
          // Ignore cleanup failures for empty parent directories.
        }
      }
      removed.push(entry.path);
    }
  }

  return removed;
};
