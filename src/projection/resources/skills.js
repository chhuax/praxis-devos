import { resolveProjectionAdapter } from '../adapters.js';
import { collectDirectSkillSources } from '../skill-sources.js';
import { collectConfiguredSkillPackSources, collectSkillPackSourcesFromEntries } from '../skill-packs.js';
import { collectGeneratedWorkflowSkillSources } from '../openspec-generated.js';

const describeSource = (source) => source.sourceRef || `${source.sourceDir}/SKILL.md`;

export const resourceType = 'skills';

export const assertUniqueResourceNames = (sources) => {
  const seen = new Map();

  for (const source of sources) {
    const existing = seen.get(source.name);
    if (existing) {
      throw new Error(`Duplicate skill name "${source.name}" from ${describeSource(existing)} and ${describeSource(source)}`);
    }

    seen.set(source.name, source);
  }
};

const sortSources = (sources = []) => [...sources].sort((a, b) => a.name.localeCompare(b.name));

export const collectProjectSources = ({ projectDir = process.cwd(), agent, refreshGit = true }) => {
  const sources = sortSources([
    ...collectDirectSkillSources(),
    ...collectConfiguredSkillPackSources({ projectDir, refreshGit }),
    ...collectGeneratedWorkflowSkillSources({ agent }),
  ]);
  assertUniqueResourceNames(sources);
  return sources;
};

export const collectExplicitSources = ({ projectDir = process.cwd(), entries = [] }) => {
  const sources = collectSkillPackSourcesFromEntries({ projectDir, entries });
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
  cleanStaleProjections = manageExisting,
}) => {
  const adapter = resolveProjectionAdapter(agent);
  if (!adapter) {
    log(`⊘ Projection: unknown agent "${agent}", skipping`);
    return [];
  }

  assertUniqueResourceNames(sources);
  const validNames = [...new Set(sources.map(({ name }) => name))];

  if (manageExisting && cleanStaleProjections) {
    adapter.cleanStaleSkillProjections({ projectDir, validNames, log });
  }

  if (manageExisting) {
    if (typeof adapter.pruneManagedSkillAssets === 'function') {
      adapter.pruneManagedSkillAssets({
        projectDir,
        validSkillNames: validNames,
        log,
      });
    }
  }

  if (sources.length === 0) {
    return [];
  }

  return adapter.projectSkills({
    projectDir,
    skillSources: sources,
    version,
    log,
  });
};

export const inspectHealth = ({ agent, projectDir = process.cwd() }) => {
  let expected = [];
  let configError = null;

  try {
    expected = collectProjectSources({ agent, projectDir, refreshGit: false }).map(({ name }) => name);
  } catch (err) {
    configError = err;
  }

  const adapter = resolveProjectionAdapter(agent);
  const projections = adapter ? adapter.detectSkillProjections() : [];
  const found = projections.map((entry) => entry.name);
  const missing = expected.filter((name) => !found.includes(name));
  const legacy = projections
    .map((entry) => entry.name)
    .filter((name) => name.startsWith('opsx-'));

  return {
    resourceType,
    expected,
    found,
    missing,
    legacy,
    configError,
  };
};
