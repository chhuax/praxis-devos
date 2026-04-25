import fs from 'fs';
import path from 'path';
import {
  OPENSPEC_PACKAGE,
  SUPERPOWERS_OPENCODE_PLUGIN,
  CLAUDE_SUPERPOWERS_PLUGIN,
  bootstrapOpenSpec,
  bootstrapProject,
  doctorProject,
  ensureBundledOpenSpecSchemaInstalled,
  ensureOpenSpecRuntime,
  ensureOpenSpecUserConfig,
  ensureRuntimeDependencies,
  formatStatus,
  detectSuperpowersForAgent,
} from './runtime/dependencies.js';
import {
  PACKAGE_JSON,
  PRAXIS_ROOT,
  MANAGED_ENTRY_TEMPLATE,
  SUPPORTED_AGENTS,
  getPackageVersion,
  isProjectInitialized,
  listDirs,
  projectPaths,
  readFile,
  uniqueAgents,
} from './project/state.js';
import { PRAXIS_CLI_COMMAND } from './constants/cli.js';
import { commandExists, resolveOpenSpecRuntime } from './runtime/commands.js';
import { collectDirectSkillSources } from '../projection/skill-sources.js';
import { collectDirectCommandSources } from '../projection/command-sources.js';
import {
  collectGeneratedWorkflowCommandSources,
  collectGeneratedWorkflowSkillSources,
} from '../projection/openspec-generated.js';
import {
  assertUniqueSkillNames,
  buildProjectionPlan,
  executeProjectionPlan,
} from '../projection/index.js';
import { assertUniqueResourceNames as assertUniqueCommandNames } from '../projection/resources/commands.js';
import {
  collectPackResourceSources,
  installedPackOwnerDir,
} from '../projection/pack-resources.js';
import {
  collectSkillPackSourcesFromEntries,
  inspectSkillPack,
} from '../projection/skill-packs.js';
import {
  initProject,
  populateOpenSpecConfig,
  projectNativeSkills,
  syncProject,
} from './project/adapters.js';

// Core orchestrates CLI entrypoints. It should stay thin: parse args, call the
// right scaffold modules, and stitch their outputs together.

export {
  CLAUDE_SUPERPOWERS_PLUGIN,
  MANAGED_ENTRY_TEMPLATE,
  OPENSPEC_PACKAGE,
  PACKAGE_JSON,
  PRAXIS_ROOT,
  SUPERPOWERS_OPENCODE_PLUGIN,
  SUPPORTED_AGENTS,
  bootstrapOpenSpec,
  bootstrapProject,
  commandExists,
  doctorProject,
  initProject,
  listDirs,
  populateOpenSpecConfig,
  projectNativeSkills,
  readFile,
  syncProject,
};

/**
 * Setup is the highest-level project bootstrap entrypoint:
 * ensure dependencies, initialize or refresh the project scaffold,
 * then project bundled skills and print a fresh dependency report.
 */
export const setupProject = ({ projectDir, agents = SUPPORTED_AGENTS, strict = false }) => {
  const selectedAgents = uniqueAgents(agents);
  const outputs = [];

  outputs.push(ensureOpenSpecRuntime(projectDir));
  outputs.push('');
  outputs.push(ensureBundledOpenSpecSchemaInstalled());
  outputs.push(ensureOpenSpecUserConfig());
  outputs.push('');
  outputs.push(ensureRuntimeDependencies({ projectDir, agents: selectedAgents }));
  outputs.push('');

  if (!isProjectInitialized(projectDir)) {
    outputs.push('== setup ==');
    outputs.push(initProject({ projectDir, agents: selectedAgents }));
  } else {
    outputs.push('== setup ==');
    outputs.push('Project already initialized; refreshing selected agents and managed adapters.');
    outputs.push(syncProject({ projectDir, agents: selectedAgents }));
  }

  const projLogs = [];
  const projLog = (msg) => projLogs.push(msg);
  projectNativeSkills({ projectDir, agents: selectedAgents, log: projLog });
  populateOpenSpecConfig({ projectDir, log: projLog });
  if (projLogs.length > 0) {
    outputs.push('');
    outputs.push('== native projection ==');
    outputs.push(projLogs.join('\n'));
  }

  outputs.push('');
  outputs.push(doctorProject({ projectDir, agents: selectedAgents, strict }));

  return outputs.filter(Boolean).join('\n');
};

/**
 * Status is intentionally read-only. It reports the current scaffold state,
 * active changes, and dependency health without mutating the project.
 */
export const statusProject = ({ projectDir, agents = SUPPORTED_AGENTS }) => {
  const paths = projectPaths(projectDir);
  const selectedAgents = uniqueAgents(agents);
  const activeChangesDir = path.join(paths.openspecDir, 'changes');
  const activeChanges = listDirs(activeChangesDir).filter((name) => !name.startsWith('.'));
  const adapterStatuses = [
    { name: 'codex', ok: fs.existsSync(paths.rootAgentsMd) },
    { name: 'claude', ok: fs.existsSync(paths.rootClaudeMd) },
    { name: 'copilot', ok: fs.existsSync(paths.rootAgentsMd) },
    { name: 'opencode', ok: fs.existsSync(paths.legacyOpenCodeDir) },
  ];
  const openspecRuntime = resolveOpenSpecRuntime(projectDir);
  const dependencyLines = [
    `- openspec: [${formatStatus(openspecRuntime.status)}] ${openspecRuntime.detail}`,
    ...selectedAgents.map((agent) => {
      const detection = detectSuperpowersForAgent(projectDir, agent);
      return `- superpowers:${agent}: [${formatStatus(detection.status)}] ${detection.detail}`;
    }),
  ];

  const lines = [
    'Project status:',
    `- initialized: ${fs.existsSync(paths.openspecDir) ? 'yes' : 'no'}`,
    `- openspec workspace: ${fs.existsSync(paths.openspecDir) ? 'present' : 'missing'}`,
    `- framework version: ${getPackageVersion()}`,
  ];

  lines.push(`- adapters: ${adapterStatuses.map((adapter) => `${adapter.name}=${adapter.ok ? 'ready' : 'missing'}`).join(', ')}`);
  lines.push(`- active changes: ${activeChanges.length > 0 ? activeChanges.join(', ') : 'none'}`);
  lines.push('');
  lines.push('Dependencies:');
  lines.push(...dependencyLines);

  return lines.join('\n');
};

export const installPackProject = ({
  skillPackPath,
  projectDir = process.cwd(),
  stacks = [],
  agents = SUPPORTED_AGENTS,
}) => {
  if (!skillPackPath) {
    throw new Error('install-pack requires a pack path argument');
  }

  const selectedAgents = uniqueAgents(agents);
  const baseDir = projectDir;
  const selectedStacks = [...new Set(
    stacks.map((value) => String(value || '').trim()).filter(Boolean),
  )].sort((a, b) => a.localeCompare(b));
  const inspection = inspectSkillPack({
    projectDir: baseDir,
    skillPackPath,
  });
  const ownerProjectDir = installedPackOwnerDir({ inspection });
  if (inspection.layout === 'common-stacks' && selectedStacks.length === 0) {
    throw new Error(`Pack ${skillPackPath} requires at least one --stack`);
  }
  const skillSources = collectSkillPackSourcesFromEntries({
    projectDir: baseDir,
    entries: [{
      path: skillPackPath,
      stacks: selectedStacks,
    }],
  });
  const commandSources = collectPackResourceSources({
    projectDir: baseDir,
    entries: [{
      path: skillPackPath,
      stacks: selectedStacks,
    }],
    resourceType: 'commands',
  });
  const reservedNames = [
    ...collectDirectSkillSources(),
    ...collectGeneratedWorkflowSkillSources({ agent: 'codex' }),
    ...skillSources,
  ];
  assertUniqueSkillNames(reservedNames);
  const reservedCommandNames = [
    ...collectDirectCommandSources(),
    ...collectGeneratedWorkflowCommandSources({ agent: 'claude' }),
    ...commandSources,
  ];
  assertUniqueCommandNames(reservedCommandNames);
  const outputs = [];
  const sourceLabel = inspection.sourceKind === 'git' ? 'git pack' : 'local pack';

  outputs.push('== pack ==');
  outputs.push(`Installed ${sourceLabel} ${skillPackPath} to user-level skills`);
  if (selectedStacks.length > 0) {
    outputs.push(`Selected stacks: ${selectedStacks.join(', ')}`);
  } else {
    outputs.push('Selected layout: flat skills');
  }

  const projectionLogs = [];
  for (const agent of selectedAgents) {
    executeProjectionPlan({
      agent,
      projectDir: ownerProjectDir,
      version: getPackageVersion(),
      log: (msg) => projectionLogs.push(msg),
      plan: buildProjectionPlan({
        agent,
        projectDir: ownerProjectDir,
        explicitSources: {
          skills: skillSources,
          commands: commandSources,
        },
        manageExisting: true,
        cleanStaleProjections: false,
      }),
    });
  }
  if (projectionLogs.length > 0) {
    outputs.push('');
    outputs.push('== native projection ==');
    outputs.push(projectionLogs.join('\n'));
  }

  return outputs.filter(Boolean).join('\n');
};

export const installSkillPackProject = (options) => installPackProject(options);

export const parseCliArgs = (argv) => {
  const args = [...argv];
  const parsed = {
    command: args.shift() || 'help',
    agents: [],
    stacks: [],
    positional: [],
    projectDir: process.cwd(),
    strict: false,
  };

  while (args.length > 0) {
    const token = args.shift();

    if (token === '--agent') {
      const agent = args.shift();
      if (agent) parsed.agents.push(agent);
      continue;
    }

    if (token === '--agents') {
      const value = args.shift();
      if (value) parsed.agents.push(...value.split(','));
      continue;
    }

    if (token === '--project-dir') {
      parsed.projectDir = path.resolve(args.shift() || parsed.projectDir);
      continue;
    }

    if (token === '--stack') {
      const stack = args.shift();
      if (stack) parsed.stacks.push(stack);
      continue;
    }

    if (token === '--stacks') {
      const value = args.shift();
      if (value) parsed.stacks.push(...value.split(','));
      continue;
    }

    if (token === '--strict') {
      parsed.strict = true;
      continue;
    }

    if (token === '--openspec') {
      throw new Error(`\`--openspec\` has been removed. \`bootstrap\` always includes OpenSpec. Use \`${PRAXIS_CLI_COMMAND} bootstrap --agent <name>\` or \`${PRAXIS_CLI_COMMAND} setup --agent <name>\`.`);
    }

    parsed.positional.push(token);
  }

  return parsed;
};

export const renderHelp = () => `praxis-devos <command> [options]

Commands:
  setup          Bootstrap dependencies, initialize framework files
  init           Initialize the framework skeleton in the current project
  update         Refresh agent adapters and managed blocks
  install-pack   Install a local path or git URL pack into user-level supported assets
  status         Show current project initialization and dependency state
  doctor         Check required openspec/superpowers dependencies
  bootstrap      Print or apply dependency bootstrap steps for each agent
  help           Show this help

Options:
  --agent <name>         Sync one agent adapter (repeatable)
  --agents a,b,c         Sync multiple agent adapters
  --stack <name>         Select one stack when installing a pack (repeatable)
  --stacks a,b,c         Select multiple stacks when installing a pack
  --project-dir <path>   Project directory (defaults to cwd)
  --strict               Fail doctor if required dependencies are missing

Supported agents:
  ${SUPPORTED_AGENTS.join(', ')}
`;

export const runCli = (argv) => {
  const parsed = parseCliArgs(argv);
  const agents = parsed.agents.length > 0 ? parsed.agents : SUPPORTED_AGENTS;

  if (parsed.command === 'help' || parsed.command === '--help' || parsed.command === '-h') {
    return renderHelp();
  }

  if (parsed.command === 'status') {
    return statusProject({
      projectDir: parsed.projectDir,
      agents,
    });
  }

  if (parsed.command === 'doctor') {
    return doctorProject({
      projectDir: parsed.projectDir,
      agents,
      strict: parsed.strict,
    });
  }

  if (parsed.command === 'bootstrap') {
    const outputs = [];
    outputs.push(bootstrapOpenSpec({
      projectDir: parsed.projectDir,
    }));
    outputs.push(bootstrapProject({
      projectDir: parsed.projectDir,
      agents,
    }));

    return outputs.join('\n\n');
  }

  if (parsed.command === 'setup') {
    return setupProject({
      projectDir: parsed.projectDir,
      agents,
      strict: parsed.strict,
    });
  }

  if (parsed.command === 'init') {
    return initProject({
      projectDir: parsed.projectDir,
      agents,
    });
  }

  if (parsed.command === 'install-pack' || parsed.command === 'install-skill-pack') {
    return installPackProject({
      skillPackPath: parsed.positional[0],
      projectDir: parsed.projectDir,
      stacks: parsed.stacks,
      agents,
    });
  }

  if (parsed.command === 'update' || parsed.command === 'sync') {
    const outputParts = [];
    outputParts.push(ensureBundledOpenSpecSchemaInstalled());
    outputParts.push(ensureOpenSpecUserConfig());
    outputParts.push(syncProject({
      projectDir: parsed.projectDir,
      agents,
    }));

    const projectionLogs = [];
    projectNativeSkills({
      projectDir: parsed.projectDir,
      agents,
      log: (msg) => projectionLogs.push(msg),
    });
    if (projectionLogs.length > 0) {
      outputParts.push(projectionLogs.join('\n'));
    }

    return outputParts.filter(Boolean).join('\n');
  }

  throw new Error(`Unknown command: ${parsed.command}`);
};
