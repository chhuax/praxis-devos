import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
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
  statusProject,
  syncProject,
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

const readJsonFile = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

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
    assert.match(agentsMd, /^<!-- PRAXIS_DEVOS_START -->/);
    assert.match(agentsMd, /项目 Skills/);
    assert.match(agentsMd, /java-security/);
    assert.match(agentsMd, /## AI Dispatch/);
    assert.match(agentsMd, /proposal flow/);
    assert.match(agentsMd, /implementation flow/);
    assert.match(agentsMd, /review flow/);
    assert.match(agentsMd, /OpenSpec 命令统一通过 `npx praxis-devos openspec/);
    assert.match(agentsMd, /proposal flow: 先读取 `openspec\/AGENTS\.md`/);
    assert.match(agentsMd, /implementation flow: 先读取 `\.praxis\/rules\.md`/);
    assert.match(agentsMd, /`\.opencode\/skills\/` 仍可作为 OpenCode supplemental layer/);
    assert.match(agentsMd, /Codex：`npx praxis-devos bootstrap --agent codex`/);
    assert.match(agentsMd, /Claude Code：`npx praxis-devos bootstrap --agent claude`/);
    assert.match(agentsMd, /OpenCode：`npx praxis-devos bootstrap --agent opencode`/);
    assert.doesNotMatch(agentsMd, /当前入口按 `codex` 处理/);
    assert.doesNotMatch(agentsMd, /Spring Boot 代码组织/);
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

test('bootstrapOpenSpec reports project-local runtime when available', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-openspec-bootstrap-'));
  installFakeProjectLocalOpenSpec(projectDir);

  const output = bootstrapOpenSpec({ projectDir });
  assert.match(output, /OpenSpec already available \(project-local\)/);
  assert.match(output, /npx praxis-devos openspec list --specs/);
  assert.match(output, /praxis-devos openspec list --specs/);
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

test('collectSkillsPaths still supports legacy opencode-only projects', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-legacy-skills-'));
  fs.mkdirSync(path.join(projectDir, '.opencode', 'skills', 'legacy-only'), { recursive: true });
  fs.writeFileSync(path.join(projectDir, '.opencode', 'skills', 'legacy-only', 'SKILL.md'), '# Legacy Only\n');

  const paths = collectSkillsPaths(projectDir);
  assert.ok(paths.includes(path.join(projectDir, '.opencode', 'skills')));
});
