import { resolveProjectionAdapter } from '../adapters.js';
import { collectDirectCommandSources } from '../command-sources.js';
import { collectGeneratedWorkflowCommandSources } from '../openspec-generated.js';
import { collectConfiguredPackEntries, collectPackResourceSources } from '../pack-resources.js';

const describeSource = (source) => source.sourceRef || source.sourcePath || source.name;

export const resourceType = 'commands';

export const assertUniqueResourceNames = (sources) => {
  const seen = new Map();

  for (const source of sources) {
    const existing = seen.get(source.name);
    if (existing) {
      throw new Error(`Duplicate command name "${source.name}" from ${describeSource(existing)} and ${describeSource(source)}`);
    }

    seen.set(source.name, source);
  }
};

const sortSources = (sources = []) => [...sources].sort((a, b) => a.name.localeCompare(b.name));

export const collectProjectSources = ({ projectDir = process.cwd(), agent, refreshGit = true }) => {
  const sources = sortSources([
    ...collectDirectCommandSources(),
    ...collectPackResourceSources({
      projectDir,
      entries: collectConfiguredPackEntries({ projectDir }),
      resourceType,
      refreshGit,
    }),
    ...collectGeneratedWorkflowCommandSources({ agent }),
  ]);
  assertUniqueResourceNames(sources);
  return sources;
};

export const collectExplicitSources = ({ projectDir = process.cwd(), entries = [] }) => {
  const sources = sortSources([
    ...collectPackResourceSources({
      projectDir,
      entries,
      resourceType,
    }),
  ]);
  assertUniqueResourceNames(sources);
  return sources;
};

export const executeForAgent = ({
  agent,
  projectDir = process.cwd(),
  version,
  log,
  sources = [],
  manageExisting = false,
}) => {
  const adapter = resolveProjectionAdapter(agent);
  if (!adapter) {
    log(`⊘ Projection: unknown agent "${agent}", skipping`);
    return [];
  }

  assertUniqueResourceNames(sources);

  if (manageExisting && typeof adapter.pruneManagedCommandAssets === 'function') {
    const validCommandPaths = sources
      .map((source) => adapter.resolveCommandTargetPath?.(source))
      .filter(Boolean);
    adapter.pruneManagedCommandAssets({
      projectDir,
      validCommandPaths,
      log,
    });
  }

  if (sources.length === 0) {
    return [];
  }

  return typeof adapter.projectCommands === 'function'
    ? adapter.projectCommands({
      projectDir,
      version,
      log,
      commandSources: sources,
    })
    : [];
};
