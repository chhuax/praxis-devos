import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { injectMarker } from '../src/projection/markers.js';
import { collectBundledSkillSources } from '../src/projection/index.js';

import {
  PRAXIS_ROOT,
  bootstrapOpenSpec,
  bootstrapProject,
  doctorProject,
  initProject,
  parseCliArgs,
  projectNativeSkills,
  renderHelp,
  runCli,
  setupProject,
  statusProject,
  syncProject,
} from '../src/core/praxis-devos.js';
const releaseLibPath = path.join(PRAXIS_ROOT, 'scripts', 'release', 'lib.mjs');
const maintainerReleaseSkillPath = path.join(PRAXIS_ROOT, 'skills', 'maintainer-release', 'SKILL.md');
const releaseAssetsAvailable = fs.existsSync(releaseLibPath) && fs.existsSync(maintainerReleaseSkillPath);

const releaseLib = releaseAssetsAvailable
  ? await import('../scripts/release/lib.mjs')
  : null;

const RELEASE_STATE_FILE = releaseLib?.RELEASE_STATE_FILE;
const readVerifiedReleaseState = releaseLib?.readVerifiedReleaseState;
const runPublishRelease = releaseLib?.runPublishRelease;
const runVerifyRelease = releaseLib?.runVerifyRelease;
const writeVerifiedReleaseState = releaseLib?.writeVerifiedReleaseState;

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

const installFakeOpenSpec = (projectDir, label = 'GLOBAL') => {
  const binDir = path.join(projectDir, 'node_modules', '.bin');
  const scriptPath = path.join(binDir, 'openspec');
  const globalBinDir = path.join(projectDir, '.fake-global-bin');
  const globalScriptPath = path.join(globalBinDir, 'openspec');
  const scriptBody = `#!/bin/sh
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
`;
  fs.mkdirSync(binDir, { recursive: true });
  fs.mkdirSync(globalBinDir, { recursive: true });
  fs.writeFileSync(scriptPath, scriptBody, { mode: 0o755 });
  fs.writeFileSync(globalScriptPath, scriptBody, { mode: 0o755 });
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

const installFakeWindowsBatchRuntime = ({
  homeDir,
  projectDir,
  includeBrokenOpenSpecCandidate = false,
  includeExtensionlessOpenSpecCandidate = false,
}) => {
  const harnessDir = path.join(homeDir, 'fake-win-tools');
  const commandDir = path.join(homeDir, 'Program Files', 'nodejs');
  const npmPath = path.join(commandDir, 'npm.cmd');
  const claudePath = path.join(commandDir, 'claude.cmd');
  const globalOpenSpecNoExtPath = path.join(commandDir, 'openspec');
  const globalOpenSpecPath = path.join(commandDir, 'openspec.cmd');
  const comSpecPath = path.join(harnessDir, 'cmd.exe');
  const wherePath = path.join(harnessDir, 'where');
  const openspecPath = path.join(projectDir, 'node_modules', '.bin', 'openspec.cmd');

  fs.mkdirSync(harnessDir, { recursive: true });
  fs.mkdirSync(commandDir, { recursive: true });

  const brokenOpenSpecPath = path.join(homeDir, 'npm', 'prefix', 'openspec');

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
  assert.match(help, /^\s*init\s+/m);
  assert.match(help, /^\s*sync\s+/m);
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
    '--project-dir',
    'tmp/project',
    '--strict',
  ]);

  assert.equal(parsed.command, 'instrumentation');
  assert.deepEqual(parsed.agents, ['codex', 'claude', 'opencode']);
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
  assert.match(agentsMd, /docs\/surfaces\.yaml/);
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
      agents: ['claude', 'opencode', 'codex'],
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
  assert.equal(manifest.assets[path.join(fakeHome, '.claude', 'skills', 'devos-docs', 'SKILL.md')]?.type, 'skill');
  assert.match(
    manifest.assets[path.join(fakeHome, '.claude', 'skills', 'devos-docs', 'SKILL.md')]?.sourceDir || '',
    /assets\/skills\/devos-docs$/,
  );

  assert.match(logs.join('\n'), /Claude: projected docs command devos-docs-init/);
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

test('runCli sync refreshes managed user-level docs commands and skips user-owned same-name commands', () => {
  const projectDir = makeTempProject();
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-sync-home-'));
  const managedClaudeInitPath = path.join(fakeHome, '.claude', 'commands', 'devos-docs-init.md');
  const userOwnedClaudeRefreshPath = path.join(fakeHome, '.claude', 'commands', 'devos-docs-refresh.md');

  withEnv('HOME', fakeHome, () => {
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
      'sync',
      '--project-dir',
      projectDir,
      '--agent',
      'claude',
    ]);

    assert.match(output, /Claude: projected docs command devos-docs-init/);
    assert.match(output, /skipped docs command devos-docs-refresh/i);
    assert.match(fs.readFileSync(managedClaudeInitPath, 'utf8'), /^# devos-docs-init/m);
    assert.equal(fs.readFileSync(userOwnedClaudeRefreshPath, 'utf8'), '# user custom refresh command\n');
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
  const content = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'skills', 'opsx-propose', 'SKILL.md'),
    'utf8',
  );

  const projected = injectMarker(content, '<!-- PRAXIS_PROJECTION source=test version=0.4.1 -->');

  assert.match(projected, /^---\n[\s\S]*?\n---\n<!-- PRAXIS_PROJECTION /);
});

test('OpenSpec skill bundles keep expected names and overlay sections', () => {
  const propose = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'skills', 'opsx-propose', 'SKILL.md'),
    'utf8',
  );
  const apply = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'skills', 'opsx-apply', 'SKILL.md'),
    'utf8',
  );
  const archive = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'skills', 'opsx-archive', 'SKILL.md'),
    'utf8',
  );
  const explore = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'skills', 'opsx-explore', 'SKILL.md'),
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
});

test('devos-docs bundled skill declares supported modes', () => {
  const docsSkill = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'skills', 'devos-docs', 'SKILL.md'),
    'utf8',
  );

  assert.match(docsSkill, /^---\nname: devos-docs\n/m);
  assert.match(docsSkill, /mode=init/);
  assert.match(docsSkill, /mode=refresh/);
});

test('devos-change-docs bundled skill declares supported modes', () => {
  const docsSkill = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'skills', 'devos-change-docs', 'SKILL.md'),
    'utf8',
  );

  assert.match(docsSkill, /^---\nname: devos-change-docs\n/m);
  assert.match(docsSkill, /mode=change-blackbox/);
  assert.match(docsSkill, /mode=change-api/);
  assert.match(docsSkill, /mode=project-api-sync/);
});

test('collectBundledSkillSources discovers unified skill bundles by sourceDir', () => {
  const skillSources = collectBundledSkillSources();
  const propose = skillSources.find((entry) => entry.name === 'opsx-propose');
  const docs = skillSources.find((entry) => entry.name === 'devos-docs');
  const changeDocs = skillSources.find((entry) => entry.name === 'devos-change-docs');

  assert.ok(propose);
  assert.ok(docs);
  assert.ok(changeDocs);
  assert.equal('sourcePath' in propose, false);
  assert.match(propose.sourceDir, /assets\/skills\/opsx-propose$/);
  assert.match(docs.sourceDir, /assets\/skills\/devos-docs$/);
  assert.match(changeDocs.sourceDir, /assets\/skills\/devos-change-docs$/);
});

test('projectNativeSkills projects supporting files that live alongside SKILL.md', () => {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-bundle-home-'));
  const targetPath = path.join(fakeHome, '.codex', 'skills', 'opsx-propose', 'references', 'bundle-proof.txt');

  withEnv('HOME', fakeHome, () => {
    projectNativeSkills({
      projectDir: makeTempProject(),
      agents: ['codex'],
      log: () => {},
    });
  });

  assert.equal(fs.readFileSync(targetPath, 'utf8'), 'bundle-supporting-file\n');
});

test('maintainer release skill documents the repo-local verify and publish workflow', {
  skip: !releaseAssetsAvailable,
}, () => {
  const skill = fs.readFileSync(
    maintainerReleaseSkillPath,
    'utf8',
  );

  assert.match(skill, /^---\nname: maintainer-release\n/m);
  assert.match(skill, /verify mode/i);
  assert.match(skill, /publish mode/i);
  assert.match(skill, /release-order/i);
  assert.match(skill, /tag-order/i);
  assert.match(skill, /scripts\/release\/verify\.mjs/);
  assert.match(skill, /scripts\/release\/publish\.mjs/);
});

test('runVerifyRelease runs tests, pack, default smoke checks, and records release state', {
  skip: !releaseAssetsAvailable,
}, () => {
  const projectDir = makeTempProject();
  fs.writeFileSync(
    path.join(projectDir, 'package.json'),
    JSON.stringify({ name: 'praxis-devos', version: '0.4.9' }, null, 2),
    'utf8',
  );
  const calls = [];
  const fakeExec = (command, args) => {
    calls.push([command, args]);
    if (command === 'git' && args[0] === 'status') {
      return '';
    }
    if (command === 'npm' && args[0] === 'pack') {
      return JSON.stringify([{ filename: 'praxis-devos-0.4.9.tgz' }]);
    }
    return '';
  };

  const result = runVerifyRelease({
    cwd: projectDir,
    execFileSyncImpl: fakeExec,
    nowIso: '2026-04-09T12:00:00.000Z',
  });

  assert.equal(result.version, '0.4.9');
  assert.equal(result.tarballFile, 'praxis-devos-0.4.9.tgz');
  assert.equal(result.ready, true);
  assert.equal(result.workspaceClean, true);
  assert.deepEqual(
    calls,
    [
      ['git', ['status', '--short']],
      ['node', ['--test']],
      ['npm', ['pack', '--json']],
      ['node', ['test/install-smoke-cli.mjs', '--package', './praxis-devos-0.4.9.tgz', '--scenario', 'opencode']],
      ['node', ['test/install-smoke-cli.mjs', '--package', './praxis-devos-0.4.9.tgz', '--scenario', 'claude']],
    ],
  );

  const persisted = readVerifiedReleaseState({ cwd: projectDir });
  assert.equal(persisted.tarballFile, 'praxis-devos-0.4.9.tgz');
  assert.equal(persisted.generatedAt, '2026-04-09T12:00:00.000Z');
  assert.ok(fs.existsSync(path.join(projectDir, RELEASE_STATE_FILE)));
});

test('runPublishRelease refuses to run without explicit confirmation or a verified candidate', {
  skip: !releaseAssetsAvailable,
}, () => {
  const projectDir = makeTempProject();
  fs.writeFileSync(
    path.join(projectDir, 'package.json'),
    JSON.stringify({ name: 'praxis-devos', version: '0.4.9' }, null, 2),
    'utf8',
  );
  const calls = [];
  const fakeExec = (command, args) => {
    calls.push([command, args]);
    return '';
  };

  const missingConfirmation = runPublishRelease({
    cwd: projectDir,
    execFileSyncImpl: fakeExec,
  });
  assert.equal(missingConfirmation.ok, false);
  assert.match(missingConfirmation.summary, /release-order/i);
  assert.match(missingConfirmation.summary, /tag-order/i);

  const missingVerify = runPublishRelease({
    cwd: projectDir,
    releaseOrder: 'publish-first',
    tagOrder: 'after-publish',
    execFileSyncImpl: fakeExec,
  });
  assert.equal(missingVerify.ok, false);
  assert.match(missingVerify.summary, /run verify mode first/i);
  assert.deepEqual(calls, []);
});

test('runPublishRelease publishes the verified tarball and tags in declared order', {
  skip: !releaseAssetsAvailable,
}, () => {
  const projectDir = makeTempProject();
  fs.writeFileSync(
    path.join(projectDir, 'package.json'),
    JSON.stringify({ name: 'praxis-devos', version: '0.4.9' }, null, 2),
    'utf8',
  );
  writeVerifiedReleaseState({
    cwd: projectDir,
    state: {
      version: '0.4.9',
      tarballFile: 'praxis-devos-0.4.9.tgz',
      tarballPath: path.join(projectDir, 'praxis-devos-0.4.9.tgz'),
      generatedAt: '2026-04-09T12:00:00.000Z',
      checks: ['node --test', 'npm pack --json', 'smoke:opencode', 'smoke:claude'],
      ready: true,
    },
  });

  const calls = [];
  const fakeExec = (command, args) => {
    calls.push([command, args]);
    return '';
  };

  const result = runPublishRelease({
    cwd: projectDir,
    releaseOrder: 'publish-first',
    tagOrder: 'after-publish',
    execFileSyncImpl: fakeExec,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(
    calls,
    [
      ['npm', ['publish', path.join(projectDir, 'praxis-devos-0.4.9.tgz')]],
      ['git', ['tag', 'v0.4.9']],
      ['git', ['push', 'origin', 'v0.4.9']],
    ],
  );
});

test('projectNativeSkills projects host commands from the shared command asset root', () => {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-command-source-home-'));
  const sharedInit = fs.readFileSync(path.join(PRAXIS_ROOT, 'assets', 'commands', 'devos-docs-init.md'), 'utf8');
  const sharedRefresh = fs.readFileSync(path.join(PRAXIS_ROOT, 'assets', 'commands', 'devos-docs-refresh.md'), 'utf8');

  withEnv('HOME', fakeHome, () => {
    projectNativeSkills({
      projectDir: makeTempProject(),
      agents: ['claude', 'opencode'],
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
    const projectedCodexDocsSkill = fs.readFileSync(
      path.join(fakeHome, '.codex', 'skills', 'devos-docs', 'SKILL.md'),
      'utf8',
    );
    const projectedClaudeSkill = fs.readFileSync(
      path.join(fakeHome, '.claude', 'skills', 'opsx-propose', 'SKILL.md'),
      'utf8',
    );
    const projectedClaudeDocsSkill = fs.readFileSync(
      path.join(fakeHome, '.claude', 'skills', 'devos-docs', 'SKILL.md'),
      'utf8',
    );
    const projectedOpenCodeSkill = fs.readFileSync(
      path.join(fakeHome, '.claude', 'skills', 'opsx-propose', 'SKILL.md'),
      'utf8',
    );

    assert.match(projectedCodexSkill, /^---\n[\s\S]*?\n---\n<!-- PRAXIS_PROJECTION /);
    assert.match(projectedCodexDocsSkill, /^---\n[\s\S]*?\n---\n<!-- PRAXIS_PROJECTION /);
    assert.match(projectedClaudeSkill, /^---\n[\s\S]*?\n---\n<!-- PRAXIS_PROJECTION /);
    assert.match(projectedClaudeDocsSkill, /^---\n[\s\S]*?\n---\n<!-- PRAXIS_PROJECTION /);
    assert.match(projectedOpenCodeSkill, /^---\n[\s\S]*?\n---\n<!-- PRAXIS_PROJECTION /);
  });

  assert.match(logs.join('\n'), /Codex: projected opsx-propose/);
  assert.match(logs.join('\n'), /Codex: projected devos-docs/);
  assert.match(logs.join('\n'), /Claude: projected opsx-propose/);
  assert.match(logs.join('\n'), /Claude: projected devos-docs/);
  assert.match(logs.join('\n'), /OpenCode: projected opsx-propose/);
  assert.match(logs.join('\n'), /OpenCode: projected devos-docs/);
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

  const output = withEnv('PATH', '/usr/bin:/bin', () => initProject({
    projectDir,
    agents: ['codex', 'opencode'],
  }));

  assert.match(output, /openspec init completed \((global|project-local)\)/);
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'specs')));
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'archive')));
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'config.yaml')));
  assert.ok(fs.existsSync(path.join(projectDir, 'AGENTS.md')));
  assert.ok(fs.existsSync(path.join(projectDir, '.opencode', 'README.md')));
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

  const output = withEnv('PATH', '/usr/bin:/bin', () => bootstrapOpenSpec({ projectDir }));

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
    assert.match(output, /Configured OpenCode plugins in/);
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
    assert.ok(config.plugin.some((entry) => entry.includes('praxis-devos')));
    assert.ok(config.plugin.some((entry) => entry.includes('github.com\/obra\/superpowers')));
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

test('setupProject ignores invalid Windows where candidates for openspec', () => {
  const projectDir = makeTempProject();
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-win32-bad-where-home-'));
  const { harnessDir, comSpecPath } = installFakeWindowsBatchRuntime({
    homeDir: fakeHome,
    projectDir,
    includeBrokenOpenSpecCandidate: true,
  });

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

test('setupProject prefers Windows executable extension over extensionless openspec candidate', () => {
  const projectDir = makeTempProject();
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-win32-ext-priority-home-'));
  const { harnessDir, comSpecPath } = installFakeWindowsBatchRuntime({
    homeDir: fakeHome,
    projectDir,
    includeExtensionlessOpenSpecCandidate: true,
  });

  withPlatform('win32', () => withEnv('HOME', fakeHome, () => withEnv('ComSpec', comSpecPath, () => withPrependedPath(harnessDir, () => {
    const output = setupProject({
      projectDir,
      agents: ['opencode'],
    });

    assert.match(output, /OpenSpec CLI is available on PATH via .*openspec\.cmd/);
  }))));
});

test('doctorProject reports current dependency status for OpenCode', () => {
  const projectDir = makeTempProject();
  const fakeOpenSpec = installFakeOpenSpec(projectDir);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-opencode-missing-'));

  withEnv('HOME', fakeHome, () => withPrependedPath(fakeOpenSpec.globalBinDir, () => {
    const output = doctorProject({
      projectDir,
      agents: ['opencode'],
    });

    assert.match(output, /Dependency doctor:/);
    assert.match(output, /\[OK\] openspec/);
    assert.match(output, /\[MISSING\] superpowers:opencode/);
    assert.match(output, /npx praxis-devos setup --agent opencode/);
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
