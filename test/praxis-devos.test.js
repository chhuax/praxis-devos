import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { injectMarker } from '../src/projection/markers.js';

import {
  PRAXIS_ROOT,
  analyzeSessionTranscript,
  bootstrapOpenSpec,
  bootstrapProject,
  createChangeScaffold,
  doctorProject,
  initProject,
  migrateProject,
  parseCliArgs,
  projectNativeSkills,
  renderHelp,
  runCli,
  setupProject,
  statusProject,
  syncProject,
  validateSessionTranscript,
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

const installFakeOpenSpec = (projectDir, label = 'LOCAL') => {
  const binDir = path.join(projectDir, 'node_modules', '.bin');
  const scriptPath = path.join(binDir, 'openspec');
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(
    scriptPath,
    `#!/bin/sh
set -eu
cmd="\${1:-}"
if [ "$cmd" = "init" ]; then
  target="$2"
  mkdir -p "$target/openspec/specs" "$target/openspec/changes/archive"
  cat > "$target/openspec/config.yaml" <<'EOF'
# context:
EOF
  exit 0
fi
printf '${label}:%s\\n' "$*"
`,
    { mode: 0o755 },
  );
  fs.chmodSync(scriptPath, 0o755);
  return scriptPath;
};

const ensureOpenSpecWorkspace = (projectDir) => {
  fs.mkdirSync(path.join(projectDir, 'openspec', 'changes'), { recursive: true });
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const installFakeClaude = (homeDir) => {
  const binDir = path.join(homeDir, 'fake-claude-bin');
  const scriptPath = path.join(binDir, 'claude');
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(
    scriptPath,
    `#!/bin/sh
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

test('renderHelp reflects the current CLI surface', () => {
  const help = renderHelp();

  assert.match(help, /setup/);
  assert.match(help, /validate-session/);
  assert.doesNotMatch(help, /^\s*openspec\s+/m);
  assert.doesNotMatch(help, /change\s+Create an OpenSpec change scaffold/);
  assert.doesNotMatch(help, /proposal\s+Compatibility alias/);
  assert.doesNotMatch(help, /list-stacks/);
  assert.doesNotMatch(help, /use-stack/);
});

test('parseCliArgs parses current flags and rejects removed --openspec', () => {
  const parsed = parseCliArgs([
    'doctor',
    '--agents',
    'codex,claude',
    '--agent',
    'opencode',
    '--project-dir',
    'tmp/project',
    '--file',
    'tmp/session.md',
    '--strict',
  ]);

  assert.equal(parsed.command, 'doctor');
  assert.deepEqual(parsed.agents, ['codex', 'claude', 'opencode']);
  assert.equal(parsed.projectDir, path.resolve('tmp/project'));
  assert.equal(parsed.file, path.resolve('tmp/session.md'));
  assert.equal(parsed.strict, true);

  assert.throws(
    () => parseCliArgs(['bootstrap', '--openspec']),
    /`--openspec` has been removed/,
  );
});

test('syncProject refreshes adapters and preserves user-owned content', () => {
  const projectDir = makeTempProject();
  const agentsPath = path.join(projectDir, 'AGENTS.md');
  fs.writeFileSync(agentsPath, '# Project Notes\n\nKeep this section.\n', 'utf8');

  const output = syncProject({
    projectDir,
    agents: ['codex', 'claude', 'opencode'],
  });

  const agentsMd = fs.readFileSync(agentsPath, 'utf8');
  assert.match(output, /Synced adapters: codex, claude, opencode/);
  assert.match(agentsMd, /PRAXIS_DEVOS_START/);
  assert.match(agentsMd, /Keep this section\./);
  assert.match(agentsMd, /中大型变更、跨模块改动、接口或兼容性调整、架构\/流程重构/);
  assert.match(agentsMd, /提案\/探索阶段必须走原生 OpenSpec proposal 流程/);
  assert.match(agentsMd, /进入 OpenSpec flow 后，OpenSpec skill 是唯一主流程/);
  assert.match(agentsMd, /superpowers 仅作为当前 OpenSpec 阶段的辅助能力使用/);
  assert.match(agentsMd, /在 OpenSpec 上下文中，避免再次向用户宣告 `Using \[skill\]` 或 `superpowers:/);
  assert.match(agentsMd, /先在当前 OpenSpec 阶段内完成范围澄清与方案比较/);
  assert.match(agentsMd, /执行 `openspec new change \.\.\.` 等原生命令创建\/推进 proposal/);
  assert.doesNotMatch(agentsMd, /praxis-devos openspec/);
  assert.doesNotMatch(agentsMd, /显式加载 `superpowers:brainstorming`/);
  assert.doesNotMatch(agentsMd, /显式加载 `superpowers:writing-plans`/);
  assert.doesNotMatch(agentsMd, /`brainstorming` 方法/);
  assert.doesNotMatch(agentsMd, /brainstorming \/ writing-plans \/ debugging \/ verification/);
  assert.ok(fs.existsSync(path.join(projectDir, 'CLAUDE.md')));
  assert.ok(fs.existsSync(path.join(projectDir, '.opencode', 'README.md')));
});

test('injectMarker preserves YAML frontmatter at the top of projected skills', () => {
  const content = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'openspec-skills', 'opsx-propose', 'SKILL.md'),
    'utf8',
  );

  const projected = injectMarker(content, '<!-- PRAXIS_PROJECTION source=test version=0.4.1 -->');

  assert.match(projected, /^---\n[\s\S]*?\n---\n<!-- PRAXIS_PROJECTION /);
});

test('projectNativeSkills writes Codex skills under the resolved user home with valid frontmatter', () => {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-projection-home-'));
  const logs = [];

  withEnv('HOME', fakeHome, () => {
    projectNativeSkills({
      projectDir: makeTempProject(),
      agents: ['codex'],
      log: (msg) => logs.push(msg),
    });

    const projectedCodexSkill = fs.readFileSync(
      path.join(fakeHome, '.agents', 'skills', 'opsx-propose', 'SKILL.md'),
      'utf8',
    );

    assert.match(projectedCodexSkill, /^---\n[\s\S]*?\n---\n<!-- PRAXIS_PROJECTION /);
  });

  assert.match(logs.join('\n'), /Codex: projected opsx-propose/);
});

test('initProject bootstraps openspec workspace through a local runtime', () => {
  const projectDir = makeTempProject();
  installFakeOpenSpec(projectDir);

  const output = initProject({
    projectDir,
    agents: ['codex', 'opencode'],
  });

  assert.match(output, /openspec init completed \(project-local\)/);
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'specs')));
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'archive')));
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'config.yaml')));
  assert.ok(fs.existsSync(path.join(projectDir, 'AGENTS.md')));
  assert.ok(fs.existsSync(path.join(projectDir, '.opencode', 'README.md')));
});

test('statusProject reports initialized state for the selected agents', () => {
  const projectDir = makeTempProject();
  installFakeOpenSpec(projectDir);
  fs.writeFileSync(
    path.join(projectDir, 'opencode.json'),
    JSON.stringify({ plugin: ['superpowers@git+https://github.com/obra/superpowers.git'] }, null, 2),
  );
  ensureOpenSpecWorkspace(projectDir);

  const output = statusProject({
    projectDir,
    agents: ['opencode'],
  });

  assert.match(output, /initialized: yes/);
  assert.match(output, /openspec: \[OK\]/);
  assert.match(output, /superpowers:opencode: \[OK\]/);
});

test('bootstrapOpenSpec prefers the local runtime when available', () => {
  const projectDir = makeTempProject();
  installFakeOpenSpec(projectDir);

  const output = bootstrapOpenSpec({ projectDir });

  assert.match(output, /OpenSpec already available \(project-local\)/);
  assert.match(output, /OpenSpec CLI directly from the same installation context/);
  assert.match(output, /node_modules\/\.bin\/openspec list --specs/);
  assert.doesNotMatch(output, /praxis-devos openspec/);
});

test('bootstrapProject updates OpenCode plugins and prints runtime guidance', () => {
  const projectDir = makeTempProject();

  const output = bootstrapProject({
    projectDir,
    agents: ['opencode', 'codex', 'claude'],
  });

  const config = readJson(path.join(projectDir, 'opencode.json'));
  assert.match(output, /== opencode ==/);
  assert.match(output, /== codex ==/);
  assert.match(output, /== claude ==/);
  assert.ok(config.plugin.some((entry) => entry.includes('praxis-devos')));
  assert.ok(config.plugin.some((entry) => entry.includes('github.com\/obra\/superpowers')));
});

test('setupProject initializes the current structure for OpenCode without networked side effects', () => {
  const projectDir = makeTempProject();
  installFakeOpenSpec(projectDir);

  const output = setupProject({
    projectDir,
    agents: ['opencode'],
  });

  assert.match(output, /== openspec ==/);
  assert.match(output, /== opencode ==/);
  assert.match(output, /Configured OpenCode plugins in/);
  assert.match(output, /\[OK\] superpowers:opencode/);
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'archive')));
  assert.ok(fs.existsSync(path.join(projectDir, '.opencode', 'README.md')));
  assert.ok(fs.existsSync(path.join(projectDir, 'opencode.json')));
});

test('setupProject installs Claude SuperPowers with user scope when Claude CLI is available', () => {
  const projectDir = makeTempProject();
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-claude-home-'));
  const fakeClaudeBin = installFakeClaude(fakeHome);
  installFakeOpenSpec(projectDir);

  withEnv('HOME', fakeHome, () => withPrependedPath(fakeClaudeBin, () => {
    const output = setupProject({
      projectDir,
      agents: ['claude'],
    });

    assert.match(output, /Installed Claude SuperPowers with Claude Code CLI/);
    assert.match(output, /\[OK\] superpowers:claude/);
    assert.ok(fs.existsSync(path.join(fakeHome, '.claude', 'settings.json')));
  }));
});

test('createChangeScaffold remains available as an internal scaffold helper', () => {
  const projectDir = makeTempProject();
  ensureOpenSpecWorkspace(projectDir);

  const output = createChangeScaffold({
    projectDir,
    title: 'Add Two Factor Auth',
    summary: 'Harden account access.',
  });

  const changeDir = path.join(projectDir, 'openspec', 'changes', 'add-two-factor-auth');
  assert.match(output, /Created OpenSpec full change scaffold: add-two-factor-auth/);
  assert.match(output, /type: auto -> full/);
  assert.ok(fs.existsSync(path.join(changeDir, 'proposal.md')));
  assert.ok(fs.existsSync(path.join(changeDir, 'tasks.md')));
  assert.ok(fs.existsSync(path.join(changeDir, 'specs', 'two-factor-auth', 'spec.md')));
});

test('doctorProject reports current dependency status for OpenCode', () => {
  const projectDir = makeTempProject();
  installFakeOpenSpec(projectDir);
  fs.writeFileSync(
    path.join(projectDir, 'opencode.json'),
    JSON.stringify({ plugin: ['praxis-devos@git+https://github.com/chhuax/praxis-devos.git'] }, null, 2),
  );

  const output = doctorProject({
    projectDir,
    agents: ['opencode'],
  });

  assert.match(output, /Dependency doctor:/);
  assert.match(output, /\[OK\] openspec/);
  assert.match(output, /\[MISSING\] superpowers:opencode/);
  assert.match(output, /npx praxis-devos setup --agents opencode/);
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

test('analyzeSessionTranscript distinguishes valid and incomplete evidence', () => {
  const validFixture = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'test', 'fixtures', 'transcripts', 'valid-session.md'),
    'utf8',
  );
  const invalidFixture = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'test', 'fixtures', 'transcripts', 'missing-hooks-session.md'),
    'utf8',
  );

  const valid = analyzeSessionTranscript(validFixture);
  const invalid = analyzeSessionTranscript(invalidFixture);

  assert.equal(valid.status, 'pass');
  assert.equal(valid.findings.length, 0);
  assert.equal(invalid.status, 'needs-attention');
  assert.ok(invalid.findings.length > 0);
});

test('validateSessionTranscript returns reports and enforces strict mode', () => {
  const validFile = path.join(PRAXIS_ROOT, 'test', 'fixtures', 'transcripts', 'valid-session.md');
  const invalidFile = path.join(PRAXIS_ROOT, 'test', 'fixtures', 'transcripts', 'missing-hooks-session.md');

  const report = validateSessionTranscript({ filePath: validFile });

  assert.match(report, /status: pass/);
  assert.match(report, /findings: none/);
  assert.throws(
    () => validateSessionTranscript({ filePath: invalidFile, strict: true }),
    /status: needs-attention/,
  );
});

test('validateSessionTranscript rejects proposal flow without native OpenSpec proposal execution evidence', () => {
  const invalidFile = path.join(
    PRAXIS_ROOT,
    'test',
    'fixtures',
    'transcripts',
    'superpowers-without-native-openspec-session.md',
  );

  const report = validateSessionTranscript({ filePath: invalidFile });

  assert.match(report, /status: needs-attention/);
  assert.match(report, /Missing native OpenSpec proposal execution evidence after proposal flow signal/);
});

test('validateSessionTranscript rejects writing-plans before required proposal flow evidence', () => {
  const invalidFile = path.join(
    PRAXIS_ROOT,
    'test',
    'fixtures',
    'transcripts',
    'writing-plans-before-proposal-session.md',
  );

  const report = validateSessionTranscript({ filePath: invalidFile });

  assert.match(report, /status: needs-attention/);
  assert.match(report, /Missing Proposal Intake evidence after planning before proposal signal/);
  assert.match(report, /Missing native OpenSpec proposal execution evidence after planning before proposal signal/);
});

test('validateSessionTranscript rejects duplicate SuperPowers workflow announcements inside OpenSpec flow', () => {
  const invalidFile = path.join(
    PRAXIS_ROOT,
    'test',
    'fixtures',
    'transcripts',
    'duplicate-superpowers-announcement-session.md',
  );

  const report = validateSessionTranscript({ filePath: invalidFile });

  assert.match(report, /status: needs-attention/);
  assert.match(report, /Avoid separate SuperPowers workflow announcements inside OpenSpec flow/);
});

test('validateSessionTranscript rejects writing OpenSpec outputs into docs\\/superpowers paths', () => {
  const invalidFile = path.join(
    PRAXIS_ROOT,
    'test',
    'fixtures',
    'transcripts',
    'openspec-with-superpowers-doc-output-session.md',
  );

  const report = validateSessionTranscript({ filePath: invalidFile });

  assert.match(report, /status: needs-attention/);
  assert.match(report, /Keep OpenSpec-stage outputs in the current change artifacts, not docs\/superpowers/);
});

test('runCli routes help, validate-session, and migrate but rejects openspec wrapper usage', () => {
  const projectDir = makeTempProject();
  installFakeOpenSpec(projectDir, 'CLI');
  ensureOpenSpecWorkspace(projectDir);

  const help = runCli([]);
  const validation = runCli([
    'validate-session',
    '--file',
    path.join(PRAXIS_ROOT, 'test', 'fixtures', 'transcripts', 'valid-session.md'),
  ]);
  const migration = runCli([
    'migrate',
    '--project-dir',
    projectDir,
    '--agent',
    'codex',
  ]);

  assert.match(help, /praxis-devos <command> \[options\]/);
  assert.match(validation, /status: pass/);
  assert.match(migration, /Migration completed/);
  assert.ok(fs.existsSync(path.join(projectDir, 'AGENTS.md')));
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
