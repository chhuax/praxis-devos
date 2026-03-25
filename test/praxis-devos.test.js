import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  createChangeScaffold,
  doctorProject,
  initProject,
  renderHelp,
  runCli,
  statusProject,
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

test('renderHelp exposes change and proposal commands', () => {
  const help = renderHelp();
  assert.match(help, /change\s+Create an OpenSpec change scaffold/);
  assert.match(help, /proposal\s+Compatibility alias of `change`/);
});

test('createChangeScaffold creates a full change by default', () => {
  const projectDir = makeTempProject();
  const output = createChangeScaffold({
    projectDir,
    title: 'Add two factor auth',
    capability: 'auth',
  });

  assert.match(output, /type: auto -> full/);
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'add-two-factor-auth', 'proposal.md')));
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'add-two-factor-auth', 'tasks.md')));
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'add-two-factor-auth', 'specs', 'auth', 'spec.md')));
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

test('doctor strict fails when openspec is missing', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-doctor-'));

  assert.throws(
    () => doctorProject({ projectDir, agents: ['opencode'], strict: true }),
    /Strict dependency check failed/,
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
    assert.match(agentsMd, /项目 Skills/);
    assert.match(agentsMd, /java-security/);
  });
});

test('statusProject summarizes initialized project state', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-status-'));
  const fakeBinDir = installFakeOpenSpec(projectDir);

  withTempPath(fakeBinDir, () => {
    initProject({
      projectDir,
      stackName: 'java-spring',
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
    assert.match(output, /configured agents: codex, claude/);
    assert.match(output, /active changes: add-login-audit/);
    assert.match(output, /Dependencies:/);
  });
});
