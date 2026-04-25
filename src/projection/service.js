import { collectBundledSkillSources } from './skill-sources.js';
import { resolveProjectionAdapter } from './adapters.js';
import * as skills from './resources/skills.js';
import * as commands from './resources/commands.js';

const resourceProjectors = [skills, commands];

export const assertUniqueSkillNames = skills.assertUniqueResourceNames;

const executeResourcePlan = ({
  agent,
  projectDir = process.cwd(),
  version,
  log,
  resourcePlan,
}) => resourcePlan.projector.executeForAgent({
  agent,
  projectDir,
  version,
  log,
  sources: resourcePlan.sources,
  manageExisting: resourcePlan.manageExisting,
  cleanStaleProjections: resourcePlan.cleanStaleProjections,
});

export const buildProjectionPlan = ({
  agent,
  projectDir = process.cwd(),
  explicitSources = {},
  manageExisting = false,
  cleanStaleProjections = manageExisting,
}) => ({
  resources: resourceProjectors.map((projector) => ({
    resourceType: projector.resourceType,
    projector,
    sources: explicitSources[projector.resourceType]
      ?? projector.collectProjectSources({ projectDir, agent }),
    manageExisting,
    cleanStaleProjections,
  })),
});

export const buildProjectProjectionPlan = ({
  agent,
  projectDir = process.cwd(),
}) => buildProjectionPlan({
  agent,
  projectDir,
  manageExisting: true,
});

export const executeProjectionPlan = ({
  agent,
  projectDir = process.cwd(),
  version,
  log,
  plan,
}) => {
  const projectionPlan = plan ?? buildProjectProjectionPlan({ agent, projectDir });
  const results = [];

  for (const resourcePlan of projectionPlan.resources) {
    results.push(...executeResourcePlan({
      agent,
      projectDir,
      version,
      log,
      resourcePlan,
    }));
  }

  if (results.length === 0) {
    log('⊘ Projection: no supported assets found, skipping');
  }

  return results;
};

export const collectProjectSkillSources = ({ projectDir = process.cwd(), agent }) => (
  skills.collectProjectSources({ projectDir, agent })
);

export const projectSkillSourcesToAgent = ({
  agent,
  projectDir = process.cwd(),
  skillSources = [],
  version,
  log,
}) => (
  executeProjectionPlan({
    agent,
    projectDir,
    version,
    log,
    plan: buildProjectionPlan({
      agent,
      projectDir,
      explicitSources: {
        skills: skillSources,
        commands: [],
      },
    }),
  })
);

export const projectToAgent = ({ agent, projectDir = process.cwd(), version, log }) => (
  executeProjectionPlan({
    agent,
    projectDir,
    version,
    log,
    plan: buildProjectProjectionPlan({ agent, projectDir }),
  })
);

export const detectForAgent = (agent) => {
  const health = skills.inspectHealth({ agent });
  return health.found.map((name) => ({ name }));
};

export const expectedSkillNames = ({ agent, projectDir = process.cwd() } = {}) => (
  skills.collectProjectSources({ agent, projectDir }).map(({ name }) => name)
);

export const inspectProjectionHealth = ({ agent, projectDir = process.cwd() }) => {
  const skillHealth = skills.inspectHealth({ agent, projectDir });
  return {
    expected: skillHealth.expected,
    found: skillHealth.found,
    missing: skillHealth.missing,
    legacy: skillHealth.legacy,
    configError: skillHealth.configError,
  };
};

export { collectBundledSkillSources };
export { resolveProjectionAdapter };
