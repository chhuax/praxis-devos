import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { injectMarker } from '../src/projection/markers.js';
import { collectBundledSkillSources } from '../src/projection/index.js';
import { composeProjectedSkill } from '../src/projection/skill-sources.js';

import {
  PRAXIS_ROOT,
  bootstrapOpenSpec,
  bootstrapProject,
  doctorProject,
  initProject,
  parseCliArgs,
  populateOpenSpecConfig,
  projectNativeSkills,
  renderHelp,
  runCli,
  setupProject,
  statusProject,
  syncProject,
} from '../src/core/praxis-devos.js';
const makeTempProject = () => fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-test-'));

const withEnv = (name, value, fn) => {
  const previous = process.env[name];
  if (value == null) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }

  try {
    return fn();
  } finally {
    if (previous == null) {
      delete process.env[name];
    } else {
      process.env[name] = previous;
    }
  }
};

const withPrependedPath = (binDir, fn) => withEnv(
  'PATH',
  `${binDir}${path.delimiter}${process.env.PATH || ''}`,
  fn,
);

const openSpecDataHomeForTest = (homeDir) => (
  process.platform === 'win32'
    ? path.join(homeDir, 'AppData', 'Local')
    : path.join(homeDir, '.local', 'share')
);

const openSpecSchemaDirForTest = (homeDir) => path.join(
  openSpecDataHomeForTest(homeDir),
  'openspec',
  'schemas',
  'spec-super',
);

const withIsolatedOpenSpecEnv = (homeDir, fn) => withEnv(
  'HOME',
  homeDir,
  () => withEnv(
    'XDG_DATA_HOME',
    path.join(homeDir, '.local', 'share'),
    () => withEnv(
      'LOCALAPPDATA',
      path.join(homeDir, 'AppData', 'Local'),
      fn,
    ),
  ),
);

const normalizeEol = (value) => value.replace(/\r\n/g, '\n');
const normalizeSlashes = (value) => value.replace(/\\/g, '/');

const GENERATED_OPEN_SPEC_WORKFLOWS = [
  {
    projectedName: 'openspec-explore',
    sourceSkillDirName: 'openspec-explore',
    claudeCommandRelativePath: path.join('opsx', 'explore.md'),
    opencodeCommandFileName: 'opsx-explore.md',
    githubPromptFileName: 'opsx-explore.prompt.md',
  },
  {
    projectedName: 'openspec-propose',
    sourceSkillDirName: 'openspec-propose',
    claudeCommandRelativePath: path.join('opsx', 'propose.md'),
    opencodeCommandFileName: 'opsx-propose.md',
    githubPromptFileName: 'opsx-propose.prompt.md',
  },
  {
    projectedName: 'openspec-apply-change',
    sourceSkillDirName: 'openspec-apply-change',
    claudeCommandRelativePath: path.join('opsx', 'apply.md'),
    opencodeCommandFileName: 'opsx-apply.md',
    githubPromptFileName: 'opsx-apply.prompt.md',
  },
  {
    projectedName: 'openspec-archive-change',
    sourceSkillDirName: 'openspec-archive-change',
    claudeCommandRelativePath: path.join('opsx', 'archive.md'),
    opencodeCommandFileName: 'opsx-archive.md',
    githubPromptFileName: 'opsx-archive.prompt.md',
  },
  {
    projectedName: 'openspec-new-change',
    sourceSkillDirName: 'openspec-new-change',
    claudeCommandRelativePath: path.join('opsx', 'new.md'),
    opencodeCommandFileName: 'opsx-new.md',
    githubPromptFileName: 'opsx-new.prompt.md',
  },
  {
    projectedName: 'openspec-continue-change',
    sourceSkillDirName: 'openspec-continue-change',
    claudeCommandRelativePath: path.join('opsx', 'continue.md'),
    opencodeCommandFileName: 'opsx-continue.md',
    githubPromptFileName: 'opsx-continue.prompt.md',
  },
  {
    projectedName: 'openspec-ff-change',
    sourceSkillDirName: 'openspec-ff-change',
    claudeCommandRelativePath: path.join('opsx', 'ff.md'),
    opencodeCommandFileName: 'opsx-ff.md',
    githubPromptFileName: 'opsx-ff.prompt.md',
  },
];

const withPlatform = (platform, fn) => {
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true,
  });

  try {
    return fn();
  } finally {
    Object.defineProperty(process, 'platform', descriptor);
  }
};

const installFakeOpenSpec = (projectDir, label = 'GLOBAL') => {
  const binDir = path.join(projectDir, 'node_modules', '.bin');
  const globalBinDir = path.join(projectDir, '.fake-global-bin');
  const actualHostPlatform = os.platform();
  const isWindowsHost = actualHostPlatform === 'win32';
  const scriptName = isWindowsHost ? 'openspec.cmd' : 'openspec';
  const scriptPath = path.join(binDir, scriptName);
  const globalScriptPath = path.join(globalBinDir, scriptName);
  const shimPath = path.join(binDir, 'openspec-shim.cjs');
  const globalShimPath = path.join(globalBinDir, 'openspec-shim.cjs');
  const nodeExecPath = JSON.stringify(process.execPath);
  const generatedWorkflowsJson = JSON.stringify(GENERATED_OPEN_SPEC_WORKFLOWS);
  const scriptBody = isWindowsHost ? `@echo off
${nodeExecPath} "%~dp0\\openspec-shim.cjs" %*
` : `#!/bin/sh
set -eu
exec ${process.execPath} "$(dirname "$0")/openspec-shim.cjs" "$@"
`;
const shimBody = `const fs = require('node:fs');
const path = require('node:path');
const workflows = ${generatedWorkflowsJson};
const configPath = path.join(process.cwd(), '.fake-openspec-config', 'config.json');
const toolSetups = {
  codex: {
    skillsRoot: ['.codex', 'skills'],
  },
  claude: {
    skillsRoot: ['.claude', 'skills'],
    commandsRoot: ['.claude', 'commands'],
    commandRelativeKey: 'claudeCommandRelativePath',
  },
  opencode: {
    skillsRoot: ['.opencode', 'skills'],
    commandsRoot: ['.opencode', 'commands'],
    commandRelativeKey: 'opencodeCommandFileName',
  },
  'github-copilot': {
    skillsRoot: ['.github', 'skills'],
    commandsRoot: ['.github', 'prompts'],
    commandRelativeKey: 'githubPromptFileName',
  },
};
const readDelivery = () => {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return typeof config.delivery === 'string' ? config.delivery : 'both';
  } catch {
    return 'both';
  }
};
const writeDelivery = (delivery) => {
  const current = (() => {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      return {};
    }
  })();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify({ ...current, delivery }, null, 2) + '\\n', 'utf8');
};
const writeSkill = (target, workflow, tool) => {
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, 'SKILL.md'), [
    '---',
    'name: ' + workflow.sourceSkillDirName,
    'description: generated by fake openspec',
    '---',
    '',
    'Generated workflow skill for ' + tool + ': ' + workflow.projectedName,
    '',
  ].join('\\n'));
};
const writeCommand = (target, workflow, tool, relativeKey) => {
  const relativePath = workflow[relativeKey];
  if (!relativePath) {
    return;
  }

  const targetPath = path.join(target, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, '# generated ' + tool + ' command for ' + workflow.projectedName + '\\n', 'utf8');
};
const args = process.argv.slice(2);
if (args[0] === 'config' && args[1] === 'set' && args[2] === 'delivery' && args[3]) {
  writeDelivery(args[3]);
  process.exit(0);
}
if (args[0] === 'init' && args[1]) {
  const target = args[1];
  fs.mkdirSync(path.join(target, 'openspec', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(target, 'openspec', 'changes', 'archive'), { recursive: true });
  fs.writeFileSync(path.join(target, 'openspec', 'config.yaml'), '# context:\\n');
  const toolsFlagIndex = args.indexOf('--tools');
  const selectedTools = toolsFlagIndex >= 0 && args[toolsFlagIndex + 1]
    ? args[toolsFlagIndex + 1].split(',').map((entry) => entry.trim()).filter(Boolean)
    : [];
  const delivery = readDelivery();
  if (!selectedTools.includes('none')) {
    for (const tool of selectedTools) {
      const setup = toolSetups[tool];
      if (!setup) {
        continue;
      }

      const skillsRoot = path.join(target, ...setup.skillsRoot);
      for (const workflow of workflows) {
        writeSkill(path.join(skillsRoot, workflow.sourceSkillDirName), workflow, tool);
      }

      if (setup.commandsRoot && delivery !== 'skills') {
        const commandsRoot = path.join(target, ...setup.commandsRoot);
        for (const workflow of workflows) {
          writeCommand(commandsRoot, workflow, tool, setup.commandRelativeKey);
        }
      }
    }
  }
  process.exit(0);
}
process.stdout.write(${JSON.stringify(`${label}:`)} + args.join(' ') + '\\n');
`;
  fs.mkdirSync(binDir, { recursive: true });
  fs.mkdirSync(globalBinDir, { recursive: true });
  fs.writeFileSync(scriptPath, scriptBody, { mode: 0o755 });
  fs.writeFileSync(globalScriptPath, scriptBody, { mode: 0o755 });
  fs.writeFileSync(shimPath, shimBody, 'utf8');
  fs.writeFileSync(globalShimPath, shimBody, 'utf8');
  fs.chmodSync(scriptPath, 0o755);
  fs.chmodSync(globalScriptPath, 0o755);
  return {
    localScriptPath: scriptPath,
    globalBinDir,
    globalScriptPath,
  };
};

const ensureOpenSpecWorkspace = (projectDir) => {
  fs.mkdirSync(path.join(projectDir, 'openspec', 'changes'), { recursive: true });
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const listBackupFiles = (dirPath, fileName) => fs.readdirSync(dirPath)
  .filter((entry) => entry.startsWith(`${fileName}.bak-`))
  .sort();

const listTempFiles = (dirPath, fileName) => fs.readdirSync(dirPath)
  .filter((entry) => entry.startsWith(`${fileName}.tmp-`))
  .sort();

const OPENSPEC_WORKFLOW_EXPECTATIONS = [
  {
    projectedName: 'openspec-explore',
    overlayFileName: 'opsx-explore.overlay.md',
    mustInclude: [/owner_flow: openspec-explore/, /在执行 `openspec list --json` 后/, /能力触发说明/],
  },
  {
    projectedName: 'openspec-propose',
    overlayFileName: 'opsx-propose.overlay.md',
    mustInclude: [/owner_flow: openspec-propose/, /`Docs Impact`/, /Context Loading/, /能力触发说明/],
  },
  {
    projectedName: 'openspec-apply-change',
    overlayFileName: 'opsx-apply.overlay.md',
    mustInclude: [/owner_flow: openspec-apply-change/, /writing-plans/, /verification-before-completion/],
  },
  {
    projectedName: 'openspec-archive-change',
    overlayFileName: 'opsx-archive.overlay.md',
    mustInclude: [/owner_flow: openspec-archive-change/, /verification-before-completion/],
  },
];

const writeProjectLocalGeneratedWorkflowAssets = ({ projectDir, agent }) => {
  const byAgent = {
    codex: {
      skillsRoot: path.join(projectDir, '.codex', 'skills'),
    },
    claude: {
      skillsRoot: path.join(projectDir, '.claude', 'skills'),
      commandsRoot: path.join(projectDir, '.claude', 'commands'),
      commandRelativeKey: 'claudeCommandRelativePath',
    },
    opencode: {
      skillsRoot: path.join(projectDir, '.opencode', 'skills'),
      commandsRoot: path.join(projectDir, '.opencode', 'commands'),
      commandRelativeKey: 'opencodeCommandFileName',
    },
    copilot: {
      skillsRoot: path.join(projectDir, '.github', 'skills'),
      commandsRoot: path.join(projectDir, '.github', 'prompts'),
      commandRelativeKey: 'githubPromptFileName',
    },
  };

  const setup = byAgent[agent];
  if (!setup) {
    throw new Error(`Unsupported generated workflow fixture agent: ${agent}`);
  }

  for (const workflow of GENERATED_OPEN_SPEC_WORKFLOWS) {
    const skillDir = path.join(setup.skillsRoot, workflow.sourceSkillDirName);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), [
      '---',
      `name: ${workflow.sourceSkillDirName}`,
      'description: generated fixture',
      '---',
      '',
      `Generated workflow skill for ${agent}: ${workflow.projectedName}`,
      '',
    ].join('\n'));

    if (setup.commandsRoot) {
      const relativePath = workflow[setup.commandRelativeKey];
      const targetPath = path.join(setup.commandsRoot, relativePath);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, `# generated ${agent} command for ${workflow.projectedName}\n`, 'utf8');
    }
  }
};

const installFakeClaude = (homeDir) => {
  const binDir = path.join(homeDir, 'fake-claude-bin');
  const actualHostPlatform = os.platform();
  const isWindowsHost = actualHostPlatform === 'win32';
  const scriptPath = path.join(binDir, isWindowsHost ? 'claude.cmd' : 'claude');
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(
    scriptPath,
    isWindowsHost ? `@echo off
setlocal
if "%~1"=="plugin" if "%~2"=="install" if "%~3"=="superpowers@claude-plugins-official" if "%~4"=="--scope" if "%~5"=="user" (
  mkdir "%HOME%\\.claude" 2>nul
  > "%HOME%\\.claude\\settings.json" (
    echo {
    echo   "enabledPlugins": [
    echo     "superpowers@claude-plugins-official"
    echo   ]
    echo }
  )
  echo installed
  exit /b 0
)
echo unsupported claude invocation: %* 1>&2
exit /b 1
` : `#!/bin/sh
set -eu
if [ "$1" = "plugin" ] && [ "$2" = "install" ] && [ "$3" = "superpowers@claude-plugins-official" ] && [ "$4" = "--scope" ] && [ "$5" = "user" ]; then
  mkdir -p "$HOME/.claude"
  cat > "$HOME/.claude/settings.json" <<'EOF'
{
  "enabledPlugins": [
    "superpowers@claude-plugins-official"
  ]
}
EOF
  printf 'installed\\n'
  exit 0
fi
echo "unsupported claude invocation: $*" >&2
exit 1
`,
    { mode: 0o755 },
  );
  fs.chmodSync(scriptPath, 0o755);
  return binDir;
};

const installFakeWindowsBatchRuntime = ({
  homeDir,
  projectDir,
  includeBrokenOpenSpecCandidate = false,
  includeExtensionlessOpenSpecCandidate = false,
}) => {
  const isWindowsHost = os.platform() === 'win32';
  const harnessDir = path.join(homeDir, 'fake-win-tools');
  const commandDir = path.join(homeDir, 'Program Files', 'nodejs');
  const npmPath = path.join(commandDir, 'npm.cmd');
  const claudePath = path.join(commandDir, 'claude.cmd');
  const globalOpenSpecNoExtPath = path.join(commandDir, 'openspec');
  const globalOpenSpecPath = path.join(commandDir, 'openspec.cmd');
  const comSpecPath = isWindowsHost ? (process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe') : path.join(harnessDir, 'cmd.exe');
  const wherePath = path.join(harnessDir, isWindowsHost ? 'where.cmd' : 'where');
  const openspecPath = path.join(projectDir, 'node_modules', '.bin', 'openspec.cmd');

  fs.mkdirSync(harnessDir, { recursive: true });
  fs.mkdirSync(commandDir, { recursive: true });

  const brokenOpenSpecPath = path.join(homeDir, 'npm', 'prefix', 'openspec');

  fs.writeFileSync(
    wherePath,
    isWindowsHost ? `@echo off
setlocal
if /I "%~1"=="npm" goto npm
if /I "%~1"=="npm.cmd" goto npm
if /I "%~1"=="claude" goto claude
if /I "%~1"=="claude.cmd" goto claude
if /I "%~1"=="openspec" goto openspec
if /I "%~1"=="openspec.cmd" goto openspec
exit /b 1

:npm
echo "${npmPath}"
exit /b 0

:claude
echo "${claudePath}"
exit /b 0

:openspec
${includeBrokenOpenSpecCandidate ? `echo "${brokenOpenSpecPath}"` : ''}
${includeExtensionlessOpenSpecCandidate ? `echo "${globalOpenSpecNoExtPath}"` : ''}
if exist "${globalOpenSpecPath}" (
  echo "${globalOpenSpecPath}"
  exit /b 0
)
if exist "${openspecPath}" (
  echo "${openspecPath}"
  exit /b 0
)
exit /b 1
` : `#!/bin/sh
set -eu
case "$1" in
  npm|npm.cmd)
    printf '\'"%s"\'\\n' "${npmPath}"
    ;;
  claude|claude.cmd)
    printf '\'"%s"\'\\n' "${claudePath}"
    ;;
  openspec|openspec.cmd)
    ${includeBrokenOpenSpecCandidate ? `printf '\'"%s"\'\\n' "${brokenOpenSpecPath}"` : ''}
    ${includeExtensionlessOpenSpecCandidate ? `printf '\'"%s"\'\\n' "${globalOpenSpecNoExtPath}"` : ''}
    if [ -f "${globalOpenSpecPath}" ]; then
      printf '\'"%s"\'\\n' "${globalOpenSpecPath}"
    elif [ -f "${openspecPath}" ]; then
      printf '\'"%s"\'\\n' "${openspecPath}"
    else
      exit 1
    fi
    ;;
  *)
    exit 1
    ;;
esac
`,
    { mode: 0o755 },
  );

  if (!isWindowsHost) {
    fs.writeFileSync(
      comSpecPath,
      `#!/bin/sh
set -eu
while [ "$#" -gt 0 ]; do
  if [ "$1" = "/c" ] || [ "$1" = "-c" ]; then
    shift
    break
  fi
  shift
done
command="$1"
first_char=$(printf '%.1s' "$command")
last_char=$(printf '%s' "$command" | sed 's/.*\\(.\\)$/\\1/')
if [ "$first_char" = '"' ] && [ "$last_char" = '"' ]; then
  command=$(printf '%s' "$command" | sed 's/^"//; s/"$//')
fi
/bin/sh -c "$command"
`,
      { mode: 0o755 },
    );
  }

  fs.writeFileSync(
    npmPath,
    isWindowsHost ? `@echo off
setlocal
if "%~1"=="install" if "%~2"=="-g" if "%~3"=="@fission-ai/openspec" (
  mkdir "${commandDir}" 2>nul
  > "${globalOpenSpecPath}" (
    echo @echo off
    echo setlocal
    echo if "%%~1"=="init" ^(
    echo   set "target=%%~2"
    echo   mkdir "%%target%%\\openspec\\specs" 2^>nul
    echo   mkdir "%%target%%\\openspec\\changes\\archive" 2^>nul
    echo   type nul ^> "%%target%%\\openspec\\config.yaml"
    echo   ^>^> "%%target%%\\openspec\\config.yaml" echo # context:
    echo   exit /b 0
    echo ^)
    echo echo LOCAL:%%*
  )
  > "${globalOpenSpecNoExtPath}" (
    echo @echo off
    echo "${globalOpenSpecPath}" %%*
  )
  exit /b 0
)
echo unsupported npm invocation: %* 1>&2
exit /b 1
` : `#!/bin/sh
set -eu
if [ "$1" = "install" ] && [ "$2" = "-g" ] && [ "$3" = "@fission-ai/openspec" ]; then
  bin_dir="${commandDir}"
  mkdir -p "$bin_dir"
  cat > "${globalOpenSpecPath}" <<'EOF'
#!/bin/sh
set -eu
cmd="\${1:-}"
if [ "$cmd" = "init" ]; then
  target="$2"
  mkdir -p "$target/openspec/specs" "$target/openspec/changes/archive"
  cat > "$target/openspec/config.yaml" <<'EOF_CONFIG'
# context:
EOF_CONFIG
  exit 0
fi
printf 'LOCAL:%s\\n' "$*"
EOF
  cat > "${globalOpenSpecNoExtPath}" <<'EOF_NO_EXT'
#!/bin/sh
set -eu
exec "${0}.cmd" "$@"
EOF_NO_EXT
  chmod +x "${globalOpenSpecNoExtPath}"
  chmod +x "${globalOpenSpecPath}"
  exit 0
fi
echo "unsupported npm invocation: $*" >&2
exit 1
`,
    { mode: 0o755 },
  );

  fs.writeFileSync(
    claudePath,
    isWindowsHost ? `@echo off
setlocal
if "%~1"=="plugin" if "%~2"=="install" if "%~3"=="superpowers@claude-plugins-official" if "%~4"=="--scope" if "%~5"=="user" (
  mkdir "%HOME%\\.claude" 2>nul
  > "%HOME%\\.claude\\settings.json" (
    echo {
    echo   "enabledPlugins": [
    echo     "superpowers@claude-plugins-official"
    echo   ]
    echo }
  )
  echo installed
  exit /b 0
)
echo unsupported claude invocation: %* 1>&2
exit /b 1
` : `#!/bin/sh
set -eu
if [ "$1" = "plugin" ] && [ "$2" = "install" ] && [ "$3" = "superpowers@claude-plugins-official" ] && [ "$4" = "--scope" ] && [ "$5" = "user" ]; then
  mkdir -p "$HOME/.claude"
  cat > "$HOME/.claude/settings.json" <<'EOF'
{
  "enabledPlugins": [
    "superpowers@claude-plugins-official"
  ]
}
EOF
  printf 'installed\\n'
  exit 0
fi
echo "unsupported claude invocation: $*" >&2
exit 1
`,
    { mode: 0o755 },
  );

  fs.chmodSync(wherePath, 0o755);
  if (!isWindowsHost) {
    fs.chmodSync(comSpecPath, 0o755);
  }
  fs.chmodSync(npmPath, 0o755);
  fs.chmodSync(claudePath, 0o755);

  return {
    harnessDir,
    commandDir,
    comSpecPath,
  };
};

test('renderHelp reflects the current CLI surface', () => {
  const help = renderHelp();

  assert.match(help, /setup/);
  assert.match(help, /^\s*init\s+/m);
  assert.match(help, /^\s*update\s+/m);
  assert.doesNotMatch(help, /^\s*sync\s+/m);
  assert.match(help, /^\s*status\s+/m);
  assert.match(help, /^\s*doctor\s+/m);
  assert.match(help, /^\s*bootstrap\s+/m);
  assert.doesNotMatch(help, /^\s*migrate\s+/m);
  assert.doesNotMatch(help, /^\s*docs\s+/m);
});

test('parseCliArgs parses current flags and rejects removed --openspec', () => {
  const parsed = parseCliArgs([
    'instrumentation',
    'enable',
    '--agents',
    'codex,claude',
    '--agent',
    'opencode',
    '--agent',
    'copilot',
    '--project-dir',
    'tmp/project',
    '--strict',
  ]);

  assert.equal(parsed.command, 'instrumentation');
  assert.deepEqual(parsed.agents, ['codex', 'claude', 'opencode', 'copilot']);
  assert.equal(parsed.projectDir, path.resolve('tmp/project'));
  assert.deepEqual(parsed.positional, ['enable']);
  assert.equal(parsed.strict, true);

  assert.throws(
    () => parseCliArgs(['bootstrap', '--openspec']),
    /`--openspec` has been removed/,
  );
});

test('core helpers are split into focused runtime and project modules', async () => {
  const commands = await import('../src/core/runtime/commands.js');
  const dependencies = await import('../src/core/runtime/dependencies.js');
  const agentDependencies = await import('../src/core/runtime/agent-dependencies.js');
  const openspecRuntime = await import('../src/core/runtime/openspec.js');
  const adapters = await import('../src/core/project/adapters.js');
  const state = await import('../src/core/project/state.js');

  assert.equal(typeof commands.commandExists, 'function');
  assert.equal(typeof commands.runFile, 'function');
  assert.equal(typeof dependencies.ensureRuntimeDependencies, 'function');
  assert.equal(typeof dependencies.doctorProject, 'function');
  assert.equal(typeof agentDependencies.detectSuperpowersForAgent, 'function');
  assert.equal(typeof agentDependencies.bootstrapProject, 'function');
  assert.equal(typeof openspecRuntime.ensureOpenSpecRuntime, 'function');
  assert.equal(typeof openspecRuntime.bootstrapOpenSpec, 'function');
  assert.equal(typeof adapters.syncProject, 'function');
  assert.equal(typeof adapters.initProject, 'function');
  assert.equal(typeof state.projectPaths, 'function');
  assert.equal(typeof state.uniqueAgents, 'function');
});

test('package metadata does not expose a Praxis OpenCode plugin entrypoint', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(PRAXIS_ROOT, 'package.json'), 'utf8'));

  const pointsToOpenCodePlugin = (value) => {
    if (typeof value === 'string') {
      return /(^|\/)opencode-plugin\.js$/.test(value);
    }
    if (Array.isArray(value)) {
      return value.some(pointsToOpenCodePlugin);
    }
    if (value && typeof value === 'object') {
      return Object.values(value).some(pointsToOpenCodePlugin);
    }
    return false;
  };

  assert.equal(pointsToOpenCodePlugin(pkg.main), false);
  assert.equal(pointsToOpenCodePlugin(pkg.exports), false);
  assert.equal(pkg.files.includes('opencode-plugin.js'), false);
  assert.equal(fs.existsSync(path.join(PRAXIS_ROOT, 'opencode-plugin.js')), false);
});

test('syncProject refreshes adapters and preserves user-owned content', () => {
  const projectDir = makeTempProject();
  const agentsPath = path.join(projectDir, 'AGENTS.md');
  const claudePath = path.join(projectDir, 'CLAUDE.md');
  fs.writeFileSync(agentsPath, '# Project Notes\n\nKeep this section.\n', 'utf8');

  const output = syncProject({
    projectDir,
    agents: ['codex', 'claude', 'opencode', 'copilot'],
  });

  const agentsMd = fs.readFileSync(agentsPath, 'utf8');
  const claudeMd = fs.readFileSync(claudePath, 'utf8');
  assert.match(output, /Synced adapters: codex, claude, opencode, copilot/);
  assert.match(agentsMd, /PRAXIS_DEVOS_START/);
  assert.match(agentsMd, /Keep this section\./);
  assert.match(agentsMd, /## Flow Selection/);
  assert.match(agentsMd, /### 使用 review flow/);
  assert.match(agentsMd, /OpenSpec \+ SuperPowers Contract/);
  assert.doesNotMatch(agentsMd, /\/opsx:/);
  assert.doesNotMatch(agentsMd, /opsx-propose|opsx-apply|opsx-explore|opsx-archive/);
  assert.match(claudeMd, /PRAXIS_DEVOS_START/);
  assert.match(claudeMd, /^<!-- PRAXIS_DEVOS_START -->\n@AGENTS\.md/m);
  assert.ok(fs.existsSync(path.join(projectDir, '.opencode', 'README.md')));
  assert.equal(fs.existsSync(path.join(projectDir, 'docs', 'codemaps', 'project-overview.md')), false);
  assert.equal(fs.existsSync(path.join(projectDir, 'docs', 'surfaces.yaml')), false);
});

test('projectNativeSkills writes user-level docs commands and registers managed assets', () => {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-native-assets-home-'));
  const logs = [];

  withEnv('HOME', fakeHome, () => {
    projectNativeSkills({
      projectDir: makeTempProject(),
      agents: ['claude', 'opencode', 'codex', 'copilot'],
      log: (msg) => logs.push(msg),
    });
  });

  const claudeInitPath = path.join(fakeHome, '.claude', 'commands', 'devos-docs-init.md');
  const claudeRefreshPath = path.join(fakeHome, '.claude', 'commands', 'devos-docs-refresh.md');
  const opencodeInitPath = path.join(fakeHome, '.config', 'opencode', 'commands', 'devos-docs-init.md');
  const opencodeRefreshPath = path.join(fakeHome, '.config', 'opencode', 'commands', 'devos-docs-refresh.md');
  const manifestPath = path.join(fakeHome, '.praxis-devos', 'managed-assets.json');

  assert.ok(fs.existsSync(claudeInitPath));
  assert.ok(fs.existsSync(claudeRefreshPath));
  assert.ok(fs.existsSync(opencodeInitPath));
  assert.ok(fs.existsSync(opencodeRefreshPath));
  assert.ok(fs.existsSync(manifestPath));

  const claudeInit = fs.readFileSync(claudeInitPath, 'utf8');
  const opencodeRefresh = fs.readFileSync(opencodeRefreshPath, 'utf8');
  assert.match(claudeInit, /^# devos-docs-init/m);
  assert.match(opencodeRefresh, /^# devos-docs-refresh/m);

  const manifest = readJson(manifestPath);
  assert.equal(manifest.version, 1);
  assert.equal(manifest.assets[claudeInitPath]?.type, 'command');
  assert.equal(manifest.assets[claudeRefreshPath]?.type, 'command');
  assert.equal(manifest.assets[opencodeInitPath]?.type, 'command');
  assert.equal(manifest.assets[opencodeRefreshPath]?.type, 'command');
  assert.ok(manifest.assets[claudeInitPath]?.agents?.includes('copilot'));
  assert.equal(manifest.assets[path.join(fakeHome, '.claude', 'skills', 'devos-docs', 'SKILL.md')]?.type, 'skill');
  assert.ok(manifest.assets[path.join(fakeHome, '.claude', 'skills', 'devos-docs', 'SKILL.md')]?.agents?.includes('copilot'));
  assert.match(
    normalizeSlashes(manifest.assets[path.join(fakeHome, '.claude', 'skills', 'devos-docs', 'SKILL.md')]?.sourceDir || ''),
    /assets\/skills\/devos-docs$/,
  );

  assert.match(logs.join('\n'), /Claude: projected docs command devos-docs-init/);
  assert.match(logs.join('\n'), /GitHub Copilot: projected docs command devos-docs-init/);
  assert.match(logs.join('\n'), /OpenCode: projected docs command devos-docs-refresh/);
});

test('projectNativeSkills allows a second project to adopt existing Praxis-managed user-level commands', () => {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-shared-managed-home-'));
  const firstProjectDir = makeTempProject();
  const secondProjectDir = makeTempProject();
  const logs = [];

  withEnv('HOME', fakeHome, () => {
    projectNativeSkills({
      projectDir: firstProjectDir,
      agents: ['claude'],
      log: () => {},
    });

    const commandPath = path.join(fakeHome, '.claude', 'commands', 'devos-docs-init.md');
    fs.writeFileSync(commandPath, '# stale from first project\n', 'utf8');

    projectNativeSkills({
      projectDir: secondProjectDir,
      agents: ['claude'],
      log: (msg) => logs.push(msg),
    });

    const refreshed = fs.readFileSync(commandPath, 'utf8');
    const manifest = readJson(path.join(fakeHome, '.praxis-devos', 'managed-assets.json'));
    const owners = manifest.assets[commandPath]?.owners || [];

    assert.match(refreshed, /^# devos-docs-init/m);
    assert.ok(owners.some((entry) => entry.startsWith(`${path.resolve(firstProjectDir)}::claude`)));
    assert.ok(owners.some((entry) => entry.startsWith(`${path.resolve(secondProjectDir)}::claude`)));
  });

  assert.doesNotMatch(logs.join('\n'), /skipped docs command devos-docs-init/i);
  assert.match(logs.join('\n'), /Claude: projected docs command devos-docs-init/);
});

test('runCli update refreshes managed user-level docs commands and skips user-owned same-name commands', () => {
  const projectDir = makeTempProject();
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-sync-home-'));
  const managedClaudeInitPath = path.join(fakeHome, '.claude', 'commands', 'devos-docs-init.md');
  const userOwnedClaudeRefreshPath = path.join(fakeHome, '.claude', 'commands', 'devos-docs-refresh.md');
  const openSpecConfigPath = path.join(fakeHome, '.config', 'openspec', 'config.json');
  const installedSchemaPath = path.join(openSpecSchemaDirForTest(fakeHome), 'schema.yaml');

  withIsolatedOpenSpecEnv(fakeHome, () => {
    projectNativeSkills({
      projectDir,
      agents: ['claude'],
      log: () => {},
    });

    fs.writeFileSync(managedClaudeInitPath, '# stale managed command\n', 'utf8');
    fs.writeFileSync(userOwnedClaudeRefreshPath, '# user custom refresh command\n', 'utf8');

    const manifestPath = path.join(fakeHome, '.praxis-devos', 'managed-assets.json');
    const manifest = readJson(manifestPath);
    delete manifest.assets[userOwnedClaudeRefreshPath];
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    const output = runCli([
      'update',
      '--project-dir',
      projectDir,
      '--agent',
      'claude',
    ]);

    assert.match(output, /Installed bundled OpenSpec schema spec-super|Refreshed bundled OpenSpec schema spec-super/);
    assert.match(output, /Configured OpenSpec user profile in|OpenSpec user profile already configured in/);
    assert.match(output, /Claude: projected docs command devos-docs-init/);
    assert.match(output, /skipped docs command devos-docs-refresh/i);
    assert.match(fs.readFileSync(managedClaudeInitPath, 'utf8'), /^# devos-docs-init/m);
    assert.equal(fs.readFileSync(userOwnedClaudeRefreshPath, 'utf8'), '# user custom refresh command\n');
    assert.ok(fs.existsSync(installedSchemaPath));
    assert.equal(readJson(openSpecConfigPath).profile, 'custom');
  });
});

test('runCli keeps sync as a compatibility alias for update', () => {
  const projectDir = makeTempProject();
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-update-alias-home-'));

  withEnv('HOME', fakeHome, () => {
    const output = runCli([
      'sync',
      '--project-dir',
      projectDir,
      '--agent',
      'codex',
    ]);

    assert.match(output, /Synced adapters: codex/);
  });
});

test('syncProject refreshes adapters without generating docs artifacts', () => {
  const projectDir = makeTempProject();

  syncProject({
    projectDir,
    agents: ['codex'],
  });

  const codemapPath = path.join(projectDir, 'docs', 'codemaps', 'project-overview.md');
  const output = syncProject({
    projectDir,
    agents: ['codex'],
  });

  assert.match(output, /Synced adapters: codex/);
  assert.equal(fs.existsSync(codemapPath), false);
});

test('injectMarker preserves YAML frontmatter at the top of projected skills', () => {
  const content = [
    '---',
    'name: openspec-propose',
    'description: generated test upstream skill',
    '---',
    '',
    'Upstream body',
    '',
  ].join('\n');

  const projected = normalizeEol(injectMarker(content, '<!-- PRAXIS_PROJECTION source=test version=0.4.1 -->'));

  assert.match(projected, /^---\n[\s\S]*?\n---\n<!-- PRAXIS_PROJECTION /);
});

test('injectMarker preserves YAML frontmatter for CRLF skill content', () => {
  const content = [
    '---',
    'name: openspec-propose',
    'description: generated test upstream skill',
    '---',
    '',
    'Upstream body',
    '',
  ].join('\n').replace(/\r?\n/g, '\r\n');

  const projected = normalizeEol(injectMarker(content, '<!-- PRAXIS_PROJECTION source=test version=0.4.1 -->'));

  assert.match(projected, /^---\n[\s\S]*?\n---\n<!-- PRAXIS_PROJECTION /);
});

test('OpenSpec workflow overlays remain in Praxis overlay assets and config keeps docs policy', () => {
  const archiveOverlay = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'overlays', 'openspec', 'skills', 'opsx-archive.overlay.md'),
    'utf8',
  );
  const applyOverlay = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'overlays', 'openspec', 'skills', 'opsx-apply.overlay.md'),
    'utf8',
  );
  const exploreOverlay = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'overlays', 'openspec', 'skills', 'opsx-explore.overlay.md'),
    'utf8',
  );
  const proposeOverlay = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'overlays', 'openspec', 'skills', 'opsx-propose.overlay.md'),
    'utf8',
  );
  const archiveOverlayCurrent = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'overlays', 'openspec', 'skills', 'opsx-archive.overlay.md'),
    'utf8',
  );
  const currentOpenSpecConfig = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'openspec', 'config.yaml'),
    'utf8',
  );

  assert.match(archiveOverlay, /^<!-- PRAXIS_DEVOS_OVERLAY_START -->$/m);
  assert.match(applyOverlay, /^<!-- PRAXIS_DEVOS_OVERLAY_START -->$/m);
  assert.match(applyOverlay, /writing-plans/);
  assert.match(proposeOverlay, /artifact language policy/);
  assert.match(proposeOverlay, /Context Loading/);
  assert.match(proposeOverlay, /Docs Impact/);
  assert.match(applyOverlay, /systematic-debugging/);
  assert.match(applyOverlay, /subagent-driven-development/);
  assert.match(archiveOverlayCurrent, /devos-docs-refresh/);
  assert.match(archiveOverlayCurrent, /docs\/codemaps/);
  assert.match(exploreOverlay, /^<!-- PRAXIS_DEVOS_OVERLAY_START -->$/m);
  assert.match(normalizeEol(currentOpenSpecConfig), /^praxis_devos:\n  docs_tasks:\n    change_blackbox: true\n    change_api: auto\n    project_api_sync: auto\n/m);
});

test('company OpenSpec schema bundle keeps blackbox-test as a formal artifact', () => {
  const schemaPath = path.join(
    PRAXIS_ROOT,
    'assets',
    'openspec',
    'schemas',
    'spec-super',
    'schema.yaml',
  );
  const manifestPath = path.join(
    PRAXIS_ROOT,
    'assets',
    'openspec',
    'schemas',
    'spec-super',
    'manifest.json',
  );
  const blackboxTemplatePath = path.join(
    PRAXIS_ROOT,
    'assets',
    'openspec',
    'schemas',
    'spec-super',
    'templates',
    'blackbox-test.md',
  );
  assert.ok(fs.existsSync(schemaPath));
  assert.ok(fs.existsSync(manifestPath));
  assert.ok(fs.existsSync(blackboxTemplatePath));

  const schema = normalizeEol(fs.readFileSync(schemaPath, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const blackboxTemplate = fs.readFileSync(blackboxTemplatePath, 'utf8');

  assert.match(schema, /^name: spec-super$/m);
  assert.match(schema, /^description: Company OpenSpec workflow - proposal -> specs -> design -> blackbox-test -> tasks$/m);
  assert.match(schema, /\n  - id: blackbox-test\n[\s\S]*?generates: blackbox-test\.md/);
  assert.match(schema, /\n  - id: blackbox-test\n[\s\S]*?requires:\n      - specs\n      - design/);
  assert.match(schema, /\n  - id: tasks\n[\s\S]*?requires:\n      - specs\n      - design/);
  assert.doesNotMatch(schema, /\n  - id: tasks\n[\s\S]*?requires:\n[\s\S]*?blackbox-test/);

  assert.equal(manifest.schemaName, 'spec-super');
  assert.equal(manifest.baselineSchemaPath, 'openspec/schemas/spec-super/schema.yaml');
  assert.ok(typeof manifest.version === 'string' && manifest.version.length > 0);

  assert.match(blackboxTemplate, /^# 黑盒测试说明$/m);
  assert.match(blackboxTemplate, /^## 测试目标$/m);
  assert.match(blackboxTemplate, /^## 测试范围$/m);
  assert.match(blackboxTemplate, /^## 前置条件$/m);
  assert.match(blackboxTemplate, /^## 操作约束$/m);
  assert.match(blackboxTemplate, /^## 核心场景$/m);
  assert.match(blackboxTemplate, /^## 通过标准$/m);
  assert.match(blackboxTemplate, /^## 回归重点$/m);
  assert.match(blackboxTemplate, /^## 自动化验证对应$/m);
  assert.match(blackboxTemplate, /^## 测试环境待补充项$/m);
});

test('composeProjectedSkill merges the default OpenSpec 4-flow with Praxis overlays', () => {
  for (const {
    projectedName,
    overlayFileName,
    mustInclude,
  } of OPENSPEC_WORKFLOW_EXPECTATIONS) {
    const upstreamContent = [
      '---',
      `name: ${projectedName}`,
      'description: generated test upstream skill',
      'metadata:',
      '  generatedBy: "1.3.0"',
      '---',
      '',
      `Generated workflow skill for test: ${projectedName}`,
      '',
      '---',
      '',
      'Upstream instructions body',
      '',
    ].join('\n');
    const overlayPath = path.join(
      PRAXIS_ROOT,
      'assets',
      'overlays',
      'openspec',
      'skills',
      overlayFileName,
    );

    const projected = normalizeEol(composeProjectedSkill({
      projectedName,
      upstreamContent,
      overlayPath,
    }));

    assert.match(projected, new RegExp(`^---\\nname: ${projectedName}\\n`, 'm'));
    assert.match(projected, /generatedBy: "1\.3\.0"/);
    assert.match(projected, /^<!-- PRAXIS_DEVOS_OVERLAY_START -->$/m);

    for (const pattern of mustInclude) {
      assert.match(projected, pattern);
    }
  }
});

test('composeProjectedSkill rewrites OpenSpec frontmatter names for CRLF upstream content', () => {
  const upstreamContent = [
    '---',
    'name: openspec-explore',
    'description: generated test upstream skill',
    'metadata:',
    '  generatedBy: "1.3.0"',
    '---',
    '',
    'Generated workflow skill for test: openspec-explore',
    '',
    '---',
    '',
    'Upstream instructions body',
    '',
  ].join('\n').replace(/\r?\n/g, '\r\n');
  const overlayPath = path.join(
    PRAXIS_ROOT,
    'assets',
    'overlays',
    'openspec',
    'skills',
    'opsx-explore.overlay.md',
  );

  const projected = normalizeEol(composeProjectedSkill({
    projectedName: 'openspec-explore',
    upstreamContent,
    overlayPath,
  }));

  assert.match(projected, /^---\nname: openspec-explore\n/m);
  assert.match(projected, /^<!-- PRAXIS_DEVOS_OVERLAY_START -->$/m);
});

test('composeProjectedSkill places overlays immediately after frontmatter for skills without body separators', () => {
  const upstreamContent = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'openspec', 'workflows', 'openspec-apply-change', 'SKILL.md'),
    'utf8',
  );
  const overlayPath = path.join(
    PRAXIS_ROOT,
    'assets',
    'overlays',
    'openspec',
    'skills',
    'opsx-apply.overlay.md',
  );

  const projected = normalizeEol(composeProjectedSkill({
    projectedName: 'openspec-apply-change',
    upstreamContent,
    overlayPath,
  }));

  assert.match(projected, /^---\n[\s\S]*?\n---\n<!-- PRAXIS_DEVOS_OVERLAY_START -->/);
  assert.match(
    projected,
    /^---\n[\s\S]*?\n---\n<!-- PRAXIS_DEVOS_OVERLAY_START -->[\s\S]*?\nImplement tasks from an OpenSpec change\.\n/m,
  );
});

test('devos-docs bundled skill declares supported modes', () => {
  const docsSkill = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'skills', 'devos-docs', 'SKILL.md'),
    'utf8',
  );

  assert.match(normalizeEol(docsSkill), /^---\nname: devos-docs\n/m);
  assert.match(docsSkill, /mode=init/);
  assert.match(docsSkill, /mode=refresh/);
});

test('devos-docs skill contains language policy contract', () => {
  const docsSkill = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'skills', 'devos-docs', 'SKILL.md'),
    'utf8',
  );

  assert.match(docsSkill, /artifact_language/);
  assert.match(docsSkill, /^## Language Policy$/m);
  assert.match(docsSkill, /zh-CN/);
  assert.match(docsSkill, /`artifact_language`.*defaults to `en`/);
});

test('devos-docs commands include language detection and artifact_language', () => {
  const initCmd = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'commands', 'devos-docs-init.md'),
    'utf8',
  );
  const refreshCmd = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'commands', 'devos-docs-refresh.md'),
    'utf8',
  );

  for (const cmd of [initCmd, refreshCmd]) {
    assert.match(cmd, /docs\/surfaces\.yaml/);
    assert.match(cmd, /artifact_language/);
    assert.match(cmd, /AGENTS\.md.*README\.md|README\.md.*AGENTS\.md/);
  }
});

test('devos-docs skill contains large project batching strategy', () => {
  const docsSkill = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'skills', 'devos-docs', 'SKILL.md'),
    'utf8',
  );

  assert.match(docsSkill, /^## Large Project Strategy$/m);
  assert.match(docsSkill, /more than 5 modules/);
  assert.match(docsSkill, /default to batched mode/);
  assert.match(docsSkill, /at most 3 modules per batch/);
  assert.match(docsSkill, /context-window budget/);
  assert.match(docsSkill, /isolated sub-agent context/);
  assert.match(docsSkill, /^### Batching Order$/m);
  assert.match(docsSkill, /^### Batching Goals$/m);
  assert.match(docsSkill, /^### Batch Failure Handling$/m);
  assert.match(docsSkill, /^### State Transfer Between Batches$/m);
});

test('devos-change-docs bundled skill declares supported modes', () => {
  const docsSkill = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'skills', 'devos-change-docs', 'SKILL.md'),
    'utf8',
  );

  assert.match(normalizeEol(docsSkill), /^---\nname: devos-change-docs\n/m);
  assert.match(docsSkill, /mode=change-blackbox/);
  assert.match(docsSkill, /mode=change-api/);
  assert.match(docsSkill, /mode=project-api-sync/);
});

test('collectBundledSkillSources discovers unified skill bundles by sourceDir', () => {
  const skillSources = collectBundledSkillSources();
  const docs = skillSources.find((entry) => entry.name === 'devos-docs');
  const changeDocs = skillSources.find((entry) => entry.name === 'devos-change-docs');

  assert.ok(docs);
  assert.ok(changeDocs);
  assert.match(normalizeSlashes(docs.sourceDir), /assets\/skills\/devos-docs$/);
  assert.match(normalizeSlashes(changeDocs.sourceDir), /assets\/skills\/devos-change-docs$/);
  assert.deepEqual(skillSources.map((entry) => entry.name).sort(), ['devos-change-docs', 'devos-docs']);
  assert.equal(skillSources.some((entry) => entry.name === 'opsx-verify'), false);
  assert.equal(skillSources.some((entry) => entry.name === 'opsx-sync'), false);
});

test('populateOpenSpecConfig does not rewrite docs task policy into openspec/config.yaml', () => {
  const projectDir = makeTempProject();
  const configPath = path.join(projectDir, 'openspec', 'config.yaml');
  const logs = [];

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, 'schema: spec-driven\n\n# context:\n', 'utf8');

  populateOpenSpecConfig({
    projectDir,
    log: (msg) => logs.push(msg),
  });

  const updated = fs.readFileSync(configPath, 'utf8');
  assert.equal(updated, 'schema: spec-super\n\n# context:\n');
  assert.doesNotMatch(updated, /praxis_devos:/);
  assert.match(logs.join('\n'), /Updated openspec\/config\.yaml to bind schema spec-super/);
});

test('projectNativeSkills does not project removed apply sidecar files', () => {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-bundle-home-'));

  withEnv('HOME', fakeHome, () => {
    projectNativeSkills({
      projectDir: makeTempProject(),
      agents: ['codex'],
      log: () => {},
    });
  });

  assert.equal(
    fs.existsSync(path.join(fakeHome, '.codex', 'skills', 'openspec-apply-change', 'task-local-planning.md')),
    false,
  );
});

test('projectNativeSkills projects host commands from the shared command asset root', () => {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-command-source-home-'));
  const sharedInit = fs.readFileSync(path.join(PRAXIS_ROOT, 'assets', 'commands', 'devos-docs-init.md'), 'utf8');
  const sharedRefresh = fs.readFileSync(path.join(PRAXIS_ROOT, 'assets', 'commands', 'devos-docs-refresh.md'), 'utf8');

  withEnv('HOME', fakeHome, () => {
    projectNativeSkills({
      projectDir: makeTempProject(),
      agents: ['claude', 'opencode', 'copilot'],
      log: () => {},
    });
  });

  assert.equal(
    fs.readFileSync(path.join(fakeHome, '.claude', 'commands', 'devos-docs-init.md'), 'utf8'),
    sharedInit,
  );
  assert.equal(
    fs.readFileSync(path.join(fakeHome, '.config', 'opencode', 'commands', 'devos-docs-refresh.md'), 'utf8'),
    sharedRefresh,
  );
});

test('projectNativeSkills projects canonical OpenSpec workflow skills alongside direct skills', () => {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-projection-home-'));
  const logs = [];

  withEnv('HOME', fakeHome, () => {
    projectNativeSkills({
      projectDir: makeTempProject(),
      agents: ['codex', 'claude', 'opencode', 'copilot'],
      log: (msg) => logs.push(msg),
    });

    const projectedCodexDocsSkill = normalizeEol(fs.readFileSync(
      path.join(fakeHome, '.codex', 'skills', 'devos-docs', 'SKILL.md'),
      'utf8',
    ));
    const projectedClaudeDocsSkill = normalizeEol(fs.readFileSync(
      path.join(fakeHome, '.claude', 'skills', 'devos-docs', 'SKILL.md'),
      'utf8',
    ));
    const projectedCodexWorkflowSkill = normalizeEol(fs.readFileSync(
      path.join(fakeHome, '.codex', 'skills', 'openspec-propose', 'SKILL.md'),
      'utf8',
    ));
    const projectedClaudeWorkflowSkill = normalizeEol(fs.readFileSync(
      path.join(fakeHome, '.claude', 'skills', 'openspec-propose', 'SKILL.md'),
      'utf8',
    ));
    assert.match(projectedCodexDocsSkill, /^---\n[\s\S]*?\n---\n<!-- PRAXIS_PROJECTION /);
    assert.match(projectedClaudeDocsSkill, /^---\n[\s\S]*?\n---\n<!-- PRAXIS_PROJECTION /);
    assert.match(projectedCodexWorkflowSkill, /^---\nname: openspec-propose\n/m);
    assert.match(projectedCodexWorkflowSkill, /owner_flow: openspec-propose/);
    assert.match(projectedClaudeWorkflowSkill, /^---\nname: openspec-propose\n/m);
    assert.match(projectedClaudeWorkflowSkill, /owner_flow: openspec-propose/);
    assert.ok(fs.existsSync(path.join(fakeHome, '.codex', 'skills', 'openspec-apply-change', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(fakeHome, '.claude', 'skills', 'openspec-apply-change', 'SKILL.md')));
    assert.equal(fs.existsSync(path.join(fakeHome, '.codex', 'commands')), false);
  });

  assert.match(logs.join('\n'), /Codex: projected devos-docs/);
  assert.match(logs.join('\n'), /Codex: projected OpenSpec workflow skill openspec-propose/);
  assert.match(logs.join('\n'), /Claude: projected devos-docs/);
  assert.match(logs.join('\n'), /Claude: projected OpenSpec workflow skill openspec-propose/);
  assert.match(logs.join('\n'), /GitHub Copilot: projected devos-docs/);
  assert.match(logs.join('\n'), /OpenCode: projected devos-docs/);
});

test('projectNativeSkills does not overwrite user-authored direct skills without Praxis projection markers', () => {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-safe-projection-home-'));
  const customSkillPath = path.join(fakeHome, '.codex', 'skills', 'devos-docs', 'SKILL.md');
  fs.mkdirSync(path.dirname(customSkillPath), { recursive: true });
  fs.writeFileSync(customSkillPath, '# user custom docs\n', 'utf8');
  const logs = [];

  withEnv('HOME', fakeHome, () => {
    projectNativeSkills({
      projectDir: makeTempProject(),
      agents: ['codex'],
      log: (msg) => logs.push(msg),
    });
  });

  assert.equal(fs.readFileSync(customSkillPath, 'utf8'), '# user custom docs\n');
  assert.match(logs.join('\n'), /skipped devos-docs because .* is not a Praxis projection/);
});

test('projectNativeSkills projects canonical Claude workflow skills and commands into user-level surfaces', () => {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-claude-adopt-home-'));
  const projectDir = makeTempProject();
  const logs = [];

  withEnv('HOME', fakeHome, () => {
    projectNativeSkills({
      projectDir,
      agents: ['claude'],
      log: (msg) => logs.push(msg),
    });
  });

  const adoptedSkillPath = path.join(fakeHome, '.claude', 'skills', 'openspec-propose', 'SKILL.md');
  const adoptedCommandPath = path.join(fakeHome, '.claude', 'commands', 'opsx', 'propose.md');
  const adoptedApplyCommandPath = path.join(fakeHome, '.claude', 'commands', 'opsx', 'apply.md');

  assert.ok(fs.existsSync(adoptedSkillPath));
  assert.ok(fs.existsSync(adoptedCommandPath));
  assert.ok(fs.existsSync(adoptedApplyCommandPath));
  assert.match(fs.readFileSync(adoptedSkillPath, 'utf8'), /^---\nname: openspec-propose\n/m);
  assert.match(fs.readFileSync(adoptedSkillPath, 'utf8'), /owner_flow: openspec-propose/);
  assert.match(fs.readFileSync(adoptedSkillPath, 'utf8'), /create the change and generate all artifacts in one step/i);
  assert.match(fs.readFileSync(adoptedCommandPath, 'utf8'), /^# \/opsx:propose\n/m);
  assert.match(fs.readFileSync(adoptedCommandPath, 'utf8'), /open or advance a proposal in one pass/i);
  assert.match(fs.readFileSync(adoptedCommandPath, 'utf8'), /^<!-- PRAXIS_DEVOS_OVERLAY_START -->$/m);
  assert.match(fs.readFileSync(adoptedCommandPath, 'utf8'), /owner_flow: openspec-propose/);
  assert.match(fs.readFileSync(adoptedApplyCommandPath, 'utf8'), /writing-plans/);
  assert.equal(fs.existsSync(path.join(projectDir, '.claude', 'skills', 'openspec-propose', 'SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(projectDir, '.claude', 'commands', 'opsx', 'propose.md')), false);
  assert.match(logs.join('\n'), /projected OpenSpec workflow skill openspec-propose/i);
  assert.match(logs.join('\n'), /projected OpenSpec workflow command openspec-propose/i);
});

test('projectNativeSkills preserves canonical OpenSpec workflow assets across repeated runs', () => {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-claude-repeat-home-'));
  const projectDir = makeTempProject();
  const firstLogs = [];
  const secondLogs = [];

  withEnv('HOME', fakeHome, () => {
    projectNativeSkills({
      projectDir,
      agents: ['claude'],
      log: (msg) => firstLogs.push(msg),
    });
    projectNativeSkills({
      projectDir,
      agents: ['claude'],
      log: (msg) => secondLogs.push(msg),
    });
  });

  const adoptedSkillPath = path.join(fakeHome, '.claude', 'skills', 'openspec-propose', 'SKILL.md');
  const adoptedCommandPath = path.join(fakeHome, '.claude', 'commands', 'opsx', 'propose.md');

  assert.ok(fs.existsSync(adoptedSkillPath));
  assert.ok(fs.existsSync(adoptedCommandPath));
  assert.equal(fs.existsSync(path.join(projectDir, '.claude', 'skills', 'openspec-propose', 'SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(projectDir, '.claude', 'commands', 'opsx', 'propose.md')), false);
  assert.match(firstLogs.join('\n'), /projected OpenSpec workflow skill openspec-propose/i);
  assert.match(firstLogs.join('\n'), /projected OpenSpec workflow command openspec-propose/i);
  assert.doesNotMatch(secondLogs.join('\n'), /removed stale projection openspec-propose/i);
  assert.doesNotMatch(secondLogs.join('\n'), /removed managed asset .*openspec-propose/i);
});

test('projectNativeSkills projects canonical OpenCode workflow commands into the OpenCode user command surface', () => {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-opencode-adopt-home-'));
  const projectDir = makeTempProject();
  const logs = [];

  withEnv('HOME', fakeHome, () => {
    projectNativeSkills({
      projectDir,
      agents: ['opencode'],
      log: (msg) => logs.push(msg),
    });
  });

  const adoptedSkillPath = path.join(fakeHome, '.claude', 'skills', 'openspec-propose', 'SKILL.md');
  const adoptedCommandPath = path.join(fakeHome, '.config', 'opencode', 'commands', 'opsx-propose.md');
  const adoptedApplyCommandPath = path.join(fakeHome, '.config', 'opencode', 'commands', 'opsx-apply.md');

  assert.ok(fs.existsSync(adoptedSkillPath));
  assert.ok(fs.existsSync(adoptedCommandPath));
  assert.ok(fs.existsSync(adoptedApplyCommandPath));
  assert.match(fs.readFileSync(adoptedSkillPath, 'utf8'), /^---\nname: openspec-propose\n/m);
  assert.match(fs.readFileSync(adoptedSkillPath, 'utf8'), /create the change and generate all artifacts in one step/i);
  assert.match(fs.readFileSync(adoptedCommandPath, 'utf8'), /^# \/opsx:propose\n/m);
  assert.match(fs.readFileSync(adoptedCommandPath, 'utf8'), /open or advance a proposal in one pass/i);
  assert.match(fs.readFileSync(adoptedCommandPath, 'utf8'), /^<!-- PRAXIS_DEVOS_OVERLAY_START -->$/m);
  assert.match(fs.readFileSync(adoptedCommandPath, 'utf8'), /owner_flow: openspec-propose/);
  assert.match(fs.readFileSync(adoptedApplyCommandPath, 'utf8'), /writing-plans/);
  assert.equal(fs.existsSync(path.join(projectDir, '.opencode', 'skills', 'openspec-propose', 'SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(projectDir, '.opencode', 'commands', 'opsx-propose.md')), false);
  assert.match(logs.join('\n'), /projected OpenSpec workflow command openspec-propose/i);
});

test('projectNativeSkills projects canonical GitHub Copilot prompts into the shared Claude-compatible command surface', () => {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-copilot-adopt-home-'));
  const projectDir = makeTempProject();
  const logs = [];

  withEnv('HOME', fakeHome, () => {
    projectNativeSkills({
      projectDir,
      agents: ['copilot'],
      log: (msg) => logs.push(msg),
    });
  });

  const adoptedSkillPath = path.join(fakeHome, '.claude', 'skills', 'openspec-propose', 'SKILL.md');
  const adoptedCommandPath = path.join(fakeHome, '.claude', 'commands', 'opsx-propose.md');

  assert.ok(fs.existsSync(adoptedSkillPath));
  assert.ok(fs.existsSync(adoptedCommandPath));
  assert.match(fs.readFileSync(adoptedSkillPath, 'utf8'), /^---\nname: openspec-propose\n/m);
  assert.match(fs.readFileSync(adoptedSkillPath, 'utf8'), /create the change and generate all artifacts in one step/i);
  assert.match(fs.readFileSync(adoptedCommandPath, 'utf8'), /^# \/opsx:propose\n/m);
  assert.match(fs.readFileSync(adoptedCommandPath, 'utf8'), /open or advance a proposal in one pass/i);
  assert.match(fs.readFileSync(adoptedCommandPath, 'utf8'), /^<!-- PRAXIS_DEVOS_OVERLAY_START -->$/m);
  assert.match(fs.readFileSync(adoptedCommandPath, 'utf8'), /owner_flow: openspec-propose/);
  assert.equal(fs.existsSync(path.join(projectDir, '.github', 'skills', 'openspec-propose', 'SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(projectDir, '.github', 'prompts', 'opsx-propose.prompt.md')), false);
  assert.match(logs.join('\n'), /projected OpenSpec workflow command openspec-propose/i);
});

test('initProject bootstraps openspec workspace through the detected runtime', () => {
  const projectDir = makeTempProject();
  installFakeOpenSpec(projectDir);

  const output = withEnv('PATH', '/usr/bin:/bin', () => initProject({
    projectDir,
    agents: ['codex', 'opencode'],
  }));

  assert.match(output, /openspec init completed \((global|project-local)\)/);
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'specs')));
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'archive')));
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'config.yaml')));
  assert.equal(
    fs.readFileSync(path.join(projectDir, 'openspec', 'config.yaml'), 'utf8'),
    'schema: spec-super\n\n# context:\n',
  );
  assert.ok(fs.existsSync(path.join(projectDir, 'AGENTS.md')));
  assert.ok(fs.existsSync(path.join(projectDir, '.opencode', 'README.md')));
  assert.equal(fs.existsSync(path.join(projectDir, '.codex', 'skills', 'openspec-propose', 'SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(projectDir, '.opencode', 'commands', 'opsx-propose.md')), false);
  assert.equal(fs.existsSync(path.join(projectDir, '.claude', 'skills', 'openspec-propose', 'SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(projectDir, 'docs', 'codemaps', 'project-overview.md')), false);
  assert.equal(fs.existsSync(path.join(projectDir, 'docs', 'surfaces.yaml')), false);
});

test('runCli rejects removed docs command surface', () => {
  assert.throws(
    () => runCli(['docs', 'check']),
    /Unknown command: docs/,
  );
});

test('statusProject reports initialized state for the selected agents', () => {
  const projectDir = makeTempProject();
  const fakeOpenSpec = installFakeOpenSpec(projectDir);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-opencode-ok-'));
  const globalConfigDir = path.join(fakeHome, '.config', 'opencode');
  fs.mkdirSync(globalConfigDir, { recursive: true });
  fs.writeFileSync(
    path.join(globalConfigDir, 'config.json'),
    JSON.stringify({ plugin: ['superpowers@git+https://github.com/obra/superpowers.git'] }, null, 2),
  );
  ensureOpenSpecWorkspace(projectDir);

  withEnv('HOME', fakeHome, () => withPrependedPath(fakeOpenSpec.globalBinDir, () => {
    const output = statusProject({
      projectDir,
      agents: ['opencode'],
    });

    assert.match(output, /initialized: yes/);
    assert.match(output, /openspec: \[(OK|WARN)\]/);
    assert.match(output, /superpowers:opencode: \[OK\]/);
  }));
});

test('bootstrapOpenSpec reports the detected runtime', () => {
  const projectDir = makeTempProject();
  installFakeOpenSpec(projectDir);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-bootstrap-openspec-home-'));

  const output = withIsolatedOpenSpecEnv(fakeHome, () => withEnv('PATH', '/usr/bin:/bin', () => bootstrapOpenSpec({ projectDir })));

  assert.match(output, /OpenSpec already available \((global|project-local)\)/);
  assert.match(output, /Installed bundled OpenSpec schema spec-super|Refreshed bundled OpenSpec schema spec-super/);
  assert.match(output, /Configured OpenSpec user profile in|OpenSpec user profile already configured in/);
  assert.match(output, /OpenSpec CLI directly from the same installation context/);
  assert.match(output, /openspec(?:\.cmd)? list --specs/);
  assert.doesNotMatch(output, /praxis-devos openspec/);
  assert.ok(fs.existsSync(path.join(openSpecSchemaDirForTest(fakeHome), 'schema.yaml')));
  assert.equal(readJson(path.join(fakeHome, '.config', 'openspec', 'config.json')).profile, 'custom');
});

test('setupProject installs bundled company schema and repairs OpenSpec user config', () => {
  const projectDir = makeTempProject();
  const fakeOpenSpec = installFakeOpenSpec(projectDir);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-openspec-home-'));
  const openSpecConfigDir = path.join(fakeHome, '.config', 'openspec');
  const openSpecConfigPath = path.join(openSpecConfigDir, 'config.json');
  const schemaDir = openSpecSchemaDirForTest(fakeHome);

  fs.mkdirSync(openSpecConfigDir, { recursive: true });
  fs.writeFileSync(
    openSpecConfigPath,
    JSON.stringify({
      profile: 'default',
      workflows: ['explore'],
      telemetry: { enabled: false },
    }, null, 2),
    'utf8',
  );

  withIsolatedOpenSpecEnv(fakeHome, () => withPrependedPath(fakeOpenSpec.globalBinDir, () => {
    const output = setupProject({
      projectDir,
      agents: ['opencode'],
    });

    const openSpecConfig = readJson(openSpecConfigPath);
    const backups = listBackupFiles(openSpecConfigDir, 'config.json');

    assert.match(output, /Installed bundled OpenSpec schema spec-super|Refreshed bundled OpenSpec schema spec-super/);
    assert.match(output, /Configured OpenSpec user profile in/);
    assert.ok(fs.existsSync(path.join(schemaDir, 'schema.yaml')));
    assert.ok(fs.existsSync(path.join(schemaDir, 'manifest.json')));
    assert.equal(openSpecConfig.profile, 'custom');
    assert.equal(openSpecConfig.delivery, 'both');
    assert.deepEqual(openSpecConfig.workflows, ['propose', 'explore', 'new', 'continue', 'apply', 'ff', 'archive']);
    assert.deepEqual(openSpecConfig.telemetry, { enabled: false });
    assert.equal(backups.length, 1);
  }));
});

test('bootstrapProject updates OpenCode plugins and preserves existing config', () => {
  const projectDir = makeTempProject();
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-opencode-bootstrap-'));
  const globalConfigDir = path.join(fakeHome, '.config', 'opencode');
  const globalConfigPath = path.join(globalConfigDir, 'config.json');
  fs.mkdirSync(globalConfigDir, { recursive: true });
  fs.writeFileSync(
    globalConfigPath,
    JSON.stringify({
      theme: 'night',
      plugin: ['existing-plugin'],
    }, null, 2),
    'utf8',
  );

  withEnv('HOME', fakeHome, () => {
    const output = bootstrapProject({
      projectDir,
      agents: ['opencode', 'codex', 'claude', 'copilot'],
    });

    const config = readJson(globalConfigPath);
    const backups = listBackupFiles(globalConfigDir, 'config.json');
    assert.match(output, /== opencode ==/);
    assert.match(output, /== codex ==/);
    assert.match(output, /== claude ==/);
    assert.match(output, /== copilot ==/);
    assert.equal(config.theme, 'night');
    assert.ok(config.plugin.includes('existing-plugin'));
    assert.equal(config.plugin.some((entry) => entry.includes('praxis-devos')), false);
    assert.ok(config.plugin.some((entry) => entry.includes('github.com\/obra\/superpowers')));
    assert.equal(backups.length, 1);
  });
});

test('setupProject initializes the current structure for OpenCode without networked side effects', () => {
  const projectDir = makeTempProject();
  const fakeOpenSpec = installFakeOpenSpec(projectDir);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-opencode-setup-'));

  withEnv('HOME', fakeHome, () => withPrependedPath(fakeOpenSpec.globalBinDir, () => {
    const output = setupProject({
      projectDir,
      agents: ['opencode'],
    });

    const globalConfigPath = path.join(fakeHome, '.config', 'opencode', 'config.json');
    const managedAssetsPath = path.join(fakeHome, '.praxis-devos', 'managed-assets.json');
    assert.match(output, /== openspec ==/);
    assert.match(output, /== opencode ==/);
    assert.match(output, /Configured OpenCode plugin config in/);
    assert.match(output, /\[OK\] superpowers:opencode/);
    assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'archive')));
    assert.ok(fs.existsSync(path.join(projectDir, '.opencode', 'README.md')));
    assert.ok(fs.existsSync(globalConfigPath));
    assert.ok(fs.existsSync(path.join(fakeHome, '.config', 'opencode', 'commands', 'devos-docs-init.md')));
    assert.ok(fs.existsSync(path.join(fakeHome, '.config', 'opencode', 'commands', 'devos-docs-refresh.md')));
    assert.ok(readJson(managedAssetsPath).assets[path.join(fakeHome, '.config', 'opencode', 'commands', 'devos-docs-init.md')]);
  }));
});

test('setupProject preserves existing OpenCode plugins and top-level settings', () => {
  const projectDir = makeTempProject();
  const fakeOpenSpec = installFakeOpenSpec(projectDir);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-opencode-preserve-'));
  const globalConfigDir = path.join(fakeHome, '.config', 'opencode');
  const globalConfigPath = path.join(globalConfigDir, 'config.json');
  fs.mkdirSync(globalConfigDir, { recursive: true });
  fs.writeFileSync(
    globalConfigPath,
    JSON.stringify({
      theme: 'night',
      model: 'gpt-5',
      plugin: ['existing-plugin', 'another-plugin'],
    }, null, 2),
    'utf8',
  );

  withEnv('HOME', fakeHome, () => withPrependedPath(fakeOpenSpec.globalBinDir, () => {
    setupProject({
      projectDir,
      agents: ['opencode'],
    });

    const config = readJson(globalConfigPath);
    assert.equal(config.theme, 'night');
    assert.equal(config.model, 'gpt-5');
    assert.ok(config.plugin.includes('existing-plugin'));
    assert.ok(config.plugin.includes('another-plugin'));
    assert.equal(config.plugin.some((entry) => entry.includes('praxis-devos')), false);
    assert.ok(config.plugin.some((entry) => entry.includes('github.com\/obra\/superpowers')));
  }));
});

test('setupProject removes the legacy Praxis OpenCode plugin while preserving other config', () => {
  const projectDir = makeTempProject();
  const fakeOpenSpec = installFakeOpenSpec(projectDir);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-opencode-remove-legacy-'));
  const globalConfigDir = path.join(fakeHome, '.config', 'opencode');
  const globalConfigPath = path.join(globalConfigDir, 'config.json');
  fs.mkdirSync(globalConfigDir, { recursive: true });
  fs.writeFileSync(
    globalConfigPath,
    JSON.stringify({
      theme: 'night',
      plugin: [
        'existing-plugin',
        'praxis-devos@git+https://github.com/chhuax/praxis-devos.git',
        'superpowers@git+https://github.com/obra/superpowers.git',
      ],
    }, null, 2),
    'utf8',
  );

  withEnv('HOME', fakeHome, () => withPrependedPath(fakeOpenSpec.globalBinDir, () => {
    setupProject({
      projectDir,
      agents: ['opencode'],
    });

    const config = readJson(globalConfigPath);
    assert.equal(config.theme, 'night');
    assert.ok(config.plugin.includes('existing-plugin'));
    assert.ok(config.plugin.some((entry) => entry.includes('github.com\/obra\/superpowers')));
    assert.equal(config.plugin.some((entry) => entry.includes('praxis-devos')), false);
  }));
});

test('setupProject creates a backup before rewriting OpenCode config', () => {
  const projectDir = makeTempProject();
  const fakeOpenSpec = installFakeOpenSpec(projectDir);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-opencode-backup-'));
  const globalConfigDir = path.join(fakeHome, '.config', 'opencode');
  const globalConfigPath = path.join(globalConfigDir, 'config.json');
  const original = JSON.stringify({ plugin: ['existing-plugin'] }, null, 2);
  fs.mkdirSync(globalConfigDir, { recursive: true });
  fs.writeFileSync(globalConfigPath, `${original}\n`, 'utf8');

  withEnv('HOME', fakeHome, () => withPrependedPath(fakeOpenSpec.globalBinDir, () => {
    setupProject({
      projectDir,
      agents: ['opencode'],
    });

    const backups = listBackupFiles(globalConfigDir, 'config.json');
    assert.equal(backups.length, 1);
    assert.equal(fs.readFileSync(path.join(globalConfigDir, backups[0]), 'utf8'), `${original}\n`);
  }));
});

test('setupProject does not overwrite unsafe OpenCode config', () => {
  const projectDir = makeTempProject();
  const fakeOpenSpec = installFakeOpenSpec(projectDir);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-opencode-unsafe-'));
  const globalConfigDir = path.join(fakeHome, '.config', 'opencode');
  const globalConfigPath = path.join(globalConfigDir, 'config.json');
  const original = JSON.stringify({ plugin: { existing: true } }, null, 2);
  fs.mkdirSync(globalConfigDir, { recursive: true });
  fs.writeFileSync(globalConfigPath, `${original}\n`, 'utf8');

  withEnv('HOME', fakeHome, () => withPrependedPath(fakeOpenSpec.globalBinDir, () => {
    assert.throws(
      () => setupProject({
        projectDir,
        agents: ['opencode'],
      }),
      /cannot safely merge OpenCode config/i,
    );

    const backups = listBackupFiles(globalConfigDir, 'config.json');
    assert.equal(fs.readFileSync(globalConfigPath, 'utf8'), `${original}\n`);
    assert.equal(backups.length, 1);
    assert.equal(fs.readFileSync(path.join(globalConfigDir, backups[0]), 'utf8'), `${original}\n`);
  }));
});

test('setupProject leaves the live OpenCode config unchanged when atomic replace fails', () => {
  const projectDir = makeTempProject();
  const fakeOpenSpec = installFakeOpenSpec(projectDir);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-opencode-atomic-fail-'));
  const globalConfigDir = path.join(fakeHome, '.config', 'opencode');
  const globalConfigPath = path.join(globalConfigDir, 'config.json');
  const original = JSON.stringify({ plugin: ['existing-plugin'], theme: 'night' }, null, 2);
  fs.mkdirSync(globalConfigDir, { recursive: true });
  fs.writeFileSync(globalConfigPath, `${original}\n`, 'utf8');

  const originalRenameSync = fs.renameSync;
  fs.renameSync = (...args) => {
    if (args[1] === globalConfigPath) {
      throw new Error('rename failed');
    }

    return originalRenameSync(...args);
  };

  try {
    withEnv('HOME', fakeHome, () => withPrependedPath(fakeOpenSpec.globalBinDir, () => {
      assert.throws(
        () => setupProject({
          projectDir,
          agents: ['opencode'],
        }),
        /rename failed/i,
      );
    }));
  } finally {
    fs.renameSync = originalRenameSync;
  }

  const backups = listBackupFiles(globalConfigDir, 'config.json');
  assert.equal(fs.readFileSync(globalConfigPath, 'utf8'), `${original}\n`);
  assert.equal(backups.length, 1);
  assert.equal(fs.readFileSync(path.join(globalConfigDir, backups[0]), 'utf8'), `${original}\n`);
  assert.deepEqual(listTempFiles(globalConfigDir, 'config.json'), []);
});

test('setupProject installs Claude SuperPowers with user scope when Claude CLI is available', () => {

  const projectDir = makeTempProject();
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-claude-home-'));
  const fakeClaudeBin = installFakeClaude(fakeHome);
  const fakeOpenSpec = installFakeOpenSpec(projectDir);

  withEnv('HOME', fakeHome, () => withPrependedPath(fakeClaudeBin, () => withPrependedPath(fakeOpenSpec.globalBinDir, () => {
    const output = setupProject({
      projectDir,
      agents: ['claude'],
    });

    const managedAssetsPath = path.join(fakeHome, '.praxis-devos', 'managed-assets.json');
    assert.match(output, /Installed Claude SuperPowers with Claude Code CLI/);
    assert.match(output, /\[OK\] superpowers:claude/);
    assert.ok(fs.existsSync(path.join(fakeHome, '.claude', 'settings.json')));
    assert.ok(fs.existsSync(path.join(fakeHome, '.claude', 'commands', 'devos-docs-init.md')));
    assert.ok(fs.existsSync(path.join(fakeHome, '.claude', 'commands', 'devos-docs-refresh.md')));
    assert.ok(readJson(managedAssetsPath).assets[path.join(fakeHome, '.claude', 'commands', 'devos-docs-refresh.md')]);
  })));
});

test('setupProject provisions GitHub Copilot through the shared Claude-compatible projection surface', () => {
  const projectDir = makeTempProject();
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-copilot-home-'));
  const fakeOpenSpec = installFakeOpenSpec(projectDir);

  withEnv('HOME', fakeHome, () => withPrependedPath(fakeOpenSpec.globalBinDir, () => {
    const output = setupProject({
      projectDir,
      agents: ['copilot'],
    });

    const managedAssetsPath = path.join(fakeHome, '.praxis-devos', 'managed-assets.json');
    assert.match(output, /== copilot ==/);
    assert.match(output, /no separate runtime dependency to install/i);
    assert.match(output, /\[OK\] superpowers:copilot/);
    assert.ok(fs.existsSync(path.join(projectDir, 'AGENTS.md')));
    assert.equal(fs.existsSync(path.join(projectDir, 'CLAUDE.md')), false);
    assert.ok(fs.existsSync(path.join(fakeHome, '.claude', 'skills', 'openspec-propose', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(fakeHome, '.claude', 'commands', 'devos-docs-init.md')));
    assert.ok(readJson(managedAssetsPath).assets[path.join(fakeHome, '.claude', 'commands', 'devos-docs-init.md')]);
  }));
});

test('setupProject handles quoted Windows command paths with spaces during automatic installs', () => {
  const projectDir = makeTempProject();
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-win32-home-'));
  const { harnessDir, commandDir, comSpecPath } = installFakeWindowsBatchRuntime({ homeDir: fakeHome, projectDir });

  withPlatform('win32', () => withEnv('HOME', fakeHome, () => withEnv('ComSpec', comSpecPath, () => withPrependedPath(commandDir, () => withPrependedPath(harnessDir, () => {
    const output = setupProject({
      projectDir,
      agents: ['claude'],
    });

    assert.match(output, /Installed OpenSpec globally with npm \(user-level command\)/);
    assert.match(output, /Installed Claude SuperPowers with Claude Code CLI/);
    assert.ok(fs.existsSync(path.join(fakeHome, 'Program Files', 'nodejs', 'openspec.cmd')));
    assert.ok(fs.existsSync(path.join(fakeHome, '.claude', 'settings.json')));
  })))));
});

test('setupProject ignores invalid Windows where candidates for openspec', () => {
  const projectDir = makeTempProject();
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-win32-bad-where-home-'));
  const { harnessDir, commandDir, comSpecPath } = installFakeWindowsBatchRuntime({
    homeDir: fakeHome,
    projectDir,
    includeBrokenOpenSpecCandidate: true,
  });

  withPlatform('win32', () => withEnv('HOME', fakeHome, () => withEnv('ComSpec', comSpecPath, () => withPrependedPath(commandDir, () => withPrependedPath(harnessDir, () => {
    const output = setupProject({
      projectDir,
      agents: ['claude'],
    });

    assert.match(output, /Installed OpenSpec globally with npm \(user-level command\)/);
    assert.match(output, /Installed Claude SuperPowers with Claude Code CLI/);
    assert.ok(fs.existsSync(path.join(fakeHome, 'Program Files', 'nodejs', 'openspec.cmd')));
    assert.ok(fs.existsSync(path.join(fakeHome, '.claude', 'settings.json')));
  })))));
});

test('setupProject prefers Windows executable extension over extensionless openspec candidate', () => {
  const projectDir = makeTempProject();
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-win32-ext-priority-home-'));
  const { harnessDir, commandDir, comSpecPath } = installFakeWindowsBatchRuntime({
    homeDir: fakeHome,
    projectDir,
    includeExtensionlessOpenSpecCandidate: true,
  });

  withPlatform('win32', () => withEnv('HOME', fakeHome, () => withEnv('ComSpec', comSpecPath, () => withPrependedPath(commandDir, () => withPrependedPath(harnessDir, () => {
    const output = setupProject({
      projectDir,
      agents: ['opencode'],
    });

    assert.match(output, /OpenSpec CLI is available on PATH via .*openspec\.cmd/);
  })))));
});

test('doctorProject reports current dependency status for OpenCode', () => {
  const projectDir = makeTempProject();
  const fakeOpenSpec = installFakeOpenSpec(projectDir);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-opencode-missing-'));

  withIsolatedOpenSpecEnv(fakeHome, () => withPrependedPath(fakeOpenSpec.globalBinDir, () => {
    const output = doctorProject({
      projectDir,
      agents: ['opencode'],
    });

    assert.match(output, /Dependency doctor:/);
    assert.match(output, /\[OK\] openspec/);
    assert.match(output, /\[MISSING\] superpowers:opencode/);
    assert.match(output, /npx praxis-devos@latest setup --agent opencode/);
  }));
});

test('doctorProject reports missing company schema installation and OpenSpec user config', () => {
  const projectDir = makeTempProject();
  const fakeOpenSpec = installFakeOpenSpec(projectDir);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-openspec-doctor-missing-'));
  const opencodeConfigDir = path.join(fakeHome, '.config', 'opencode');
  const openSpecProjectConfigPath = path.join(projectDir, 'openspec', 'config.yaml');

  fs.mkdirSync(opencodeConfigDir, { recursive: true });
  fs.writeFileSync(
    path.join(opencodeConfigDir, 'config.json'),
    JSON.stringify({ plugin: ['superpowers@git+https://github.com/obra/superpowers.git'] }, null, 2),
    'utf8',
  );
  fs.mkdirSync(path.dirname(openSpecProjectConfigPath), { recursive: true });
  fs.writeFileSync(openSpecProjectConfigPath, 'schema: spec-super\n\n# context:\n', 'utf8');

  withIsolatedOpenSpecEnv(fakeHome, () => withPrependedPath(fakeOpenSpec.globalBinDir, () => {
    const output = doctorProject({
      projectDir,
      agents: ['opencode'],
    });

    assert.match(output, /\[OK\] openspec —/);
    assert.match(output, /\[MISSING\] openspec:company-schema —/);
    assert.match(output, /\[MISSING\] openspec:user-config —/);
    assert.match(output, /\[OK\] openspec:project-schema — Project binds schema spec-super/);
  }));
});

test('doctorProject reports company schema mode as healthy after setup', () => {
  const projectDir = makeTempProject();
  const fakeOpenSpec = installFakeOpenSpec(projectDir);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-openspec-doctor-ok-'));

  withIsolatedOpenSpecEnv(fakeHome, () => withPrependedPath(fakeOpenSpec.globalBinDir, () => {
    setupProject({
      projectDir,
      agents: ['opencode'],
    });

    const output = doctorProject({
      projectDir,
      agents: ['opencode'],
    });

    assert.match(output, /\[OK\] openspec:company-schema — Installed spec-super schema version 0\.1\.0/);
    assert.match(output, /\[OK\] openspec:user-config — OpenSpec user config matches profile custom/);
    assert.match(output, /\[OK\] openspec:project-schema — Project binds schema spec-super/);
  }));
});

test('doctorProject reports conflicting higher-precedence schema overrides', () => {
  const projectDir = makeTempProject();
  const fakeOpenSpec = installFakeOpenSpec(projectDir);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-openspec-precedence-'));

  fs.mkdirSync(path.join(projectDir, 'openspec'), { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'openspec', 'config.yaml'), 'schema: spec-super\n\n# context:\n', 'utf8');
  fs.writeFileSync(path.join(projectDir, '.openspec.yaml'), 'schema: spec-driven\n', 'utf8');

  withEnv('HOME', fakeHome, () => withPrependedPath(fakeOpenSpec.globalBinDir, () => {
    const output = doctorProject({
      projectDir,
      agents: ['copilot'],
    });

    assert.match(output, /\[WARN\] openspec:schema-precedence — Project default schema is spec-super, but higher-precedence overrides are active \(spec-driven via \.openspec\.yaml\)/);
    assert.match(output, /CLI --schema would override these as well/);
  }));
});

test('doctorProject reports missing canonical workflow projections and legacy opsx projections', () => {
  const projectDir = makeTempProject();
  const fakeOpenSpec = installFakeOpenSpec(projectDir);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-openspec-migration-'));
  const legacySkillPath = path.join(fakeHome, '.claude', 'skills', 'opsx-propose', 'SKILL.md');

  fs.mkdirSync(path.dirname(legacySkillPath), { recursive: true });
  fs.writeFileSync(
    legacySkillPath,
    injectMarker('---\nname: opsx-propose\n---\nlegacy projection\n', '<!-- PRAXIS_PROJECTION source=legacy version=0.5.0 -->'),
    'utf8',
  );

  withEnv('HOME', fakeHome, () => withPrependedPath(fakeOpenSpec.globalBinDir, () => {
    const output = doctorProject({
      projectDir,
      agents: ['copilot'],
    });

    assert.match(output, /\[WARN\] projection:copilot — /);
    assert.match(output, /missing official skill projections: .*openspec-propose/);
    assert.match(output, /legacy opsx skill projections still installed: opsx-propose/);
  }));
});

test('doctorProject reports missing Claude plugin when settings do not contain it', () => {
  const projectDir = makeTempProject();
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-claude-missing-'));
  const fakeClaudeBin = installFakeClaude(fakeHome);

  withEnv('HOME', fakeHome, () => withPrependedPath(fakeClaudeBin, () => {
    const output = doctorProject({
      projectDir,
      agents: ['claude'],
    });

    assert.match(output, /\[MISSING\] superpowers:claude/);
    assert.match(output, /claude plugin install superpowers@claude-plugins-official --scope user/);
  }));
});

test('doctorProject reports GitHub Copilot as ready when shared projection surfaces are supported', () => {
  const projectDir = makeTempProject();

  const output = doctorProject({
    projectDir,
    agents: ['copilot'],
  });

  assert.match(output, /\[OK\] superpowers:copilot/);
  assert.match(output, /shared ~\/\.claude skills\/commands discovery surface/i);
});

test('runCli routes help but rejects removed wrapper commands', () => {
  const projectDir = makeTempProject();

  const help = runCli([]);

  assert.match(help, /praxis-devos <command> \[options\]/);
  assert.throws(
    () => runCli(['migrate', '--project-dir', projectDir]),
    /Unknown command: migrate/,
  );
  assert.throws(
    () => runCli(['openspec', '--project-dir', projectDir, 'list', '--specs']),
    /Unknown command: openspec/,
  );
  assert.throws(
    () => runCli(['change', '--project-dir', projectDir, '--title', 'removed']),
    /Unknown command: change/,
  );
  assert.throws(
    () => runCli(['proposal', '--project-dir', projectDir, '--title', 'removed']),
    /Unknown command: proposal/,
  );
});
