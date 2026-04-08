import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { injectMarker } from '../src/projection/markers.js';
import {
  getCapabilityEvidencePath,
  readCapabilityEvidence,
  recordCapabilitySelection,
  updateCapabilityEvidenceStage,
} from '../src/monitoring/state-store.js';

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
  selectCapabilities,
  setupProject,
  statusProject,
  syncProject,
  validateChangeEvidence,
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

const listBackupFiles = (dirPath, fileName) => fs.readdirSync(dirPath)
  .filter((entry) => entry.startsWith(`${fileName}.bak-`))
  .sort();

const listTempFiles = (dirPath, fileName) => fs.readdirSync(dirPath)
  .filter((entry) => entry.startsWith(`${fileName}.tmp-`))
  .sort();

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

const installFakeWindowsBatchRuntime = ({ homeDir, projectDir }) => {
  const harnessDir = path.join(homeDir, 'fake-win-tools');
  const commandDir = path.join(homeDir, 'Program Files', 'nodejs');
  const npmPath = path.join(commandDir, 'npm.cmd');
  const claudePath = path.join(commandDir, 'claude.cmd');
  const globalOpenSpecPath = path.join(commandDir, 'openspec.cmd');
  const comSpecPath = path.join(harnessDir, 'cmd.exe');
  const wherePath = path.join(harnessDir, 'where');
  const openspecPath = path.join(projectDir, 'node_modules', '.bin', 'openspec.cmd');

  fs.mkdirSync(harnessDir, { recursive: true });
  fs.mkdirSync(commandDir, { recursive: true });

  fs.writeFileSync(
    wherePath,
    `#!/bin/sh
set -eu
case "$1" in
  npm|npm.cmd)
    printf '\'"%s"\'\\n' "${npmPath}"
    ;;
  claude|claude.cmd)
    printf '\'"%s"\'\\n' "${claudePath}"
    ;;
  openspec|openspec.cmd)
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

  fs.writeFileSync(
    npmPath,
    `#!/bin/sh
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

  fs.chmodSync(wherePath, 0o755);
  fs.chmodSync(comSpecPath, 0o755);
  fs.chmodSync(npmPath, 0o755);
  fs.chmodSync(claudePath, 0o755);

  return {
    harnessDir,
    comSpecPath,
  };
};

test('renderHelp reflects the current CLI surface', () => {
  const help = renderHelp();

  assert.match(help, /setup/);
  assert.match(help, /validate-session/);
  assert.match(help, /validate-change/);
  assert.match(help, /instrumentation/);
  assert.doesNotMatch(help, /record-selection/);
  assert.doesNotMatch(help, /record-capability/);
  assert.doesNotMatch(help, /Internal monitoring helper option/);
  assert.doesNotMatch(help, /^\s*openspec\s+/m);
  assert.doesNotMatch(help, /change\s+Create an OpenSpec change scaffold/);
  assert.doesNotMatch(help, /proposal\s+Compatibility alias/);
  assert.doesNotMatch(help, /list-stacks/);
  assert.doesNotMatch(help, /use-stack/);
});

test('parseCliArgs parses current flags and rejects removed --openspec', () => {
  const parsed = parseCliArgs([
    'instrumentation',
    'enable',
    '--agents',
    'codex,claude',
    '--agent',
    'opencode',
    '--project-dir',
    'tmp/project',
    '--change-id',
    'add-auth',
    '--stage',
    'apply',
    '--strict',
  ]);

  assert.equal(parsed.command, 'instrumentation');
  assert.deepEqual(parsed.agents, ['codex', 'claude', 'opencode']);
  assert.equal(parsed.projectDir, path.resolve('tmp/project'));
  assert.equal(parsed.changeId, 'add-auth');
  assert.equal(parsed.stage, 'apply');
  assert.deepEqual(parsed.positional, ['enable']);
  assert.equal(parsed.strict, true);

  assert.throws(
    () => parseCliArgs(['bootstrap', '--openspec']),
    /`--openspec` has been removed/,
  );
});

test('syncProject refreshes adapters and preserves user-owned content', () => {
  const projectDir = makeTempProject();
  const agentsPath = path.join(projectDir, 'AGENTS.md');
  const claudePath = path.join(projectDir, 'CLAUDE.md');
  fs.writeFileSync(agentsPath, '# Project Notes\n\nKeep this section.\n', 'utf8');

  const output = syncProject({
    projectDir,
    agents: ['codex', 'claude', 'opencode'],
  });

  const agentsMd = fs.readFileSync(agentsPath, 'utf8');
  const claudeMd = fs.readFileSync(claudePath, 'utf8');
  assert.match(output, /Synced adapters: codex, claude, opencode/);
  assert.match(agentsMd, /PRAXIS_DEVOS_START/);
  assert.match(agentsMd, /Keep this section\./);
  assert.match(agentsMd, /Enter an OpenSpec proposal flow for medium or large changes, cross-module changes, interface or compatibility changes, architecture or process refactors/);
  assert.match(agentsMd, /native OpenSpec proposal flow has been executed through `\/opsx:propose` or `\/opsx:explore` plus native OpenSpec commands/);
  assert.match(agentsMd, /Inside OpenSpec, `opsx-explore`, `opsx-propose`, `opsx-apply`, and `opsx-archive` are the only visible workflow layer/);
  assert.match(agentsMd, /Superpowers may run only as embedded capabilities inside the active OpenSpec stage/);
  assert.match(agentsMd, /Do not re-announce `Using \[skill\]` or `superpowers:/);
  assert.match(agentsMd, /finish clarification and option comparison inside the current OpenSpec stage before implementation/);
  assert.match(agentsMd, /keep all parallel work, subtasks, outputs, and status under the current change/);
  assert.match(agentsMd, /OpenSpec \+ Superpowers Contract/);
  assert.match(agentsMd, /Stage Gates/);
  assert.match(agentsMd, /Capability execution is judged by evidence/);
  assert.doesNotMatch(agentsMd, /[\u4e00-\u9fff]/u);
  assert.doesNotMatch(agentsMd, /praxis-devos openspec/);
  assert.doesNotMatch(agentsMd, /显式加载 `superpowers:brainstorming`/);
  assert.doesNotMatch(agentsMd, /显式加载 `superpowers:writing-plans`/);
  assert.doesNotMatch(agentsMd, /`brainstorming` 方法/);
  assert.doesNotMatch(agentsMd, /brainstorming \/ writing-plans \/ debugging \/ verification/);
  assert.match(claudeMd, /PRAXIS_DEVOS_START/);
  assert.match(claudeMd, /^<!-- PRAXIS_DEVOS_START -->\n@AGENTS\.md/m);
  assert.match(claudeMd, /Claude Code 通过 `CLAUDE\.md` 读取项目指令/);
  assert.doesNotMatch(claudeMd, /Enter an OpenSpec proposal flow for medium or large changes, cross-module changes, interface or compatibility changes, architecture or process refactors/);
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

test('OpenSpec skills embed internal SuperPowers sub-skill invocation guidance without promoting a second visible workflow', () => {
  const propose = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'openspec-skills', 'opsx-propose', 'SKILL.md'),
    'utf8',
  );
  const apply = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'openspec-skills', 'opsx-apply', 'SKILL.md'),
    'utf8',
  );
  const archive = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'openspec-skills', 'opsx-archive', 'SKILL.md'),
    'utf8',
  );
  const explore = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'openspec-skills', 'opsx-explore', 'SKILL.md'),
    'utf8',
  );

  assert.match(propose, /^---\nname: opsx-propose\n/m);
  assert.match(apply, /^---\nname: opsx-apply\n/m);
  assert.match(archive, /^---\nname: opsx-archive\n/m);
  assert.match(explore, /^---\nname: opsx-explore\n/m);
  assert.match(propose, /## PRAXIS_DEVOS_OVERLAY/);
  assert.match(apply, /## PRAXIS_DEVOS_OVERLAY/);
  assert.match(archive, /## PRAXIS_DEVOS_OVERLAY/);
  assert.match(explore, /## PRAXIS_DEVOS_OVERLAY/);
  assert.match(propose, /invoke `brainstorming` internally/);
  assert.match(propose, /do not announce `Using brainstorming`/);
  assert.match(propose, /Embedded capability contract:/);
  assert.match(propose, /mode: embedded/);
  assert.match(propose, /pass the current flow type, current change id, current stage goal, current artifact locations, and current output constraints/);
  assert.match(apply, /invoke `writing-plans` internally/);
  assert.match(apply, /invoke `systematic-debugging` internally/);
  assert.match(apply, /invoke `subagent-driven-development` internally/);
  assert.match(apply, /invoke `verification-before-completion` internally/);
  assert.match(apply, /evidence_target: user-level Praxis state directory/);
  assert.doesNotMatch(apply, /record-selection/);
  assert.doesNotMatch(apply, /record-capability/);
  assert.match(apply, /pass the current flow type, current change id, current stage goal, current artifact locations, and current output constraints/);
  assert.match(archive, /invoke `verification-before-completion` internally/);
  assert.match(archive, /Embedded capability contract:/);
  assert.match(archive, /pass the current flow type, current change id, current stage goal, current artifact locations, and current output constraints/);
  assert.match(explore, /invoke `brainstorming` internally/);
  assert.match(explore, /mode: embedded/);
  assert.match(explore, /pass the current flow type, current stage goal, current artifact locations, and current output constraints/);
  assert.doesNotMatch(propose, /[\u4e00-\u9fff]/u);
  assert.doesNotMatch(apply, /[\u4e00-\u9fff]/u);
  assert.doesNotMatch(archive, /[\u4e00-\u9fff]/u);
  assert.doesNotMatch(explore, /[\u4e00-\u9fff]/u);
});

test('projectNativeSkills writes agent-native skills under the resolved user home with valid frontmatter', () => {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-projection-home-'));
  const logs = [];

  withEnv('HOME', fakeHome, () => {
    projectNativeSkills({
      projectDir: makeTempProject(),
      agents: ['codex', 'claude', 'opencode'],
      log: (msg) => logs.push(msg),
    });

    const projectedCodexSkill = fs.readFileSync(
      path.join(fakeHome, '.codex', 'skills', 'opsx-propose', 'SKILL.md'),
      'utf8',
    );
    const projectedClaudeSkill = fs.readFileSync(
      path.join(fakeHome, '.claude', 'skills', 'opsx-propose', 'SKILL.md'),
      'utf8',
    );
    const projectedOpenCodeSkill = fs.readFileSync(
      path.join(fakeHome, '.claude', 'skills', 'opsx-propose', 'SKILL.md'),
      'utf8',
    );

    assert.match(projectedCodexSkill, /^---\n[\s\S]*?\n---\n<!-- PRAXIS_PROJECTION /);
    assert.match(projectedClaudeSkill, /^---\n[\s\S]*?\n---\n<!-- PRAXIS_PROJECTION /);
    assert.match(projectedOpenCodeSkill, /^---\n[\s\S]*?\n---\n<!-- PRAXIS_PROJECTION /);
  });

  assert.match(logs.join('\n'), /Codex: projected opsx-propose/);
  assert.match(logs.join('\n'), /Claude: projected opsx-propose/);
  assert.match(logs.join('\n'), /OpenCode: projected opsx-propose/);
});

test('projectNativeSkills does not overwrite user-authored same-name skills without Praxis projection markers', () => {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-safe-projection-home-'));
  const customSkillPath = path.join(fakeHome, '.codex', 'skills', 'opsx-apply', 'SKILL.md');
  fs.mkdirSync(path.dirname(customSkillPath), { recursive: true });
  fs.writeFileSync(customSkillPath, '# user custom apply\n', 'utf8');
  const logs = [];

  withEnv('HOME', fakeHome, () => {
    projectNativeSkills({
      projectDir: makeTempProject(),
      agents: ['codex'],
      log: (msg) => logs.push(msg),
    });
  });

  assert.equal(fs.readFileSync(customSkillPath, 'utf8'), '# user custom apply\n');
  assert.match(logs.join('\n'), /skipped opsx-apply because .* is not a Praxis projection/);
});

test('initProject bootstraps openspec workspace through the detected runtime', () => {
  const projectDir = makeTempProject();
  installFakeOpenSpec(projectDir);

  const output = initProject({
    projectDir,
    agents: ['codex', 'opencode'],
  });

  assert.match(output, /openspec init completed \((global|project-local)\)/);
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'specs')));
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'archive')));
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'config.yaml')));
  assert.ok(fs.existsSync(path.join(projectDir, 'AGENTS.md')));
  assert.ok(fs.existsSync(path.join(projectDir, '.opencode', 'README.md')));
});

test('statusProject reports initialized state for the selected agents', () => {
  const projectDir = makeTempProject();
  installFakeOpenSpec(projectDir);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-opencode-ok-'));
  const globalConfigDir = path.join(fakeHome, '.config', 'opencode');
  fs.mkdirSync(globalConfigDir, { recursive: true });
  fs.writeFileSync(
    path.join(globalConfigDir, 'config.json'),
    JSON.stringify({ plugin: ['superpowers@git+https://github.com/obra/superpowers.git'] }, null, 2),
  );
  ensureOpenSpecWorkspace(projectDir);

  withEnv('HOME', fakeHome, () => {
    const output = statusProject({
      projectDir,
      agents: ['opencode'],
    });

    assert.match(output, /initialized: yes/);
    assert.match(output, /openspec: \[OK\]/);
    assert.match(output, /superpowers:opencode: \[OK\]/);
  });
});

test('bootstrapOpenSpec reports the detected runtime', () => {
  const projectDir = makeTempProject();
  installFakeOpenSpec(projectDir);

  const output = bootstrapOpenSpec({ projectDir });

  assert.match(output, /OpenSpec already available \((global|project-local)\)/);
  assert.match(output, /OpenSpec CLI directly from the same installation context/);
  assert.match(output, /openspec list --specs/);
  assert.doesNotMatch(output, /praxis-devos openspec/);
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
      agents: ['opencode', 'codex', 'claude'],
    });

    const config = readJson(globalConfigPath);
    const backups = listBackupFiles(globalConfigDir, 'config.json');
    assert.match(output, /== opencode ==/);
    assert.match(output, /== codex ==/);
    assert.match(output, /== claude ==/);
    assert.equal(config.theme, 'night');
    assert.ok(config.plugin.includes('existing-plugin'));
    assert.ok(config.plugin.some((entry) => entry.includes('praxis-devos')));
    assert.ok(config.plugin.some((entry) => entry.includes('github.com\/obra\/superpowers')));
    assert.equal(backups.length, 1);
  });
});

test('setupProject initializes the current structure for OpenCode without networked side effects', () => {
  const projectDir = makeTempProject();
  installFakeOpenSpec(projectDir);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-opencode-setup-'));

  withEnv('HOME', fakeHome, () => {
    const output = setupProject({
      projectDir,
      agents: ['opencode'],
    });

    const globalConfigPath = path.join(fakeHome, '.config', 'opencode', 'config.json');
    assert.match(output, /== openspec ==/);
    assert.match(output, /== opencode ==/);
    assert.match(output, /Configured OpenCode plugins in/);
    assert.match(output, /\[OK\] superpowers:opencode/);
    assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'archive')));
    assert.ok(fs.existsSync(path.join(projectDir, '.opencode', 'README.md')));
    assert.ok(fs.existsSync(globalConfigPath));
  });
});

test('setupProject preserves existing OpenCode plugins and top-level settings', () => {
  const projectDir = makeTempProject();
  installFakeOpenSpec(projectDir);
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

  withEnv('HOME', fakeHome, () => {
    setupProject({
      projectDir,
      agents: ['opencode'],
    });

    const config = readJson(globalConfigPath);
    assert.equal(config.theme, 'night');
    assert.equal(config.model, 'gpt-5');
    assert.ok(config.plugin.includes('existing-plugin'));
    assert.ok(config.plugin.includes('another-plugin'));
    assert.ok(config.plugin.some((entry) => entry.includes('praxis-devos')));
    assert.ok(config.plugin.some((entry) => entry.includes('github.com\/obra\/superpowers')));
  });
});

test('setupProject creates a backup before rewriting OpenCode config', () => {
  const projectDir = makeTempProject();
  installFakeOpenSpec(projectDir);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-opencode-backup-'));
  const globalConfigDir = path.join(fakeHome, '.config', 'opencode');
  const globalConfigPath = path.join(globalConfigDir, 'config.json');
  const original = JSON.stringify({ plugin: ['existing-plugin'] }, null, 2);
  fs.mkdirSync(globalConfigDir, { recursive: true });
  fs.writeFileSync(globalConfigPath, `${original}\n`, 'utf8');

  withEnv('HOME', fakeHome, () => {
    setupProject({
      projectDir,
      agents: ['opencode'],
    });

    const backups = listBackupFiles(globalConfigDir, 'config.json');
    assert.equal(backups.length, 1);
    assert.equal(fs.readFileSync(path.join(globalConfigDir, backups[0]), 'utf8'), `${original}\n`);
  });
});

test('setupProject does not overwrite unsafe OpenCode config', () => {
  const projectDir = makeTempProject();
  installFakeOpenSpec(projectDir);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-opencode-unsafe-'));
  const globalConfigDir = path.join(fakeHome, '.config', 'opencode');
  const globalConfigPath = path.join(globalConfigDir, 'config.json');
  const original = JSON.stringify({ plugin: { existing: true } }, null, 2);
  fs.mkdirSync(globalConfigDir, { recursive: true });
  fs.writeFileSync(globalConfigPath, `${original}\n`, 'utf8');

  withEnv('HOME', fakeHome, () => {
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
  });
});

test('setupProject leaves the live OpenCode config unchanged when atomic replace fails', () => {
  const projectDir = makeTempProject();
  installFakeOpenSpec(projectDir);
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
    withEnv('HOME', fakeHome, () => {
      assert.throws(
        () => setupProject({
          projectDir,
          agents: ['opencode'],
        }),
        /rename failed/i,
      );
    });
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

test('setupProject handles quoted Windows command paths with spaces during automatic installs', () => {
  const projectDir = makeTempProject();
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-win32-home-'));
  const { harnessDir, comSpecPath } = installFakeWindowsBatchRuntime({ homeDir: fakeHome, projectDir });

  withPlatform('win32', () => withEnv('HOME', fakeHome, () => withEnv('ComSpec', comSpecPath, () => withPrependedPath(harnessDir, () => {
    const output = setupProject({
      projectDir,
      agents: ['claude'],
    });

    assert.match(output, /Installed OpenSpec globally with npm \(user-level command\)/);
    assert.match(output, /Installed Claude SuperPowers with Claude Code CLI/);
    assert.ok(fs.existsSync(path.join(fakeHome, 'Program Files', 'nodejs', 'openspec.cmd')));
    assert.ok(fs.existsSync(path.join(fakeHome, '.claude', 'settings.json')));
  }))));
});

test('createChangeScaffold remains available as an internal scaffold helper', () => {
  const projectDir = makeTempProject();
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-evidence-home-'));
  ensureOpenSpecWorkspace(projectDir);

  const output = withEnv('HOME', fakeHome, () => createChangeScaffold({
    projectDir,
    title: 'Add Two Factor Auth',
    summary: 'Harden account access.',
  }));

  const changeDir = path.join(projectDir, 'openspec', 'changes', 'add-two-factor-auth');
  const evidencePath = withEnv('HOME', fakeHome, () => getCapabilityEvidencePath({
    projectDir,
    changeId: 'add-two-factor-auth',
  }));
  assert.match(output, /Created OpenSpec full change scaffold: add-two-factor-auth/);
  assert.match(output, /type: auto -> full/);
  assert.ok(fs.existsSync(path.join(changeDir, 'proposal.md')));
  assert.ok(fs.existsSync(path.join(changeDir, 'tasks.md')));
  assert.ok(fs.existsSync(path.join(changeDir, 'specs', 'two-factor-auth', 'spec.md')));
  assert.ok(fs.existsSync(evidencePath));
  assert.match(evidencePath, new RegExp(`^${fakeHome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
});

test('selectCapabilities chooses stage-appropriate embedded capabilities from signals', () => {
  const selection = selectCapabilities({
    stage: 'apply',
    signals: ['multi_step', 'behavior_change', 'completion_claim'],
  });

  assert.deepEqual(
    selection.selected.map((entry) => entry.id),
    ['writing-plans', 'test-driven-development', 'verification-before-completion'],
  );
  assert.ok(selection.skipped.some((entry) => entry.id === 'using-git-worktrees'));
  assert.ok(selection.skipped.some((entry) => entry.id === 'finishing-a-development-branch'));
});

test('validateChangeEvidence reports missing capability evidence and passes once evidence is complete', () => {
  const projectDir = makeTempProject();
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-validate-home-'));
  const changeId = 'add-auth';
  const evidencePath = withEnv('HOME', fakeHome, () => getCapabilityEvidencePath({ projectDir, changeId }));
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });

  const incompleteEvidence = {
    version: 1,
    changeId,
    stages: {
      apply: {
        signals: ['multi_step', 'behavior_change', 'completion_claim'],
        capabilities: {
          'writing-plans': {
            selected: true,
            reasons: ['multi_step'],
            evidence: {
              task_count: 4,
              files: ['src/core/praxis-devos.js'],
            },
          },
          'test-driven-development': {
            selected: true,
            reasons: ['behavior_change'],
            evidence: {
              failing_test: 'selector should choose TDD',
            },
          },
          'verification-before-completion': {
            selected: true,
            reasons: ['completion_claim'],
            evidence: {
              command: 'npm test',
              exit_code: 0,
              summary: 'tests pass',
            },
          },
        },
      },
    },
  };

  fs.writeFileSync(
    evidencePath,
    `${JSON.stringify(incompleteEvidence, null, 2)}\n`,
    'utf8',
  );

  const incomplete = withEnv('HOME', fakeHome, () => validateChangeEvidence({ projectDir, changeId, stage: 'apply' }));
  assert.match(incomplete, /status: needs-attention/);
  assert.match(incomplete, /Missing evidence field "verification_steps" for writing-plans/);
  assert.match(incomplete, /Missing evidence field "passing_test" for test-driven-development/);

  const completeEvidence = {
    ...incompleteEvidence,
    stages: {
      apply: {
        signals: ['multi_step', 'behavior_change', 'completion_claim'],
        capabilities: {
          'writing-plans': {
            selected: true,
            reasons: ['multi_step'],
            evidence: {
              task_count: 4,
              files: ['src/core/praxis-devos.js'],
              verification_steps: ['npm test -- --test-name-pattern capability'],
            },
          },
          'test-driven-development': {
            selected: true,
            reasons: ['behavior_change'],
            evidence: {
              failing_test: 'selector should choose TDD',
              passing_test: 'selector should choose TDD',
            },
          },
          'verification-before-completion': {
            selected: true,
            reasons: ['completion_claim'],
            evidence: {
              command: 'npm test',
              exit_code: 0,
              summary: 'tests pass',
            },
          },
        },
      },
    },
  };

  fs.writeFileSync(
    evidencePath,
    `${JSON.stringify(completeEvidence, null, 2)}\n`,
    'utf8',
  );

  const complete = withEnv('HOME', fakeHome, () => validateChangeEvidence({ projectDir, changeId, stage: 'apply' }));
  assert.match(complete, /status: pass/);
  assert.match(complete, /findings: none/);
});

test('capability evidence runtime APIs persist selection and merge stage evidence in user state', () => {
  const projectDir = makeTempProject();
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-runtime-home-'));
  const changeId = 'add-auth';

  withEnv('HOME', fakeHome, () => {
    const selection = recordCapabilitySelection({
      projectDir,
      changeId,
      stage: 'apply',
      signals: ['multi_step', 'behavior_change'],
    });

    assert.deepEqual(
      selection.selected.map((entry) => entry.id),
      ['writing-plans', 'test-driven-development'],
    );

    updateCapabilityEvidenceStage({
      projectDir,
      changeId,
      stage: 'apply',
      capabilities: {
        'writing-plans': {
          evidence: {
            task_count: 3,
            files: ['src/core/praxis-devos.js'],
            verification_steps: ['npm test'],
          },
        },
      },
    });

    updateCapabilityEvidenceStage({
      projectDir,
      changeId,
      stage: 'apply',
      capabilities: {
        'test-driven-development': {
          evidence: {
            failing_test: 'selection lacks TDD evidence',
            passing_test: 'selection now has TDD evidence',
          },
        },
      },
    });

    const persisted = readCapabilityEvidence({ projectDir, changeId }).value;
    assert.deepEqual(persisted.stages.apply.signals, ['multi_step', 'behavior_change']);
    assert.deepEqual(
      Object.keys(persisted.stages.apply.capabilities).sort(),
      ['test-driven-development', 'writing-plans'],
    );
    assert.equal(persisted.stages.apply.capabilities['writing-plans'].selected, true);
    assert.deepEqual(
      persisted.stages.apply.capabilities['writing-plans'].evidence.verification_steps,
      ['npm test'],
    );
    assert.equal(
      persisted.stages.apply.capabilities['test-driven-development'].evidence.passing_test,
      'selection now has TDD evidence',
    );
  });

  const report = withEnv('HOME', fakeHome, () => validateChangeEvidence({
    projectDir,
    changeId,
    stage: 'apply',
  }));
  assert.match(report, /status: pass/);
});

test('doctorProject reports current dependency status for OpenCode', () => {
  const projectDir = makeTempProject();
  installFakeOpenSpec(projectDir);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-opencode-missing-'));

  withEnv('HOME', fakeHome, () => {
    const output = doctorProject({
      projectDir,
      agents: ['opencode'],
    });

    assert.match(output, /Dependency doctor:/);
    assert.match(output, /\[OK\] openspec/);
    assert.match(output, /\[MISSING\] superpowers:opencode/);
    assert.match(output, /npx praxis-devos setup --agent opencode/);
  });
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

test('validateSessionTranscript rejects duplicate stage summaries or close-out recaps inside OpenSpec flow', () => {
  const invalidFile = path.join(
    PRAXIS_ROOT,
    'test',
    'fixtures',
    'transcripts',
    'duplicate-openspec-recap-session.md',
  );

  const report = validateSessionTranscript({ filePath: invalidFile });

  assert.match(report, /status: needs-attention/);
  assert.match(report, /Avoid duplicate stage summaries or close-out recaps inside OpenSpec flow/);
});

test('runCli routes help, validate-session, validate-change, and migrate but rejects openspec wrapper usage', () => {
  const projectDir = makeTempProject();
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-cli-home-'));
  installFakeOpenSpec(projectDir, 'CLI');
  ensureOpenSpecWorkspace(projectDir);
  const evidencePath = withEnv('HOME', fakeHome, () => getCapabilityEvidencePath({ projectDir, changeId: 'add-auth' }));
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.writeFileSync(
    evidencePath,
    `${JSON.stringify({
      version: 1,
      changeId: 'add-auth',
      stages: {
        apply: {
          signals: ['multi_step'],
          capabilities: {
            'writing-plans': {
              selected: true,
              reasons: ['multi_step'],
              evidence: {
                task_count: 2,
                files: ['src/core/praxis-devos.js'],
                verification_steps: ['npm test'],
              },
            },
          },
        },
      },
    }, null, 2)}\n`,
    'utf8',
  );

  const help = runCli([]);
  const validation = runCli([
    'validate-session',
    '--file',
    path.join(PRAXIS_ROOT, 'test', 'fixtures', 'transcripts', 'valid-session.md'),
  ]);
  const changeValidation = withEnv('HOME', fakeHome, () => runCli([
    'validate-change',
    '--project-dir',
    projectDir,
    '--change-id',
    'add-auth',
    '--stage',
    'apply',
  ]));
  const migration = runCli([
    'migrate',
    '--project-dir',
    projectDir,
    '--agent',
    'codex',
  ]);

  assert.match(help, /praxis-devos <command> \[options\]/);
  assert.match(validation, /status: pass/);
  assert.match(changeValidation, /status: pass/);
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

test('runCli instrumentation enable and disable only affect projected OpenSpec skills', () => {
  const projectDir = makeTempProject();
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-record-home-'));
  const customSkillDir = path.join(fakeHome, '.codex', 'skills', 'custom-skill');
  fs.mkdirSync(customSkillDir, { recursive: true });
  fs.writeFileSync(path.join(customSkillDir, 'SKILL.md'), '# custom\n', 'utf8');

  withEnv('HOME', fakeHome, () => {
    const enableReport = runCli([
      'instrumentation',
      'enable',
      '--project-dir',
      projectDir,
      '--agent',
      'codex',
    ]);

    const projectedApply = path.join(fakeHome, '.codex', 'skills', 'opsx-apply', 'SKILL.md');
    const projectedPropose = path.join(fakeHome, '.codex', 'skills', 'opsx-propose', 'SKILL.md');
    const customSkill = path.join(customSkillDir, 'SKILL.md');

    assert.match(enableReport, /Instrumentation enabled/);
    assert.match(fs.readFileSync(projectedApply, 'utf8'), /PRAXIS_MONITORING/);
    assert.match(fs.readFileSync(projectedPropose, 'utf8'), /PRAXIS_MONITORING/);
    assert.equal(fs.readFileSync(customSkill, 'utf8'), '# custom\n');

    const statusEnabled = runCli([
      'instrumentation',
      'status',
      '--agent',
      'codex',
    ]);
    assert.match(statusEnabled, /codex: enabled/);
    assert.match(statusEnabled, /opsx-apply: instrumented/);
    assert.match(statusEnabled, /opsx-propose: instrumented/);
    assert.match(statusEnabled, /opsx-explore: instrumented/);
    assert.match(statusEnabled, /opsx-archive: instrumented/);

    const disableReport = runCli([
      'instrumentation',
      'disable',
      '--project-dir',
      projectDir,
      '--agent',
      'codex',
    ]);

    assert.match(disableReport, /Instrumentation disabled/);
    assert.doesNotMatch(fs.readFileSync(projectedApply, 'utf8'), /PRAXIS_MONITORING/);
    assert.doesNotMatch(fs.readFileSync(projectedPropose, 'utf8'), /PRAXIS_MONITORING/);

    const statusDisabled = runCli([
      'instrumentation',
      'status',
      '--agent',
      'codex',
    ]);
    assert.match(statusDisabled, /codex: clean/);
    assert.match(statusDisabled, /opsx-apply: clean/);
    assert.match(statusDisabled, /opsx-propose: clean/);
    assert.match(statusDisabled, /opsx-explore: clean/);
    assert.match(statusDisabled, /opsx-archive: clean/);
  });
});
