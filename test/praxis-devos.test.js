import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  PRAXIS_ROOT,
  analyzeSessionTranscript,
  bootstrapOpenSpec,
  bootstrapProject,
  collectSkillsPaths,
  createChangeScaffold,
  doctorProject,
  initProject,
  migrateProject,
  renderHelp,
  runOpenSpecCommand,
  runCli,
  setupProject,
  statusProject,
  syncProject,
  useFoundationProject,
  useStackProject,
  validateSessionTranscript,
} from '../src/core/praxis-devos.js';

const makeTempProject = () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-test-'));
  fs.mkdirSync(path.join(projectDir, 'openspec', 'changes'), { recursive: true });
  return projectDir;
};

const withTempPath = (binDir, fn) => {
  const previousPath = process.env.PATH;
  process.env.PATH = `${binDir}${path.delimiter}${previousPath || ''}`;
  try {
    return fn();
  } finally {
    process.env.PATH = previousPath;
  }
};

const withPlatform = (platform, fn) => {
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
  Object.defineProperty(process, 'platform', { value: platform });
  try {
    return fn();
  } finally {
    Object.defineProperty(process, 'platform', descriptor);
  }
};

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

const installFakeOpenSpec = (projectDir) => {
  const binDir = path.join(projectDir, 'fake-bin');
  const scriptPath = path.join(binDir, 'openspec');
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(
    scriptPath,
    `#!/bin/sh
set -eu
cmd="$1"
target="$2"
if [ "$cmd" = "init" ]; then
  mkdir -p "$target/openspec/changes" "$target/openspec/archive" "$target/openspec/specs"
  exit 0
fi
echo "unsupported" >&2
exit 1
`,
    { mode: 0o755 },
  );
  fs.chmodSync(scriptPath, 0o755);
  return binDir;
};

const installFakeProjectLocalOpenSpec = (projectDir, label = 'LOCAL') => {
  const binDir = path.join(projectDir, 'node_modules', '.bin');
  const scriptPath = path.join(binDir, 'openspec');
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(
    scriptPath,
    `#!/bin/sh
set -eu
echo "${label}:$*"
`,
    { mode: 0o755 },
  );
  fs.chmodSync(scriptPath, 0o755);
  return scriptPath;
};

const installFakeEcc = (projectDir, location = 'path') => {
  const binDir = location === 'local'
    ? path.join(projectDir, 'node_modules', '.bin')
    : path.join(projectDir, 'fake-ecc-bin');
  const scriptPath = path.join(binDir, 'ecc');
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(
    scriptPath,
    `#!/bin/sh
set -eu
echo "ECC:$*"
`,
    { mode: 0o755 },
  );
  fs.chmodSync(scriptPath, 0o755);
  return binDir;
};

const installFakeProjectLocalOpenSpecTelemetryProbe = (projectDir) => {
  const binDir = path.join(projectDir, 'node_modules', '.bin');
  const scriptPath = path.join(binDir, 'openspec');
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(
    scriptPath,
    `#!/bin/sh
set -eu
cmd="$1"
target="\${2:-}"
if [ "$cmd" = "init" ]; then
  mkdir -p "$target/openspec/changes" "$target/openspec/archive" "$target/openspec/specs"
  printf 'TELEMETRY:%s\nDNT:%s\n' "\${OPENSPEC_TELEMETRY:-unset}" "\${DO_NOT_TRACK:-unset}" > "$target/openspec/.telemetry"
  exit 0
fi
printf 'TELEMETRY:%s\\nDNT:%s\\nARGS:%s\\n' "\${OPENSPEC_TELEMETRY:-unset}" "\${DO_NOT_TRACK:-unset}" "$*"
`,
    { mode: 0o755 },
  );
  fs.chmodSync(scriptPath, 0o755);
  return scriptPath;
};

const installFakeWindowsOpenSpec = (projectDir, location = 'local') => {
  const baseDir = location === 'local'
    ? path.join(projectDir, 'node_modules', '.bin')
    : path.join(projectDir, 'fake-win-bin');
  const scriptPath = path.join(baseDir, 'openspec.cmd');
  fs.mkdirSync(baseDir, { recursive: true });
  fs.writeFileSync(scriptPath, '@echo off\r\n');
  return scriptPath;
};

const installFakeWindowsOpenSpecTelemetryProbe = (projectDir, location = 'local') => {
  const baseDir = location === 'local'
    ? path.join(projectDir, 'node_modules', '.bin')
    : path.join(projectDir, 'fake-win-bin');
  const scriptPath = path.join(baseDir, 'openspec.cmd');
  fs.mkdirSync(baseDir, { recursive: true });
  fs.writeFileSync(
    scriptPath,
    `#!/bin/sh
set -eu
printf 'TELEMETRY:%s\\nDNT:%s\\nARGS:%s\\n' "\${OPENSPEC_TELEMETRY:-unset}" "\${DO_NOT_TRACK:-unset}" "$*"
`,
    { mode: 0o755 },
  );
  fs.chmodSync(scriptPath, 0o755);
  return scriptPath;
};

const installFakeWhereWithMap = (projectDir, mappings) => {
  const binDir = path.join(projectDir, 'fake-where-bin');
  const scriptPath = path.join(binDir, 'where');
  fs.mkdirSync(binDir, { recursive: true });
  const cases = Object.entries(mappings)
    .map(([command, resolvedPath]) => `if [ "$1" = "${command}" ]; then
  printf '%s\\n' "${resolvedPath}"
  exit 0
fi`)
    .join('\n');
  fs.writeFileSync(
    scriptPath,
    `#!/bin/sh
set -eu
${cases}
exit 1
`,
    { mode: 0o755 },
  );
  fs.chmodSync(scriptPath, 0o755);
  return binDir;
};

const installFakeWhere = (projectDir, resolvedPath) => installFakeWhereWithMap(projectDir, {
  openspec: resolvedPath,
});

const installFakeWhich = (projectDir, openspecPath = null) => {
  const binDir = path.join(projectDir, 'fake-which-bin');
  const scriptPath = path.join(binDir, 'which');
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(
    scriptPath,
    `#!/bin/sh
set -eu
if [ "$1" = "openspec" ]; then
  if [ -n "${openspecPath || ''}" ]; then
    printf '%s\\n' "${openspecPath || ''}"
    exit 0
  fi
  exit 1
fi
/usr/bin/which "$@"
`,
    { mode: 0o755 },
  );
  fs.chmodSync(scriptPath, 0o755);
  return binDir;
};

const installFakeCmdShell = (projectDir) => {
  const binDir = path.join(projectDir, 'fake-cmd-bin');
  const scriptPath = path.join(binDir, 'cmd-shim');
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(
    scriptPath,
    `#!/bin/sh
set -eu
printf '%s' "$4"
`,
    { mode: 0o755 },
  );
  fs.chmodSync(scriptPath, 0o755);
  return scriptPath;
};

const installFakeCmdRunner = (projectDir) => {
  const binDir = path.join(projectDir, 'fake-cmd-runner-bin');
  const scriptPath = path.join(binDir, 'cmd-shim');
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(
    scriptPath,
    `#!/bin/sh
set -eu
eval "set -- $4"
"$@"
`,
    { mode: 0o755 },
  );
  fs.chmodSync(scriptPath, 0o755);
  return scriptPath;
};

const installFakeWindowsNpm = (projectDir) => {
  const binDir = path.join(projectDir, 'fake-win-npm-bin');
  const scriptPath = path.join(binDir, 'npm.cmd');
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(
    scriptPath,
    `#!/bin/sh
set -eu
if [ "$1" = "install" ] && [ "$2" = "-D" ] && [ "$3" = "@fission-ai/openspec" ]; then
  mkdir -p "$PWD/node_modules/.bin"
  cat > "$PWD/node_modules/.bin/openspec.cmd" <<'EOF'
#!/bin/sh
set -eu
cmd="$1"
target="$2"
if [ "$cmd" = "init" ]; then
  mkdir -p "$target/openspec/changes" "$target/openspec/archive" "$target/openspec/specs"
  exit 0
fi
echo "LOCAL:$*"
EOF
  chmod +x "$PWD/node_modules/.bin/openspec.cmd"
  exit 0
fi
echo "unsupported npm invocation: $*" >&2
exit 1
`,
    { mode: 0o755 },
  );
  fs.chmodSync(scriptPath, 0o755);
  return scriptPath;
};

const installFakeGit = (projectDir) => {
  const binDir = path.join(projectDir, 'fake-git-bin');
  const scriptPath = path.join(binDir, 'git');
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(
    scriptPath,
    `#!/bin/sh
set -eu
if [ "$1" = "clone" ]; then
  target="$3"
  mkdir -p "$target/skills/example-skill"
  cat > "$target/skills/example-skill/SKILL.md" <<'EOF'
# Example Skill
EOF
  exit 0
fi
echo "unsupported git invocation: $*" >&2
exit 1
`,
    { mode: 0o755 },
  );
  fs.chmodSync(scriptPath, 0o755);
  return binDir;
};

const installFakeNpm = (projectDir) => {
  const binDir = path.join(projectDir, 'fake-npm-bin');
  const scriptPath = path.join(binDir, 'npm');
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(
    scriptPath,
    `#!/bin/sh
set -eu
if [ "$1" = "install" ] && [ "$2" = "-D" ] && [ "$3" = "@fission-ai/openspec" ]; then
  mkdir -p "$PWD/node_modules/.bin"
  cat > "$PWD/node_modules/.bin/openspec" <<'EOF'
#!/bin/sh
set -eu
cmd="$1"
target="$2"
if [ "$cmd" = "init" ]; then
  mkdir -p "$target/openspec/changes" "$target/openspec/archive" "$target/openspec/specs"
  exit 0
fi
echo "LOCAL:$*"
EOF
  chmod +x "$PWD/node_modules/.bin/openspec"
  exit 0
fi
echo "unsupported npm invocation: $*" >&2
exit 1
`,
    { mode: 0o755 },
  );
  fs.chmodSync(scriptPath, 0o755);
  return binDir;
};

const readJsonFile = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const findSkillMarkdown = (rootDir) => {
  const pending = [rootDir];
  while (pending.length > 0) {
    const currentDir = pending.pop();
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isFile() && entry.name === 'SKILL.md') {
        return entryPath;
      }
      if (entry.isDirectory()) {
        pending.push(entryPath);
      }
    }
  }
  return null;
};

test('renderHelp exposes change and proposal commands', () => {
  const help = renderHelp();
  assert.match(help, /bind\s+Bind an ECC runtime into the current project and refresh manifest state/);
  assert.match(help, /setup\s+Bootstrap dependencies, initialize framework files, apply the built-in Praxis runtime base/);
  assert.match(help, /change\s+Create an OpenSpec change scaffold for governance-oriented work/);
  assert.match(help, /proposal\s+Compatibility alias of `change`/);
  assert.match(help, /use-foundation\s+Advanced: re-apply internal runtime-base assets/);
  assert.match(help, /use-stack\s+Apply a technology stack after setup or init/);
  assert.match(help, /list-foundations\s+Advanced: list internal runtime-base presets/);
  assert.match(help, /validate-session\s+Validate a transcript against Praxis evidence hooks/);
  assert.match(help, /--ecc-runtime <path>/);
  assert.match(help, /--foundation <name>/);
  assert.doesNotMatch(help, /--openspec/);
});

test('createChangeScaffold creates a full change by default', () => {
  const projectDir = makeTempProject();
  const output = createChangeScaffold({
    projectDir,
    title: 'Add two factor auth',
    capability: 'auth',
  });

  const specPath = path.join(projectDir, 'openspec', 'changes', 'add-two-factor-auth', 'specs', 'auth', 'spec.md');
  const specContent = fs.readFileSync(specPath, 'utf8');

  assert.match(output, /type: auto -> full/);
  const proposalPath = path.join(projectDir, 'openspec', 'changes', 'add-two-factor-auth', 'proposal.md');
  const proposalContent = fs.readFileSync(proposalPath, 'utf8');

  assert.ok(fs.existsSync(proposalPath));
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'add-two-factor-auth', 'tasks.md')));
  assert.ok(fs.existsSync(specPath));
  assert.match(proposalContent, /影响代码：`auth` 对应实现、适配与验证路径/);
  assert.doesNotMatch(proposalContent, /待补充/);
  assert.match(specContent, /MUST 支持/);
  assert.match(specContent, /SHALL/);
  assert.doesNotMatch(specContent, /TODO:/);
});

test('proposal alias creates a lightweight scaffold without tasks', () => {
  const projectDir = makeTempProject();
  const output = runCli([
    'proposal',
    'create',
    '--type',
    'lite',
    '--capability',
    'order-query',
    '--project-dir',
    projectDir,
    'Adjust order query filters',
  ]);

  assert.match(output, /lightweight change scaffold/);
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'adjust-order-query-filters', 'proposal.md')));
  assert.ok(!fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'adjust-order-query-filters', 'tasks.md')));
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'adjust-order-query-filters', 'specs', 'order-query', 'spec.md')));
});

test('list-stacks remains callable through runCli', () => {
  const output = runCli(['list-stacks']);
  assert.match(output, /java-spring/);
  assert.match(output, /starter/);
});

test('list-foundations remains callable through runCli', () => {
  const output = runCli(['list-foundations']);
  assert.match(output, /Available runtime base presets:/);
  assert.match(output, /ecc-foundation/);
  assert.match(output, /ECC-oriented runtime base/);
});

test('doctor strict fails when openspec is missing', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-doctor-'));

  assert.throws(
    () => doctorProject({ projectDir, agents: ['opencode'], strict: true }),
    /Strict dependency check failed/,
  );
});

test('doctor output recommends setup as the primary fix path', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-doctor-output-'));
  const output = doctorProject({ projectDir, agents: ['opencode', 'codex', 'claude'] });

  assert.match(output, /Recommended next step:/);
  assert.match(output, /- npx praxis-devos setup --agents opencode,codex,claude/);
  assert.match(output, /Advanced repair command:/);
  assert.match(output, /- npx praxis-devos bootstrap --agents opencode,codex,claude/);
});

test('runCli rejects unsupported agent names instead of ignoring them', () => {
  assert.throws(
    () => runCli(['status', '--agent', 'cursor']),
    /Unsupported agent: cursor\. Supported agents: opencode, codex, claude/,
  );
});

test('runCli rejects missing values for agent flags before consuming the next option', () => {
  assert.throws(
    () => runCli(['doctor', '--agent', '--strict']),
    /Missing value for --agent/,
  );
});

test('runCli rejects missing values for agent flags before consuming the next short option', () => {
  assert.throws(
    () => runCli(['doctor', '--agent', '-h']),
    /Missing value for --agent/,
  );
});

test('runCli rejects missing values for openspec project-dir flag', () => {
  assert.throws(
    () => runCli(['openspec', '--project-dir']),
    /Missing value for --project-dir/,
  );
});

test('runCli rejects missing values for change scaffold flags', () => {
  assert.throws(
    () => runCli(['change', 'create', '--summary']),
    /Missing value for --summary/,
  );
});

test('runCli rejects unknown long options for core commands', () => {
  assert.throws(
    () => runCli(['doctor', '--strcit']),
    /Unknown option for doctor: --strcit/,
  );
});

test('runCli rejects unknown short options for core commands', () => {
  assert.throws(
    () => runCli(['doctor', '-s']),
    /Unknown option for doctor: -s/,
  );
});

test('runCli rejects known but unsupported options for doctor', () => {
  assert.throws(
    () => runCli(['doctor', '--stack', 'java-spring']),
    /Unsupported option for doctor: --stack/,
  );
});

test('runCli rejects known but unsupported options for status', () => {
  assert.throws(
    () => runCli(['status', '--file', 'session.md']),
    /Unsupported option for status: --file/,
  );
});

test('runCli rejects known but unsupported options for validate-session', () => {
  assert.throws(
    () => runCli(['validate-session', '--project-dir', '.']),
    /Unsupported option for validate-session: --project-dir/,
  );
});

test('runCli rejects known but unsupported options for init', () => {
  assert.throws(
    () => runCli(['init', '--strict']),
    /Unsupported option for init: --strict/,
  );
});

test('runCli rejects unknown long options for change scaffold commands', () => {
  assert.throws(
    () => runCli(['change', 'create', '--summry', 'tighten cli validation']),
    /Unknown option for change: --summry/,
  );
});

test('runCli rejects unknown short options for change scaffold commands', () => {
  assert.throws(
    () => runCli(['change', 'create', '-s']),
    /Unknown option for change: -s/,
  );
});

test('runCli rejects positional args when change scaffold already received --title', () => {
  const projectDir = makeTempProject();

  assert.throws(
    () => runCli(['change', 'create', '--project-dir', projectDir, '--title', 'Tighten CLI validation', 'extra']),
    /Unexpected positional argument for change: extra/,
  );
});

test('runCli rejects positional args when proposal alias already received --title', () => {
  const projectDir = makeTempProject();

  assert.throws(
    () => runCli(['proposal', 'create', '--project-dir', projectDir, '--title', 'Tighten CLI validation', 'extra']),
    /Unexpected positional argument for proposal: extra/,
  );
});

test('doctorProject rejects mixed agent lists with unsupported entries', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-doctor-invalid-agents-'));

  assert.throws(
    () => doctorProject({ projectDir, agents: ['codex', 'cursor', 'amp'] }),
    /Unsupported agents: cursor, amp\. Supported agents: opencode, codex, claude/,
  );
});

test('initProject creates canonical assets and managed adapters', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-init-'));
  const fakeBinDir = installFakeOpenSpec(projectDir);

  withTempPath(fakeBinDir, () => {
    const output = initProject({
      projectDir,
      stackName: 'java-spring',
      agents: ['codex', 'claude'],
    });

    assert.match(output, /Selected stack: java-spring/);
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'manifest.json')));
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'stack.md')));
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'rules.md')));
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'skills', 'java-security', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'skills', 'INDEX.md')));
    assert.ok(fs.existsSync(path.join(projectDir, 'AGENTS.md')));
    assert.ok(fs.existsSync(path.join(projectDir, 'CLAUDE.md')));

    const skillsIndex = fs.readFileSync(path.join(projectDir, '.praxis', 'skills', 'INDEX.md'), 'utf8');
    const agentsMd = fs.readFileSync(path.join(projectDir, 'AGENTS.md'), 'utf8');

    assert.match(skillsIndex, /java-security/);
    assert.match(skillsIndex, /Project Skills Index/);
    assert.match(skillsIndex, /Java \+ Spring Boot 安全编码规范/);
    assert.match(agentsMd, /^<!-- PRAXIS_DEVOS_START -->/);
    assert.match(agentsMd, /项目 Skills/);
    assert.match(agentsMd, /java-security/);
    assert.match(agentsMd, /## AI Dispatch/);
    assert.match(agentsMd, /proposal flow/);
    assert.match(agentsMd, /implementation flow/);
    assert.match(agentsMd, /review flow/);
    assert.match(agentsMd, /当任务需要提案、校验或归档治理时，统一通过 `npx praxis-devos openspec/);
    assert.match(agentsMd, /proposal flow: 先读取 `openspec\/AGENTS\.md`，然后必须加载 `openspec` skill/);
    assert.match(agentsMd, /先做轻量 `Proposal Intake`/);
    assert.match(agentsMd, /`change target`、`intended behavior`、`scope\/risk`、`open questions`/);
    assert.match(agentsMd, /才升级进入 `brainstorming`/);
    assert.match(agentsMd, /implementation flow: 先读取 `\.praxis\/rules\.md`；如果当前工作来自已批准 proposal/);
    assert.match(agentsMd, /日常任务通常走 implementation 或 review；只有明确进入治理流程时才走 proposal/);
    assert.match(agentsMd, /优先把 `\.praxis\/rules\.md`、`\.praxis\/stack\.md`、`\.praxis\/skills\/` 当作日常执行基线/);
    assert.match(agentsMd, /如果项目已应用 built-in runtime base，开始实现前优先检查其中的 `branch-workflow\.md`、`verification\.md`、`operating-agreements\.md`/);
    assert.match(agentsMd, /OpenSpec 主要用于治理 \/ proposal 场景，不是日常实现的默认前门/);
    assert.match(agentsMd, /技术栈 skill 保持按需加载/);
    assert.match(agentsMd, /`openspec`、`git-workflow`、`verification-before-completion` 是硬门禁/);
    assert.match(agentsMd, /`brainstorming`、`writing-plans`、`systematic-debugging`、`subagent-driven-development` 则由/);
    assert.match(agentsMd, /`\.opencode\/skills\/` 仍可作为 OpenCode supplemental layer/);
    assert.match(agentsMd, /Codex：`npx praxis-devos bootstrap --agent codex`/);
    assert.match(agentsMd, /Claude Code：`npx praxis-devos bootstrap --agent claude`/);
    assert.match(agentsMd, /OpenCode：`npx praxis-devos bootstrap --agent opencode`/);
    assert.doesNotMatch(agentsMd, /当前入口按 `codex` 处理/);
    assert.doesNotMatch(agentsMd, /Spring Boot 代码组织/);
  });
});

test('initProject can initialize framework files without applying a stack', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-init-nostack-'));
  const fakeBinDir = installFakeOpenSpec(projectDir);

  withTempPath(fakeBinDir, () => {
    const output = initProject({
      projectDir,
      agents: ['codex'],
    });

    assert.match(output, /No stack selected during init/);
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'manifest.json')));
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'framework-rules.md')));
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'stack.md')));
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'rules.md')));

    const manifest = readJsonFile(path.join(projectDir, '.praxis', 'manifest.json'));
    const stackMd = fs.readFileSync(path.join(projectDir, '.praxis', 'stack.md'), 'utf8');
    const rulesMd = fs.readFileSync(path.join(projectDir, '.praxis', 'rules.md'), 'utf8');

    assert.equal(manifest.selectedStack, null);
    assert.match(stackMd, /No Stack Selected/);
    assert.match(rulesMd, /No Stack Rules Installed/);
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'skills', 'git-workflow', 'SKILL.md')));
  });
});

test('initProject installs OpenSpec when runtime is missing', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-init-install-openspec-'));
  const fakeNpmDir = installFakeNpm(projectDir);
  const fakeWhichDir = installFakeWhich(projectDir, null);

  withTempPath(fakeWhichDir, () => withTempPath(fakeNpmDir, () => {
    const output = initProject({
      projectDir,
      agents: ['codex'],
      applyDefaultFoundation: false,
    });

    assert.match(output, /Installed OpenSpec locally with npm/);
    assert.ok(fs.existsSync(path.join(projectDir, 'node_modules', '.bin', 'openspec')));
    assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes')));
  }));
});

test('initProject disables OpenSpec telemetry for child runtime invocations by default', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-init-telemetry-'));
  installFakeProjectLocalOpenSpecTelemetryProbe(projectDir);

  initProject({
    projectDir,
    agents: ['codex'],
    applyDefaultFoundation: false,
  });

  assert.equal(
    fs.readFileSync(path.join(projectDir, 'openspec', '.telemetry'), 'utf8'),
    'TELEMETRY:0\nDNT:1\n',
  );
});

test('initProject treats blank telemetry env vars as unset defaults', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-init-telemetry-blank-'));
  installFakeProjectLocalOpenSpecTelemetryProbe(projectDir);

  withEnv('OPENSPEC_TELEMETRY', '  ', () => withEnv('DO_NOT_TRACK', '', () => {
    initProject({
      projectDir,
      agents: ['codex'],
      applyDefaultFoundation: false,
    });
  }));

  assert.equal(
    fs.readFileSync(path.join(projectDir, 'openspec', '.telemetry'), 'utf8'),
    'TELEMETRY:0\nDNT:1\n',
  );
});

test('initProject bridges DO_NOT_TRACK telemetry opt-in to OpenSpec telemetry', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-init-telemetry-opt-in-'));
  installFakeProjectLocalOpenSpecTelemetryProbe(projectDir);

  withEnv('DO_NOT_TRACK', '0', () => withEnv('OPENSPEC_TELEMETRY', null, () => {
    initProject({
      projectDir,
      agents: ['codex'],
      applyDefaultFoundation: false,
    });
  }));

  assert.equal(
    fs.readFileSync(path.join(projectDir, 'openspec', '.telemetry'), 'utf8'),
    'TELEMETRY:1\nDNT:0\n',
  );
});

test('initProject canonicalizes telemetry aliases before invoking OpenSpec', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-init-telemetry-alias-'));
  installFakeProjectLocalOpenSpecTelemetryProbe(projectDir);

  withEnv('DO_NOT_TRACK', ' true ', () => withEnv('OPENSPEC_TELEMETRY', null, () => {
    initProject({
      projectDir,
      agents: ['codex'],
      applyDefaultFoundation: false,
    });
  }));

  assert.equal(
    fs.readFileSync(path.join(projectDir, 'openspec', '.telemetry'), 'utf8'),
    'TELEMETRY:0\nDNT:1\n',
  );
});

test('initProject applies the built-in runtime base by default', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-init-foundation-'));
  const fakeBinDir = installFakeOpenSpec(projectDir);

  withTempPath(fakeBinDir, () => {
    const output = initProject({
      projectDir,
      agents: ['codex'],
    });

    const manifest = readJsonFile(path.join(projectDir, '.praxis', 'manifest.json'));
    const foundationManifest = readJsonFile(path.join(projectDir, '.praxis', 'foundation', 'manifest.json'));
    const foundationReadme = fs.readFileSync(path.join(projectDir, '.praxis', 'foundation', 'README.md'), 'utf8');
    const branchWorkflow = fs.readFileSync(path.join(projectDir, '.praxis', 'foundation', 'profile', 'branch-workflow.md'), 'utf8');
    const verification = fs.readFileSync(path.join(projectDir, '.praxis', 'foundation', 'profile', 'verification.md'), 'utf8');
    const operatingAgreements = fs.readFileSync(path.join(projectDir, '.praxis', 'foundation', 'profile', 'operating-agreements.md'), 'utf8');

    assert.match(output, /Applying built-in Praxis runtime base/);
    assert.match(output, /ECC runtime binding not detected yet/);
    assert.match(output, /Bind ECC with `npx praxis-devos bind --ecc-runtime \/path\/to\/ecc-runtime`/);
    assert.match(output, /Verify with `npx praxis-devos status`/);
    assert.equal(manifest.selectedFoundation, 'ecc-foundation');
    assert.equal(manifest.foundationProfile, 'internal-base');
    assert.deepEqual(manifest.foundationOverlays, ['ecc-runtime-base', 'internal-extension-points']);
    assert.equal(manifest.dependencies.ecc.required, true);
    assert.equal(manifest.dependencies.ecc.binding.state, 'unbound');
    assert.equal(manifest.dependencies.ecc.binding.source, 'missing');
    assert.equal(foundationManifest.runtimeBase, 'ecc');
    assert.equal(foundationManifest.binding.state, 'unbound');
    assert.equal(foundationManifest.binding.source, 'missing');
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'foundation', 'profile', 'runtime-base.md')));
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'foundation', 'profile', 'branch-workflow.md')));
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'foundation', 'profile', 'verification.md')));
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'foundation', 'profile', 'operating-agreements.md')));
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'overlays', 'internal-extension-points', 'mcp', 'README.md')));
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'overlays', 'internal-extension-points', 'skills', 'internal-placeholder', 'SKILL.md')));
    assert.match(branchWorkflow, /Recommended prefixes:/);
    assert.match(branchWorkflow, /change\/<change-id>/);
    assert.match(verification, /Minimum expectation by change type:/);
    assert.match(verification, /run focused tests/);
    assert.match(operatingAgreements, /Do not mark work complete without reporting verification/);
    assert.match(foundationReadme, /This project is provisioned with the built-in Praxis runtime base/);
    assert.match(foundationReadme, /Built-in baseline conventions/);
    assert.match(foundationReadme, /branch-workflow\.md/);
    assert.match(foundationReadme, /ECC binding state: `unbound`/);
    assert.match(foundationReadme, /not the required front door for every daily task/);
  });
});

test('initProject can skip the default foundation internally', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-init-no-foundation-'));
  const fakeBinDir = installFakeOpenSpec(projectDir);

  withTempPath(fakeBinDir, () => {
    const output = initProject({
      projectDir,
      agents: ['codex'],
      applyDefaultFoundation: false,
    });

    const manifest = readJsonFile(path.join(projectDir, '.praxis', 'manifest.json'));

    assert.doesNotMatch(output, /Applying built-in Praxis runtime base/);
    assert.equal(manifest.selectedFoundation, null);
    assert.ok(!fs.existsSync(path.join(projectDir, '.praxis', 'foundation', 'manifest.json')));
  });
});

test('useStackProject applies a stack after framework init', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-use-stack-'));
  const fakeBinDir = installFakeOpenSpec(projectDir);

  withTempPath(fakeBinDir, () => {
    initProject({
      projectDir,
      agents: ['codex'],
      applyDefaultFoundation: false,
    });

    const output = useStackProject({
      projectDir,
      stackName: 'java-spring',
      agents: ['codex'],
    });

    const manifest = readJsonFile(path.join(projectDir, '.praxis', 'manifest.json'));
    const stackMd = fs.readFileSync(path.join(projectDir, '.praxis', 'stack.md'), 'utf8');
    const rulesMd = fs.readFileSync(path.join(projectDir, '.praxis', 'rules.md'), 'utf8');

    assert.match(output, /Applying stack: java-spring/);
    assert.equal(manifest.selectedStack, 'java-spring');
    assert.match(stackMd, /Java \+ Spring Boot/);
    assert.match(rulesMd, /Spring Boot/);
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'skills', 'java-security', 'SKILL.md')));
  });
});

test('useFoundationProject applies overlays after framework init', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-use-foundation-'));
  const fakeBinDir = installFakeOpenSpec(projectDir);

  withTempPath(fakeBinDir, () => {
    initProject({
      projectDir,
      agents: ['codex'],
      applyDefaultFoundation: false,
    });

    const output = useFoundationProject({
      projectDir,
      foundationName: 'ecc-foundation',
      agents: ['codex'],
    });

    const agentsMd = fs.readFileSync(path.join(projectDir, 'AGENTS.md'), 'utf8');

    assert.match(output, /\.praxis\/foundation\/profile\/ created from internal-base/);
    assert.match(output, /\.praxis\/overlays\/ecc-runtime-base\/ created/);
    assert.match(agentsMd, /## Praxis Runtime Base/);
    assert.match(agentsMd, /runtime base: built-in Praxis runtime base/);
    assert.match(agentsMd, /runtime preset: `ecc-foundation`/);
    assert.match(agentsMd, /branch-workflow\.md/);
    assert.match(agentsMd, /verification\.md/);
    assert.match(agentsMd, /operating-agreements\.md/);
    assert.match(agentsMd, /not the mandatory front door for daily execution/);
  });
});

test('setupProject installs Codex superpowers, initializes, applies the built-in runtime base, and applies a requested stack', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-setup-'));
  const fakeGitDir = installFakeGit(projectDir);
  const fakeNpmDir = installFakeNpm(projectDir);
  const fakeHomeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-home-'));

  withTempPath(fakeNpmDir, () => withTempPath(fakeGitDir, () => withEnv('HOME', fakeHomeDir, () => {
    const output = setupProject({
      projectDir,
      stackName: 'java-spring',
      agents: ['opencode', 'codex'],
    });

    const manifest = readJsonFile(path.join(projectDir, '.praxis', 'manifest.json'));
    const codexSkillsPath = path.join(fakeHomeDir, '.agents', 'skills', 'superpowers');

    assert.match(output, /== openspec ==/);
    assert.match(output, /== opencode ==/);
    assert.match(output, /Configured OpenCode plugins/);
    assert.match(output, /== codex ==/);
    assert.match(output, /Cloned Codex SuperPowers/);
    assert.match(output, /Linked Codex SuperPowers skills/);
    assert.match(output, /== setup ==/);
    assert.match(output, /Selected stack: java-spring/);
    assert.match(output, /Applying built-in Praxis runtime base/);
    assert.match(output, /Dependency doctor:/);
    assert.equal(manifest.selectedFoundation, 'ecc-foundation');
    assert.equal(manifest.selectedStack, 'java-spring');
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'foundation', 'manifest.json')));
    assert.ok(fs.existsSync(path.join(projectDir, 'opencode.json')));
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'skills', 'java-security', 'SKILL.md')));
    assert.ok(fs.existsSync(codexSkillsPath));
    assert.ok(findSkillMarkdown(codexSkillsPath));
    assert.doesNotMatch(output, /\[MISSING\] superpowers:codex/);
  })));
});

test('setupProject applies the default foundation to an initialized project that does not have one yet', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-setup-default-foundation-'));
  const fakeGitDir = installFakeGit(projectDir);
  const fakeNpmDir = installFakeNpm(projectDir);
  const fakeHomeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-home-default-foundation-'));
  const fakeBinDir = installFakeOpenSpec(projectDir);

  withTempPath(fakeBinDir, () => {
    initProject({
      projectDir,
      agents: ['codex'],
      applyDefaultFoundation: false,
    });
  });

  withTempPath(fakeNpmDir, () => withTempPath(fakeGitDir, () => withEnv('HOME', fakeHomeDir, () => {
    const output = setupProject({
      projectDir,
      agents: ['codex'],
    });

    const manifest = readJsonFile(path.join(projectDir, '.praxis', 'manifest.json'));

    assert.match(output, /Project already initialized; refreshing selected agents and managed adapters\./);
    assert.match(output, /Applying built-in Praxis runtime base/);
    assert.match(output, /\.praxis\/foundation\/profile\/ created from internal-base/);
    assert.equal(manifest.selectedFoundation, 'ecc-foundation');
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'foundation', 'manifest.json')));
  })));
});

test('setupProject installs OpenSpec locally when runtime is missing', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-setup-install-openspec-'));
  const fakeGitDir = installFakeGit(projectDir);
  const fakeNpmDir = installFakeNpm(projectDir);
  const fakeWhichDir = installFakeWhich(projectDir, null);
  const fakeHomeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-home-install-'));

  withTempPath(fakeWhichDir, () => withTempPath(fakeNpmDir, () => withTempPath(fakeGitDir, () => withEnv('HOME', fakeHomeDir, () => {
    const output = setupProject({
      projectDir,
      agents: ['codex'],
    });

    assert.match(output, /Installed OpenSpec locally with npm/);
    assert.ok(fs.existsSync(path.join(projectDir, 'node_modules', '.bin', 'openspec')));
  }))));
});

test('setupProject installs OpenSpec locally on Windows via npm.cmd when runtime is missing', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis devos setup win openspec-'));
  const fakeGitDir = installFakeGit(projectDir);
  const fakeNpmPath = installFakeWindowsNpm(projectDir);
  const fakeWhereDir = installFakeWhereWithMap(projectDir, {
    npm: fakeNpmPath.replace(/\.cmd$/i, ''),
    'npm.cmd': fakeNpmPath,
  });
  const fakeCmdShell = installFakeCmdRunner(projectDir);
  const fakeHomeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-home-win-install-'));

  withPlatform('win32', () => withTempPath(fakeWhereDir, () => withTempPath(fakeGitDir, () => withEnv('HOME', fakeHomeDir, () => withEnv('ComSpec', fakeCmdShell, () => {
    const output = setupProject({
      projectDir,
      agents: ['claude'],
    });

    assert.match(output, /Installed OpenSpec locally with npm/);
    assert.ok(fs.existsSync(path.join(projectDir, 'node_modules', '.bin', 'openspec.cmd')));
  })))));
});

test('setupProject skips OpenSpec install when project-local runtime already exists', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-setup-existing-openspec-'));
  const fakeGitDir = installFakeGit(projectDir);
  const fakeNpmDir = installFakeNpm(projectDir);
  const fakeHomeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-home-existing-'));
  installFakeProjectLocalOpenSpec(projectDir, 'LOCAL');

  withTempPath(fakeNpmDir, () => withTempPath(fakeGitDir, () => withEnv('HOME', fakeHomeDir, () => {
    const output = setupProject({
      projectDir,
      agents: ['codex'],
    });

    assert.match(output, /OpenSpec already available \(project-local\)/);
    assert.doesNotMatch(output, /Installed OpenSpec locally with npm/);
  })));
});

test('doctor warns when Codex superpowers path has no skill content', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-doctor-codex-empty-'));
  const fakeHomeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-home-codex-empty-'));
  const codexSkillsPath = path.join(fakeHomeDir, '.agents', 'skills', 'superpowers');

  fs.mkdirSync(codexSkillsPath, { recursive: true });

  withEnv('HOME', fakeHomeDir, () => {
    const output = doctorProject({
      projectDir,
      agents: ['codex'],
    });

    assert.match(output, /\[WARN\] superpowers:codex/);
    assert.match(output, /no SKILL\.md files were found/);
  });
});

test('setupProject surfaces manual action required for claude', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-setup-claude-'));
  const fakeNpmDir = installFakeNpm(projectDir);
  const fakeWhichDir = installFakeWhich(projectDir, null);

  withTempPath(fakeWhichDir, () => withTempPath(fakeNpmDir, () => {
    const output = setupProject({
      projectDir,
      agents: ['claude'],
    });

    assert.match(output, /Manual action required: Claude Code SuperPowers cannot be installed automatically from Praxis/);
    assert.match(output, /\/plugin install superpowers@claude-plugins-official/);
  }));
});

test('initProject repairs incomplete skill directories instead of skipping them', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-init-repair-'));
  const fakeBinDir = installFakeOpenSpec(projectDir);

  fs.mkdirSync(path.join(projectDir, '.praxis', 'skills', 'git-workflow'), { recursive: true });
  fs.mkdirSync(path.join(projectDir, '.praxis', 'skills', 'java-security'), { recursive: true });

  withTempPath(fakeBinDir, () => {
    const output = initProject({
      projectDir,
      stackName: 'java-spring',
      agents: ['codex'],
    });

    assert.match(output, /repaired from framework defaults/);
    assert.match(output, /repaired from java-spring/);
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'skills', 'git-workflow', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'skills', 'java-security', 'SKILL.md')));
  });
});

test('statusProject summarizes initialized project state', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-status-'));
  const fakeBinDir = installFakeOpenSpec(projectDir);

  withTempPath(fakeBinDir, () => {
    initProject({
      projectDir,
      stackName: 'java-spring',
      foundationName: 'ecc-foundation',
      agents: ['codex', 'claude'],
    });

    fs.mkdirSync(path.join(projectDir, 'openspec', 'changes', 'add-login-audit'), { recursive: true });

    const output = statusProject({
      projectDir,
      agents: ['codex', 'claude'],
    });

    assert.match(output, /initialized: yes/);
    assert.match(output, /skills index: present/);
    assert.match(output, /selected stack: java-spring/);
    assert.match(output, /runtime base preset: ecc-foundation/);
    assert.match(output, /runtime profile: internal-base/);
    assert.match(output, /ecc binding state: unbound/);
    assert.match(output, /ecc binding source: missing/);
    assert.match(output, /ecc remediation: Bind ECC with `npx praxis-devos bind --ecc-runtime \/path\/to\/ecc-runtime`/);
    assert.match(output, /ecc verify: Verify with `npx praxis-devos status`/);
    assert.match(output, /overlay directories: ecc-runtime-base, internal-extension-points/);
    assert.match(output, /configured agents: codex, claude/);
    assert.match(output, /active changes: add-login-audit/);
    assert.match(output, /Dependencies:/);
    assert.match(output, /ecc-runtime: \[MISSING\]/);
  });
});

test('statusProject reports bound ECC runtime when ecc is available on PATH', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-status-ecc-bound-'));
  const fakeOpenSpecDir = installFakeOpenSpec(projectDir);
  const fakeEccDir = installFakeEcc(projectDir);

  withTempPath(fakeOpenSpecDir, () => withTempPath(fakeEccDir, () => {
    initProject({
      projectDir,
      agents: ['opencode'],
    });

    const manifest = readJsonFile(path.join(projectDir, '.praxis', 'manifest.json'));
    const output = statusProject({
      projectDir,
      agents: ['opencode'],
    });

    assert.equal(manifest.dependencies.ecc.required, true);
    assert.equal(manifest.dependencies.ecc.binding.state, 'bound');
    assert.equal(manifest.dependencies.ecc.binding.source, 'path');
    assert.match(output, /ecc binding state: bound/);
    assert.match(output, /ecc binding source: path/);
    assert.match(output, /ecc-runtime: \[OK\] ECC runtime CLI is available on PATH/);
  }));
});

test('statusProject surfaces stale project-level ECC bindings with a concrete remediation target', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-status-ecc-stale-'));
  const fakeOpenSpecDir = installFakeOpenSpec(projectDir);
  const stalePath = path.join(projectDir, 'missing-ecc-runtime');

  withTempPath(fakeOpenSpecDir, () => {
    initProject({
      projectDir,
      agents: ['codex'],
    });

    fs.writeFileSync(
      path.join(projectDir, '.praxis', 'ecc-binding.json'),
      `${JSON.stringify({ path: stalePath }, null, 2)}\n`,
    );

    const output = statusProject({
      projectDir,
      agents: ['codex'],
    });

    assert.match(output, /ecc binding state: unbound/);
    assert.match(output, /ecc binding source: project-binding/);
    assert.match(output, /ecc current binding: \.praxis\/ecc-binding\.json -> /);
    assert.match(output, new RegExp(stalePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(output, /ecc remediation: Re-bind ECC with `npx praxis-devos bind --ecc-runtime \/path\/to\/ecc-runtime`/);
    assert.match(output, /ecc verify: Verify with `npx praxis-devos status`/);
  });
});

test('runCli bind stores project-level ECC binding and refreshes manifest state', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-bind-ecc-'));
  const fakeOpenSpecDir = installFakeOpenSpec(projectDir);
  const fakeEccDir = installFakeEcc(projectDir);

  withTempPath(fakeOpenSpecDir, () => {
    initProject({
      projectDir,
      agents: ['codex'],
    });

    const output = runCli([
      'bind',
      '--project-dir',
      projectDir,
      '--agent',
      'codex',
      '--ecc-runtime',
      fakeEccDir,
    ]);

    const bindingConfig = readJsonFile(path.join(projectDir, '.praxis', 'ecc-binding.json'));
    const manifest = readJsonFile(path.join(projectDir, '.praxis', 'manifest.json'));
    const foundationManifest = readJsonFile(path.join(projectDir, '.praxis', 'foundation', 'manifest.json'));
    const status = statusProject({
      projectDir,
      agents: ['codex'],
    });

    assert.match(output, /ECC runtime bound via \.praxis\/ecc-binding\.json/);
    assert.equal(bindingConfig.path, fakeEccDir);
    assert.equal(bindingConfig.command, path.join(fakeEccDir, 'ecc'));
    assert.equal(manifest.dependencies.ecc.binding.state, 'bound');
    assert.equal(manifest.dependencies.ecc.binding.source, 'project-binding');
    assert.equal(foundationManifest.binding.state, 'bound');
    assert.equal(foundationManifest.binding.source, 'project-binding');
    assert.match(status, /ecc binding state: bound/);
    assert.match(status, /ecc binding source: project-binding/);
    assert.doesNotMatch(status, /ecc remediation:/);
  });
});

test('doctorProject strict fails when ECC runtime is missing for an ECC-bound project', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-doctor-ecc-missing-'));
  const fakeBinDir = installFakeOpenSpec(projectDir);

  withTempPath(fakeBinDir, () => {
    initProject({
      projectDir,
      agents: ['opencode'],
    });
    bootstrapProject({
      projectDir,
      agents: ['opencode'],
    });

    assert.throws(
      () => doctorProject({ projectDir, agents: ['opencode'], strict: true }),
      /Bind ECC with `npx praxis-devos bind --ecc-runtime \/path\/to\/ecc-runtime`/,
    );
  });
});

test('doctorProject recommends bind before setup when ECC runtime is the remaining issue', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-doctor-ecc-remediate-'));
  const fakeBinDir = installFakeOpenSpec(projectDir);

  withTempPath(fakeBinDir, () => {
    initProject({
      projectDir,
      agents: ['opencode'],
    });
    bootstrapProject({
      projectDir,
      agents: ['opencode'],
    });

    const output = doctorProject({ projectDir, agents: ['opencode'] });

    assert.match(output, /Recommended next step:/);
    assert.match(output, /- Bind ECC with `npx praxis-devos bind --ecc-runtime \/path\/to\/ecc-runtime`/);
    assert.match(output, /- Verify with `npx praxis-devos doctor --strict`/);
    assert.doesNotMatch(output, /- npx praxis-devos setup --agents opencode/);
  });
});

test('syncProject preserves user content and refreshes opencode projection', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-sync-'));
  const fakeBinDir = installFakeOpenSpec(projectDir);

  withTempPath(fakeBinDir, () => {
    initProject({
      projectDir,
      stackName: 'java-spring',
      agents: ['codex'],
    });

    const agentsPath = path.join(projectDir, 'AGENTS.md');
    fs.writeFileSync(agentsPath, `# User Notes\n\nKeep this section.\n\n${fs.readFileSync(agentsPath, 'utf8')}`);
    fs.mkdirSync(path.join(projectDir, '.opencode', 'skills', 'custom-opencode'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, '.opencode', 'skills', 'custom-opencode', 'SKILL.md'), '# Custom OpenCode Skill\n');

    const output = syncProject({
      projectDir,
      agents: ['opencode', 'codex'],
    });

    const nextAgents = fs.readFileSync(agentsPath, 'utf8');
    assert.match(output, /OpenCode adapter synced to \.opencode\//);
    assert.match(output, /Codex adapter synced via AGENTS\.md/);
    assert.match(nextAgents, /^<!-- PRAXIS_DEVOS_START -->/);
    assert.match(nextAgents, /Keep this section\./);
    assert.ok(fs.existsSync(path.join(projectDir, '.opencode', 'README.md')));
    assert.ok(fs.existsSync(path.join(projectDir, '.opencode', 'skills', 'custom-opencode', 'SKILL.md')));
    assert.ok(!fs.existsSync(path.join(projectDir, '.opencode', 'stack.md')));
    assert.ok(!fs.existsSync(path.join(projectDir, '.opencode', 'stack-rules.md')));

    const opencodeReadme = fs.readFileSync(path.join(projectDir, '.opencode', 'README.md'), 'utf8');
    assert.match(opencodeReadme, /no longer mirrors canonical skills, stack, or rules files by default/);
    assert.match(opencodeReadme, /supplemental skills/);

    const paths = collectSkillsPaths(projectDir);
    assert.ok(paths.includes(path.join(projectDir, '.praxis', 'skills')));
    assert.ok(paths.includes(path.join(projectDir, '.opencode', 'skills')));
    assert.ok(paths.indexOf(path.join(projectDir, '.praxis', 'skills')) < paths.indexOf(path.join(projectDir, '.opencode', 'skills')));
  });
});

test('migrateProject moves legacy opencode assets into canonical praxis state', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-migrate-'));

  fs.mkdirSync(path.join(projectDir, '.opencode', 'skills', 'legacy-skill'), { recursive: true });
  fs.writeFileSync(path.join(projectDir, '.opencode', 'skills', 'legacy-skill', 'SKILL.md'), '# Legacy Skill\n');
  fs.writeFileSync(path.join(projectDir, '.opencode', 'stack.md'), '# Legacy Stack\n');
  fs.writeFileSync(path.join(projectDir, '.opencode', 'stack-rules.md'), '# Legacy Rules\n');

  const output = migrateProject({
    projectDir,
    agents: ['codex'],
  });

  const manifest = readJsonFile(path.join(projectDir, '.praxis', 'manifest.json'));
  assert.match(output, /Migrated \.opencode\/skills\/legacy-skill\/ to \.praxis\/skills\//);
  assert.equal(manifest.migratedFrom, '.opencode');
  assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'skills', 'legacy-skill', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'stack.md')));
  assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'rules.md')));
  assert.ok(fs.existsSync(path.join(projectDir, 'AGENTS.md')));
});

test('bootstrapProject updates opencode config and prints agent-specific guidance', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-bootstrap-'));

  const output = bootstrapProject({
    projectDir,
    agents: ['opencode', 'codex', 'claude'],
  });

  const config = readJsonFile(path.join(projectDir, 'opencode.json'));
  assert.ok(Array.isArray(config.plugin));
  assert.ok(config.plugin.some((entry) => entry.includes('praxis-devos')));
  assert.ok(config.plugin.some((entry) => entry.includes('github.com/obra/superpowers')));
  assert.match(output, /== opencode ==/);
  assert.match(output, /== codex ==/);
  assert.match(output, /ln -s ~\/\.codex\/superpowers\/skills ~\/\.agents\/skills\/superpowers/);
  assert.match(output, /== claude ==/);
  assert.match(output, /\/plugin install superpowers@claude-plugins-official/);
});

test('bootstrapProject prints PowerShell Codex guidance on Windows', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-bootstrap-win-'));

  withPlatform('win32', () => {
    const output = bootstrapProject({
      projectDir,
      agents: ['codex'],
    });

    assert.match(output, /PowerShell/);
    assert.match(output, /New-Item -ItemType Junction/);
    assert.doesNotMatch(output, /ln -s ~\/\.codex\/superpowers\/skills/);
  });
});

test('bootstrapOpenSpec reports project-local runtime when available', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-openspec-bootstrap-'));
  installFakeProjectLocalOpenSpec(projectDir);

  const output = bootstrapOpenSpec({ projectDir });
  assert.match(output, /OpenSpec already available \(project-local\)/);
  assert.match(output, /npx praxis-devos openspec list --specs/);
  assert.match(output, /praxis-devos openspec list --specs/);
});

test('bootstrapOpenSpec reports Windows project-local cmd runtime when available', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis devos openspec win local-'));

  withPlatform('win32', () => {
    const scriptPath = installFakeWindowsOpenSpec(projectDir, 'local');
    const output = bootstrapOpenSpec({ projectDir });

    assert.match(output, /OpenSpec already available \(project-local\)/);
    assert.match(output, new RegExp(scriptPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});

test('runOpenSpecCommand prefers project-local runtime over PATH', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-openspec-run-'));
  const fakeBinDir = installFakeOpenSpec(projectDir);
  installFakeProjectLocalOpenSpec(projectDir, 'LOCAL');

  withTempPath(fakeBinDir, () => {
    const output = runOpenSpecCommand({
      projectDir,
      args: ['list', '--specs'],
    });

    assert.equal(output, 'LOCAL:list --specs');
  });
});

test('runOpenSpecCommand disables OpenSpec telemetry by default', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-openspec-run-telemetry-'));
  installFakeProjectLocalOpenSpecTelemetryProbe(projectDir);

  const output = runOpenSpecCommand({
    projectDir,
    args: ['list', '--specs'],
  });

  assert.match(output, /TELEMETRY:0/);
  assert.match(output, /DNT:1/);
  assert.match(output, /ARGS:list --specs/);
});

test('runOpenSpecCommand bridges DO_NOT_TRACK opt-out to OpenSpec telemetry', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-openspec-run-dnt-'));
  installFakeProjectLocalOpenSpecTelemetryProbe(projectDir);

  withEnv('DO_NOT_TRACK', '1', () => withEnv('OPENSPEC_TELEMETRY', null, () => {
    const output = runOpenSpecCommand({
      projectDir,
      args: ['list', '--specs'],
    });

    assert.match(output, /TELEMETRY:0/);
    assert.match(output, /DNT:1/);
  }));
});

test('runOpenSpecCommand bridges disabled OpenSpec telemetry to DO_NOT_TRACK', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-openspec-run-telemetry-bridge-'));
  installFakeProjectLocalOpenSpecTelemetryProbe(projectDir);

  withEnv('OPENSPEC_TELEMETRY', '0', () => withEnv('DO_NOT_TRACK', null, () => {
    const output = runOpenSpecCommand({
      projectDir,
      args: ['list', '--specs'],
    });

    assert.match(output, /TELEMETRY:0/);
    assert.match(output, /DNT:1/);
  }));
});

test('runOpenSpecCommand treats blank telemetry env vars as unset defaults', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-openspec-run-telemetry-blank-'));
  installFakeProjectLocalOpenSpecTelemetryProbe(projectDir);

  withEnv('OPENSPEC_TELEMETRY', ' ', () => withEnv('DO_NOT_TRACK', '', () => {
    const output = runOpenSpecCommand({
      projectDir,
      args: ['list', '--specs'],
    });

    assert.match(output, /TELEMETRY:0/);
    assert.match(output, /DNT:1/);
  }));
});

test('runOpenSpecCommand bridges enabled OpenSpec telemetry to DO_NOT_TRACK', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-openspec-run-telemetry-opt-in-'));
  installFakeProjectLocalOpenSpecTelemetryProbe(projectDir);

  withEnv('OPENSPEC_TELEMETRY', '1', () => withEnv('DO_NOT_TRACK', null, () => {
    const output = runOpenSpecCommand({
      projectDir,
      args: ['list', '--specs'],
    });

    assert.match(output, /TELEMETRY:1/);
    assert.match(output, /DNT:0/);
  }));
});

test('runOpenSpecCommand canonicalizes telemetry aliases before spawning OpenSpec', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-openspec-run-telemetry-alias-'));
  installFakeProjectLocalOpenSpecTelemetryProbe(projectDir);

  withEnv('OPENSPEC_TELEMETRY', ' yes ', () => withEnv('DO_NOT_TRACK', null, () => {
    const output = runOpenSpecCommand({
      projectDir,
      args: ['list', '--specs'],
    });

    assert.match(output, /TELEMETRY:1/);
    assert.match(output, /DNT:0/);
  }));
});

test('runOpenSpecCommand uses cmd wrapper for Windows project-local openspec.cmd', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis devos openspec win run-'));

  withPlatform('win32', () => {
    const scriptPath = installFakeWindowsOpenSpec(projectDir, 'local');
    const cmdShell = installFakeCmdShell(projectDir);

    withEnv('ComSpec', cmdShell, () => {
      const output = runOpenSpecCommand({
        projectDir,
        args: ['list', '--specs'],
      });

      assert.match(output, new RegExp(`"${scriptPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" list --specs`));
    });
  });
});

test('runOpenSpecCommand disables telemetry for Windows batch runtimes by default', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis devos openspec win telemetry-'));

  withPlatform('win32', () => {
    installFakeWindowsOpenSpecTelemetryProbe(projectDir, 'local');
    const cmdShell = installFakeCmdRunner(projectDir);

    withEnv('ComSpec', cmdShell, () => {
      const output = runOpenSpecCommand({
        projectDir,
        args: ['list', '--specs'],
      });

      assert.match(output, /TELEMETRY:0/);
      assert.match(output, /DNT:1/);
      assert.match(output, /ARGS:list --specs/);
    });
  });
});

test('runOpenSpecCommand uses resolved PATH batch runtime on Windows', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis devos openspec win path-'));

  withPlatform('win32', () => {
    const globalCmdPath = installFakeWindowsOpenSpec(projectDir, 'global');
    const whereBin = installFakeWhere(projectDir, globalCmdPath);
    const cmdShell = installFakeCmdShell(projectDir);

    withTempPath(whereBin, () => withEnv('ComSpec', cmdShell, () => {
      const output = runOpenSpecCommand({
        projectDir,
        args: ['validate', 'add-auth', '--strict'],
      });

      assert.match(output, new RegExp(`"${globalCmdPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" validate add-auth --strict`));
    }));
  });
});

test('collectSkillsPaths still supports legacy opencode-only projects', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-legacy-skills-'));
  fs.mkdirSync(path.join(projectDir, '.opencode', 'skills', 'legacy-only'), { recursive: true });
  fs.writeFileSync(path.join(projectDir, '.opencode', 'skills', 'legacy-only', 'SKILL.md'), '# Legacy Only\n');

  const paths = collectSkillsPaths(projectDir);
  assert.ok(paths.includes(path.join(projectDir, '.opencode', 'skills')));
});

test('analyzeSessionTranscript recognizes SuperPowers event-hook evidence', () => {
  const fixturePath = path.join(PRAXIS_ROOT, 'test', 'fixtures', 'transcripts', 'valid-session.md');
  const result = analyzeSessionTranscript(fs.readFileSync(fixturePath, 'utf8'));

  assert.equal(result.status, 'pass');
  assert.equal(result.findings.length, 0);
  assert.deepEqual(
    result.triggered.map((hook) => hook.id),
    [
      'proposal-flow',
      'proposal-ambiguity',
      'implementation-branch-gate',
      'multi-step-work',
      'bug-debugging',
      'parallel-work',
      'completion-gate',
    ],
  );
});

test('validateSessionTranscript reports missing event-hook evidence', () => {
  const fixturePath = path.join(PRAXIS_ROOT, 'test', 'fixtures', 'transcripts', 'missing-hooks-session.md');
  const report = validateSessionTranscript({ filePath: fixturePath });

  assert.match(report, /status: needs-attention/);
  assert.match(report, /Missing Proposal Intake evidence after proposal flow signal/);
  assert.match(report, /Missing git-workflow \/ branch check evidence after approved proposal implementation signal/);
  assert.match(report, /Missing systematic-debugging evidence after bug \/ failure debugging signal/);
  assert.match(report, /Missing verification-before-completion evidence after completion gate signal/);
});

test('runCli validate-session --strict fails when transcript evidence is incomplete', () => {
  const fixturePath = path.join(PRAXIS_ROOT, 'test', 'fixtures', 'transcripts', 'missing-hooks-session.md');

  assert.throws(
    () => runCli(['validate-session', '--file', fixturePath, '--strict']),
    /Missing Proposal Intake evidence after proposal flow signal/,
  );
});

test('runCli use-stack requires a stack name', () => {
  assert.throws(
    () => runCli(['use-stack']),
    /Stack name is required/,
  );
});

test('runCli use-foundation requires a foundation name', () => {
  assert.throws(
    () => runCli(['use-foundation']),
    /Runtime base preset name is required/,
  );
});

test('runCli bind requires an ECC runtime path', () => {
  assert.throws(
    () => runCli(['bind']),
    /ECC runtime path is required/,
  );
});

test('runCli rejects removed --openspec flag with migration guidance', () => {
  assert.throws(
    () => runCli(['bootstrap', '--openspec']),
    /`--openspec` has been removed/,
  );
});

test('runCli rejects unexpected positional args for core commands', () => {
  assert.throws(
    () => runCli(['doctor', 'codex']),
    /Unexpected positional argument for doctor: codex/,
  );
});

test('runCli rejects extra positional args for use-stack', () => {
  assert.throws(
    () => runCli(['use-stack', 'java-spring', 'starter']),
    /Unexpected positional argument for use-stack: starter/,
  );
});

test('runCli rejects positional args when use-stack already received --stack', () => {
  assert.throws(
    () => runCli(['use-stack', '--stack', 'java-spring', 'starter']),
    /Unexpected positional argument for use-stack: starter/,
  );
});
