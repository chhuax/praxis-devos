import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { injectMarker } from '../src/projection/markers.js';
import { collectBundledSkillSources } from '../src/projection/index.js';
import {
  getCapabilityEvidencePath,
  readCapabilityEvidence,
  recordCapabilitySelection,
  updateCapabilityEvidenceStage,
} from '../src/monitoring/state-store.js';

import {
  assessDocsRefreshNeed,
  PRAXIS_ROOT,
  analyzeSessionTranscript,
  bootstrapOpenSpec,
  buildDocsContextPack,
  buildOpenSpecDocsStageContext,
  bootstrapProject,
  buildDocsSubagentRequest,
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
  validateDocsGenerationResult,
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
  assert.match(help, /docs\s+Compatibility\/fallback init, refresh, or check for codemap\/surfaces artifacts/);
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

  const docsParsed = parseCliArgs([
    'docs',
    'check',
    '--project-dir',
    'tmp/project',
  ]);
  assert.equal(docsParsed.command, 'docs');
  assert.equal(docsParsed.projectDir, path.resolve('tmp/project'));
  assert.deepEqual(docsParsed.positional, ['check']);

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
  assert.match(agentsMd, /docs\/codemaps\//);
  assert.match(agentsMd, /docs\/surfaces\.yaml/);
  assert.match(agentsMd, /\/devos-docs-init/);
  assert.match(agentsMd, /\/devos-docs-refresh/);
  assert.doesNotMatch(agentsMd, /\/devos:docs-init/);
  assert.doesNotMatch(agentsMd, /\/devos:docs-refresh/);
  assert.match(agentsMd, /docs sub-agent/i);
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
  assert.ok(fs.existsSync(path.join(projectDir, 'docs', 'codemaps', 'project-overview.md')));
  assert.ok(fs.existsSync(path.join(projectDir, 'docs', 'surfaces.yaml')));
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
  assert.match(claudeInit, /mode=init/i);
  assert.match(claudeInit, /stable docs routing order/i);
  assert.match(opencodeRefresh, /^# devos-docs-refresh/m);
  assert.match(opencodeRefresh, /mode=refresh/i);
  assert.match(opencodeRefresh, /change-aware refresh context/i);

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

test('syncProject restores missing docs-lite files', () => {
  const projectDir = makeTempProject();

  syncProject({
    projectDir,
    agents: ['codex'],
  });

  const codemapPath = path.join(projectDir, 'docs', 'codemaps', 'project-overview.md');
  fs.rmSync(codemapPath);

  const output = syncProject({
    projectDir,
    agents: ['codex'],
  });

  assert.match(output, /Synced adapters: codex/);
  assert.ok(fs.existsSync(codemapPath));
});

test('injectMarker preserves YAML frontmatter at the top of projected skills', () => {
  const content = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'skills', 'opsx-propose', 'SKILL.md'),
    'utf8',
  );

  const projected = injectMarker(content, '<!-- PRAXIS_PROJECTION source=test version=0.4.1 -->');

  assert.match(projected, /^---\n[\s\S]*?\n---\n<!-- PRAXIS_PROJECTION /);
});

test('OpenSpec skills embed internal SuperPowers sub-skill invocation guidance without promoting a second visible workflow', () => {
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
  assert.match(propose, /invoke `brainstorming` internally/);
  assert.match(propose, /read the docs context pack before broad repository scanning/);
  assert.match(propose, /always `docs\/surfaces\.yaml`/);
  assert.match(propose, /do not announce `Using brainstorming`/);
  assert.match(propose, /Embedded capability contract:/);
  assert.match(propose, /mode: embedded/);
  assert.match(propose, /pass the current flow type, current change id, current stage goal, current artifact locations, and current output constraints/);
  assert.match(apply, /invoke `writing-plans` internally/);
  assert.match(apply, /build a docs context pack when project docs exist/);
  assert.match(apply, /deterministic docs refresh assessment/);
  assert.match(apply, /invoke `devos-docs` in `mode=refresh`/);
  assert.match(apply, /invoke `systematic-debugging` internally/);
  assert.match(apply, /invoke `subagent-driven-development` internally/);
  assert.match(apply, /invoke `verification-before-completion` internally/);
  assert.match(apply, /evidence_target: user-level Praxis state directory/);
  assert.doesNotMatch(apply, /record-selection/);
  assert.doesNotMatch(apply, /record-capability/);
  assert.match(apply, /pass the current flow type, current change id, current stage goal, current artifact locations, and current output constraints/);
  assert.match(archive, /invoke `verification-before-completion` internally/);
  assert.match(archive, /Before archive, run a deterministic docs refresh assessment/);
  assert.match(archive, /ensure `devos-docs` refresh has run or the workflow explicitly records why refresh is waived/);
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

test('devos-docs bundled skill defines mode-based AI-first docs generation guidance', () => {
  const docsSkill = fs.readFileSync(
    path.join(PRAXIS_ROOT, 'assets', 'skills', 'devos-docs', 'SKILL.md'),
    'utf8',
  );

  assert.match(docsSkill, /^---\nname: devos-docs\n/m);
  assert.match(docsSkill, /mode=init/);
  assert.match(docsSkill, /mode=refresh/);
  assert.match(docsSkill, /docs context pack/);
  assert.match(docsSkill, /change-aware refresh context/);
  assert.match(docsSkill, /contracts\/surfaces\.yaml/);
  assert.match(docsSkill, /docs\/codemaps\/project-overview\.md/);
});

test('collectBundledSkillSources discovers unified skill bundles by sourceDir', () => {
  const skillSources = collectBundledSkillSources();
  const propose = skillSources.find((entry) => entry.name === 'opsx-propose');
  const docs = skillSources.find((entry) => entry.name === 'devos-docs');

  assert.ok(propose);
  assert.ok(docs);
  assert.equal('sourcePath' in propose, false);
  assert.match(propose.sourceDir, /assets\/skills\/opsx-propose$/);
  assert.match(docs.sourceDir, /assets\/skills\/devos-docs$/);
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
  assert.ok(fs.existsSync(path.join(projectDir, 'docs', 'codemaps', 'project-overview.md')));
  assert.ok(fs.existsSync(path.join(projectDir, 'docs', 'surfaces.yaml')));
});

test('runCli docs init seeds the docs-lite skeleton without OpenSpec runtime', () => {
  const projectDir = makeTempProject();

  const output = runCli([
    'docs',
    'init',
    '--project-dir',
    projectDir,
  ]);

  assert.match(output, /docs-lite/i);
  const codemap = fs.readFileSync(path.join(projectDir, 'docs', 'codemaps', 'project-overview.md'), 'utf8');
  assert.match(codemap, /Primary surface: `public-interface`/);
  assert.match(codemap, /Surface location: `src\/index\.ts`/);
  assert.ok(fs.existsSync(path.join(projectDir, 'docs', 'surfaces.yaml')));
});

test('runCli docs check reports missing primary_surface and missing fields', () => {
  const projectDir = makeTempProject();
  const codemapPath = path.join(projectDir, 'docs', 'codemaps', 'project-overview.md');
  const surfacesPath = path.join(projectDir, 'docs', 'surfaces.yaml');

  fs.mkdirSync(path.dirname(codemapPath), { recursive: true });
  fs.mkdirSync(path.dirname(surfacesPath), { recursive: true });
  fs.writeFileSync(codemapPath, '# overview\n', 'utf8');
  fs.writeFileSync(
    surfacesPath,
    `surfaces:
  - id: public-sdk
    kind: sdk
`,
    'utf8',
  );

  const output = runCli([
    'docs',
    'check',
    '--project-dir',
    projectDir,
  ]);

  assert.match(output, /status: needs-attention/);
  assert.match(output, /primary_surface/);
  assert.match(output, /location/);
});

test('runCli docs check reports non-canonical surfaces path conflicts', () => {
  const projectDir = makeTempProject();
  const codemapPath = path.join(projectDir, 'docs', 'codemaps', 'project-overview.md');
  const canonicalSurfacesPath = path.join(projectDir, 'docs', 'surfaces.yaml');
  const nonCanonicalSurfacesPath = path.join(projectDir, 'contracts', 'surfaces.yaml');

  fs.mkdirSync(path.dirname(codemapPath), { recursive: true });
  fs.mkdirSync(path.dirname(canonicalSurfacesPath), { recursive: true });
  fs.mkdirSync(path.dirname(nonCanonicalSurfacesPath), { recursive: true });
  fs.writeFileSync(codemapPath, '# overview\n', 'utf8');
  fs.writeFileSync(
    canonicalSurfacesPath,
    `primary_surface: public-sdk

surfaces:
  - id: public-sdk
    kind: sdk
    location: src/index.ts
`,
    'utf8',
  );
  fs.writeFileSync(nonCanonicalSurfacesPath, 'primary_surface: duplicate\n', 'utf8');

  const output = runCli([
    'docs',
    'check',
    '--project-dir',
    projectDir,
  ]);

  assert.match(output, /status: needs-attention/);
  assert.match(output, /contracts\/surfaces\.yaml/);
  assert.match(output, /conflict/i);
});

test('runCli docs refresh populates codemap from project heuristics and preserves user notes', () => {
  const projectDir = makeTempProject();
  const srcDir = path.join(projectDir, 'src');
  const testDir = path.join(projectDir, 'test');
  const readmePath = path.join(projectDir, 'README.md');
  const packageJsonPath = path.join(projectDir, 'package.json');
  const codemapPath = path.join(projectDir, 'docs', 'codemaps', 'project-overview.md');
  const surfacesPath = path.join(projectDir, 'docs', 'surfaces.yaml');

  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(testDir, { recursive: true });
  fs.mkdirSync(path.dirname(codemapPath), { recursive: true });
  fs.mkdirSync(path.dirname(surfacesPath), { recursive: true });
  fs.writeFileSync(path.join(srcDir, 'index.ts'), 'export const ok = true;\n', 'utf8');
  fs.writeFileSync(path.join(testDir, 'app.test.js'), 'test("ok", () => {});\n', 'utf8');
  fs.writeFileSync(readmePath, '# Example\n', 'utf8');
  fs.writeFileSync(packageJsonPath, '{\n  "name": "example"\n}\n', 'utf8');
  fs.writeFileSync(
    codemapPath,
    `# Codemap: Project Overview

<!-- PRAXIS_DOCS_REFRESH_START -->
old
<!-- PRAXIS_DOCS_REFRESH_END -->

## User Notes

Keep this note.
`,
    'utf8',
  );
  fs.writeFileSync(
    surfacesPath,
    `primary_surface: public-sdk

surfaces:
  - id: public-sdk
    kind: sdk
    location: src/index.ts
    description: Public SDK entry.
`,
    'utf8',
  );

  const output = runCli([
    'docs',
    'refresh',
    '--project-dir',
    projectDir,
  ]);

  const codemap = fs.readFileSync(codemapPath, 'utf8');
  assert.match(output, /Refreshed docs-lite codemap/);
  assert.match(codemap, /Primary surface: `public-sdk`/);
  assert.match(codemap, /Surface kind: `sdk`/);
  assert.match(codemap, /Surface location: `src\/index\.ts`/);
  assert.match(codemap, /External surface changes: read `docs\/surfaces\.yaml`/);
  assert.match(codemap, /`README\.md`/);
  assert.match(codemap, /`src\/index\.ts`/);
  assert.match(codemap, /`test\/`/);
  assert.match(codemap, /Keep this note\./);
});

test('runCli docs refresh replaces fallback placeholder when codemap exists without managed markers', () => {
  const projectDir = makeTempProject();
  const srcDir = path.join(projectDir, 'src');
  const codemapPath = path.join(projectDir, 'docs', 'codemaps', 'project-overview.md');
  const surfacesPath = path.join(projectDir, 'docs', 'surfaces.yaml');

  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(path.dirname(codemapPath), { recursive: true });
  fs.mkdirSync(path.dirname(surfacesPath), { recursive: true });
  fs.writeFileSync(path.join(srcDir, 'index.ts'), 'export const ok = true;\n', 'utf8');
  fs.writeFileSync(
    codemapPath,
    `# Existing Overview

## User Notes

Keep this note.
`,
    'utf8',
  );
  fs.writeFileSync(
    surfacesPath,
    `primary_surface: public-sdk

surfaces:
  - id: public-sdk
    kind: sdk
    location: src/index.ts
`,
    'utf8',
  );

  runCli([
    'docs',
    'refresh',
    '--project-dir',
    projectDir,
  ]);

  const codemap = fs.readFileSync(codemapPath, 'utf8');
  assert.match(codemap, /<!-- PRAXIS_DOCS_REFRESH_START -->/);
  assert.match(codemap, /Primary surface: `public-sdk`/);
  assert.doesNotMatch(codemap, /Praxis DevOS will refresh this block/);
  assert.match(codemap, /Keep this note\./);
});

test('runCli docs refresh generates recursive Maven module codemaps and docs check enforces coverage', () => {
  const projectDir = makeTempProject();
  const codemapPath = path.join(projectDir, 'docs', 'codemaps', 'project-overview.md');
  const surfacesPath = path.join(projectDir, 'docs', 'surfaces.yaml');
  const rootPomPath = path.join(projectDir, 'pom.xml');
  const platformPomDir = path.join(projectDir, 'platform');
  const servicePomDir = path.join(platformPomDir, 'service-a');
  const sdkPomDir = path.join(projectDir, 'sdk');

  fs.mkdirSync(servicePomDir, { recursive: true });
  fs.mkdirSync(sdkPomDir, { recursive: true });
  fs.mkdirSync(path.dirname(codemapPath), { recursive: true });
  fs.mkdirSync(path.dirname(surfacesPath), { recursive: true });

  fs.writeFileSync(
    rootPomPath,
    `<project>
  <modelVersion>4.0.0</modelVersion>
  <artifactId>root</artifactId>
  <modules>
    <module>platform</module>
    <module>sdk</module>
  </modules>
</project>
`,
    'utf8',
  );
  fs.writeFileSync(
    path.join(platformPomDir, 'pom.xml'),
    `<project>
  <modelVersion>4.0.0</modelVersion>
  <artifactId>platform</artifactId>
  <modules>
    <module>service-a</module>
  </modules>
</project>
`,
    'utf8',
  );
  fs.writeFileSync(
    path.join(servicePomDir, 'pom.xml'),
    `<project>
  <modelVersion>4.0.0</modelVersion>
  <artifactId>service-a</artifactId>
</project>
`,
    'utf8',
  );
  fs.writeFileSync(
    path.join(sdkPomDir, 'pom.xml'),
    `<project>
  <modelVersion>4.0.0</modelVersion>
  <artifactId>sdk</artifactId>
</project>
`,
    'utf8',
  );
  fs.writeFileSync(
    surfacesPath,
    `primary_surface: public-sdk

surfaces:
  - id: public-sdk
    kind: sdk
    location: sdk/src/main/java
`,
    'utf8',
  );

  runCli([
    'docs',
    'refresh',
    '--project-dir',
    projectDir,
  ]);

  const moduleMapPath = path.join(projectDir, 'docs', 'codemaps', 'module-map.md');
  const platformModulePath = path.join(projectDir, 'docs', 'codemaps', 'modules', 'platform.md');
  const serviceModulePath = path.join(projectDir, 'docs', 'codemaps', 'modules', 'service-a.md');
  const sdkModulePath = path.join(projectDir, 'docs', 'codemaps', 'modules', 'sdk.md');

  assert.ok(fs.existsSync(moduleMapPath));
  assert.ok(fs.existsSync(platformModulePath));
  assert.ok(fs.existsSync(serviceModulePath));
  assert.ok(fs.existsSync(sdkModulePath));
  assert.match(fs.readFileSync(moduleMapPath, 'utf8'), /platform/);
  assert.match(fs.readFileSync(moduleMapPath, 'utf8'), /service-a/);
  assert.match(fs.readFileSync(moduleMapPath, 'utf8'), /sdk/);

  fs.rmSync(serviceModulePath);

  const checkOutput = runCli([
    'docs',
    'check',
    '--project-dir',
    projectDir,
  ]);

  assert.match(checkOutput, /status: needs-attention/);
  assert.match(checkOutput, /docs\/codemaps\/modules\/service-a\.md/);
});

test('buildDocsSubagentRequest packages deterministic init and refresh context for host integration', () => {
  const projectDir = makeTempProject();
  fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(projectDir, 'docs', 'codemaps'), { recursive: true });
  fs.mkdirSync(path.join(projectDir, 'openspec', 'changes', 'add-auth'), { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'src', 'index.ts'), 'export const ok = true;\n', 'utf8');
  fs.writeFileSync(path.join(projectDir, 'docs', 'codemaps', 'project-overview.md'), '# Overview\n', 'utf8');
  fs.writeFileSync(
    path.join(projectDir, 'docs', 'surfaces.yaml'),
    `primary_surface: public-sdk

surfaces:
  - id: public-sdk
    kind: sdk
    location: src/index.ts
`,
    'utf8',
  );
  fs.writeFileSync(
    path.join(projectDir, 'openspec', 'changes', 'add-auth', 'proposal.md'),
    'Update the external surface for auth.\n',
    'utf8',
  );

  const initRequest = buildDocsSubagentRequest({ projectDir, mode: 'init' });
  const refreshRequest = buildDocsSubagentRequest({
    projectDir,
    mode: 'refresh',
    changeId: 'add-auth',
    changeArtifactPaths: [path.join(projectDir, 'openspec', 'changes', 'add-auth', 'proposal.md')],
    changedPaths: ['src/index.ts'],
    targetModuleHints: ['public-sdk'],
  });

  assert.equal(initRequest.schemaVersion, 1);
  assert.equal(initRequest.mode, 'init');
  assert.equal(refreshRequest.mode, 'refresh');
  assert.equal(initRequest.canonicalSurfacesPath, 'docs/surfaces.yaml');
  assert.deepEqual(
    initRequest.allowedTargets.slice(0, 3),
    [
      'docs/surfaces.yaml',
      'docs/codemaps/project-overview.md',
      'docs/codemaps/module-map.md',
    ],
  );
  assert.equal(initRequest.context.primarySurface, 'public-sdk');
  assert.equal(initRequest.context.primarySurfaceLocation, 'src/index.ts');
  assert.deepEqual(initRequest.docsContextPack.selectedPaths, [
    'docs/surfaces.yaml',
    'docs/codemaps/project-overview.md',
  ]);
  assert.equal(refreshRequest.refreshContext.changeId, 'add-auth');
  assert.deepEqual(refreshRequest.refreshContext.changedPaths, ['src/index.ts']);
  assert.deepEqual(
    refreshRequest.refreshContext.changeArtifactPaths,
    ['openspec/changes/add-auth/proposal.md'],
  );
  assert.deepEqual(refreshRequest.refreshContext.targetModuleHints, ['public-sdk']);
  assert.match(initRequest.readPaths.join('\n'), /docs\/surfaces\.yaml/);
});

test('buildDocsContextPack selects the default docs read set for non-module tasks', () => {
  const projectDir = makeTempProject();
  fs.mkdirSync(path.join(projectDir, 'docs', 'codemaps'), { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'docs', 'surfaces.yaml'), 'primary_surface: public-sdk\n', 'utf8');
  fs.writeFileSync(path.join(projectDir, 'docs', 'codemaps', 'project-overview.md'), '# Overview\n', 'utf8');

  const pack = buildDocsContextPack({ projectDir });

  assert.deepEqual(pack.selectedPaths, [
    'docs/surfaces.yaml',
    'docs/codemaps/project-overview.md',
  ]);
  assert.equal(pack.multiModule, false);
  assert.equal(pack.targetModule, null);
  assert.deepEqual(
    pack.routingMetadata.map((entry) => [entry.path, entry.route, entry.reason]),
    [
      ['docs/surfaces.yaml', 'default', 'canonical-surface'],
      ['docs/codemaps/project-overview.md', 'default', 'project-overview'],
    ],
  );
});

test('buildDocsContextPack routes multi-module docs to a targeted module only', () => {
  const projectDir = makeTempProject();
  const platformPomDir = path.join(projectDir, 'platform');
  const servicePomDir = path.join(platformPomDir, 'service-a');
  const sdkPomDir = path.join(projectDir, 'sdk');
  fs.mkdirSync(path.join(projectDir, 'docs', 'codemaps', 'modules'), { recursive: true });
  fs.mkdirSync(servicePomDir, { recursive: true });
  fs.mkdirSync(sdkPomDir, { recursive: true });
  fs.writeFileSync(
    path.join(projectDir, 'pom.xml'),
    `<project>
  <modules>
    <module>platform</module>
    <module>sdk</module>
  </modules>
</project>
`,
    'utf8',
  );
  fs.writeFileSync(
    path.join(platformPomDir, 'pom.xml'),
    `<project>
  <artifactId>platform</artifactId>
  <modules>
    <module>service-a</module>
  </modules>
</project>
`,
    'utf8',
  );
  fs.writeFileSync(path.join(servicePomDir, 'pom.xml'), '<project><artifactId>service-a</artifactId></project>', 'utf8');
  fs.writeFileSync(path.join(sdkPomDir, 'pom.xml'), '<project><artifactId>sdk</artifactId></project>', 'utf8');

  const targetedPack = buildDocsContextPack({
    projectDir,
    changedPaths: ['platform/service-a/src/main/java/App.java'],
  });
  const fallbackPack = buildDocsContextPack({
    projectDir,
    changedPaths: ['README.md'],
  });

  assert.deepEqual(targetedPack.selectedPaths, [
    'docs/surfaces.yaml',
    'docs/codemaps/project-overview.md',
    'docs/codemaps/module-map.md',
    'docs/codemaps/modules/service-a.md',
  ]);
  assert.equal(targetedPack.targetModule, 'service-a');
  assert.match(
    targetedPack.routingMetadata.find((entry) => entry.path === 'docs/codemaps/modules/service-a.md').reason,
    /changed-path:/,
  );

  assert.deepEqual(fallbackPack.selectedPaths, [
    'docs/surfaces.yaml',
    'docs/codemaps/project-overview.md',
    'docs/codemaps/module-map.md',
  ]);
  assert.equal(fallbackPack.targetModule, null);
  assert.ok(!fallbackPack.selectedPaths.some((entry) => entry.startsWith('docs/codemaps/modules/')));
});

test('assessDocsRefreshNeed uses deterministic signals for surface, topology, and no-op changes', () => {
  const projectDir = makeTempProject();
  const moduleDir = path.join(projectDir, 'platform', 'service-a');
  const changeDir = path.join(projectDir, 'openspec', 'changes', 'add-auth');
  fs.mkdirSync(path.join(projectDir, 'docs', 'codemaps'), { recursive: true });
  fs.mkdirSync(moduleDir, { recursive: true });
  fs.mkdirSync(changeDir, { recursive: true });
  fs.writeFileSync(
    path.join(projectDir, 'docs', 'surfaces.yaml'),
    `primary_surface: public-sdk

surfaces:
  - id: public-sdk
    kind: sdk
    location: src/index.ts
`,
    'utf8',
  );
  fs.writeFileSync(
    path.join(projectDir, 'pom.xml'),
    `<project>
  <modules>
    <module>platform/service-a</module>
  </modules>
</project>
`,
    'utf8',
  );
  fs.writeFileSync(path.join(moduleDir, 'pom.xml'), '<project><artifactId>service-a</artifactId></project>', 'utf8');
  fs.writeFileSync(path.join(changeDir, 'proposal.md'), 'This change updates the external surface and project map.\n', 'utf8');

  const surfaceAssessment = assessDocsRefreshNeed({
    projectDir,
    changedPaths: ['src/index.ts'],
  });
  const topologyAssessment = assessDocsRefreshNeed({
    projectDir,
    changedPaths: ['platform/service-a/pom.xml'],
  });
  const artifactAssessment = assessDocsRefreshNeed({
    projectDir,
    changeArtifactPaths: [path.join(changeDir, 'proposal.md')],
  });
  const noOpAssessment = assessDocsRefreshNeed({
    projectDir,
    changedPaths: ['test/app.test.js'],
  });

  assert.equal(surfaceAssessment.needed, true);
  assert.match(surfaceAssessment.reasons.join('\n'), /primary surface location/i);

  assert.equal(topologyAssessment.needed, true);
  assert.match(topologyAssessment.reasons.join('\n'), /module topology input/i);

  assert.equal(artifactAssessment.needed, true);
  assert.match(artifactAssessment.reasons.join('\n'), /change artifacts declare docs impact/i);

  assert.equal(noOpAssessment.needed, false);
  assert.deepEqual(noOpAssessment.reasons, []);
});

test('buildDocsContextPack and refresh assessment ignore change inputs outside the repository root', () => {
  const projectDir = makeTempProject();
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-outside-'));
  const outsideArtifact = path.join(outsideDir, 'proposal.md');
  fs.mkdirSync(path.join(projectDir, 'docs', 'codemaps'), { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'docs', 'surfaces.yaml'), 'primary_surface: public-sdk\n', 'utf8');
  fs.writeFileSync(path.join(projectDir, 'docs', 'codemaps', 'project-overview.md'), '# Overview\n', 'utf8');
  fs.writeFileSync(outsideArtifact, 'external surface\n', 'utf8');

  const contextPack = buildDocsContextPack({
    projectDir,
    changedPaths: ['../../outside/file.ts'],
    changeArtifactPaths: [outsideArtifact],
  });
  const assessment = assessDocsRefreshNeed({
    projectDir,
    changedPaths: ['../../outside/file.ts'],
    changeArtifactPaths: [outsideArtifact],
  });

  assert.deepEqual(contextPack.changedPaths, []);
  assert.deepEqual(contextPack.changeArtifactPaths, []);
  assert.equal(assessment.needed, false);
  assert.deepEqual(assessment.reasons, []);
});

test('buildOpenSpecDocsStageContext applies docs routing and refresh assessment at the correct stages', () => {
  const projectDir = makeTempProject();
  const changeDir = path.join(projectDir, 'openspec', 'changes', 'add-auth');
  fs.mkdirSync(path.join(projectDir, 'docs', 'codemaps'), { recursive: true });
  fs.mkdirSync(changeDir, { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'docs', 'surfaces.yaml'), 'primary_surface: public-sdk\n', 'utf8');
  fs.writeFileSync(path.join(projectDir, 'docs', 'codemaps', 'project-overview.md'), '# Overview\n', 'utf8');
  fs.writeFileSync(path.join(changeDir, 'proposal.md'), 'Update project map for auth.\n', 'utf8');

  const proposeStage = buildOpenSpecDocsStageContext({
    projectDir,
    stage: 'propose',
    changeId: 'add-auth',
    changeArtifactPaths: [path.join(changeDir, 'proposal.md')],
  });
  const applyStage = buildOpenSpecDocsStageContext({
    projectDir,
    stage: 'apply',
    changeId: 'add-auth',
    changedPaths: ['docs/surfaces.yaml'],
    changeArtifactPaths: [path.join(changeDir, 'proposal.md')],
  });
  const archiveStage = buildOpenSpecDocsStageContext({
    projectDir,
    stage: 'archive',
    changeId: 'add-auth',
    changedPaths: ['docs/surfaces.yaml'],
    changeArtifactPaths: [path.join(changeDir, 'proposal.md')],
  });

  assert.deepEqual(proposeStage.docsContextPack.selectedPaths, [
    'docs/surfaces.yaml',
    'docs/codemaps/project-overview.md',
  ]);
  assert.equal(proposeStage.refreshAssessment, null);

  assert.ok(applyStage.docsContextPack);
  assert.equal(applyStage.refreshAssessment.needed, true);
  assert.equal(applyStage.shouldRunRefreshAssessment, true);

  assert.equal(archiveStage.docsContextPack, null);
  assert.equal(archiveStage.refreshAssessment.needed, true);
  assert.equal(archiveStage.shouldRunRefreshAssessment, true);
});

test('validateDocsGenerationResult rejects invalid docs AI output contracts before writeback', () => {
  const projectDir = makeTempProject();
  fs.mkdirSync(path.join(projectDir, 'docs'), { recursive: true });
  fs.writeFileSync(
    path.join(projectDir, 'docs', 'surfaces.yaml'),
    `primary_surface: public-sdk

surfaces:
  - id: public-sdk
    kind: sdk
    location: src/index.ts
`,
    'utf8',
  );

  const invalid = validateDocsGenerationResult({
    projectDir,
    result: {
      schemaVersion: 2,
      mode: 'rewrite',
      surfacesYaml: '   ',
      codemaps: [
        { path: 'docs/codemaps/project-overview.md', content: '', action: 'upsert' },
        { path: 'docs/codemaps/project-overview.md', content: 'duplicate', action: 'upsert' },
        { path: 'contracts/surfaces.yaml', content: 'invalid', action: 'upsert' },
      ],
    },
  });

  assert.equal(invalid.status, 'invalid');
  assert.match(invalid.findings.join('\n'), /schemaVersion/i);
  assert.match(invalid.findings.join('\n'), /mode/i);
  assert.match(invalid.findings.join('\n'), /surfacesYaml/i);
  assert.match(invalid.findings.join('\n'), /duplicate/i);
  assert.match(invalid.findings.join('\n'), /contracts\/surfaces\.yaml/);
});

test('validateDocsGenerationResult rejects duplicate module names and sanitizes unsafe artifactIds in module targets', () => {
  const projectDir = makeTempProject();
  fs.mkdirSync(path.join(projectDir, 'docs'), { recursive: true });
  fs.writeFileSync(
    path.join(projectDir, 'docs', 'surfaces.yaml'),
    `primary_surface: public-sdk

surfaces:
  - id: public-sdk
    kind: sdk
    location: modules/a/src/index.ts
`,
    'utf8',
  );
  fs.mkdirSync(path.join(projectDir, 'modules', 'a'), { recursive: true });
  fs.mkdirSync(path.join(projectDir, 'modules', 'b'), { recursive: true });
  fs.writeFileSync(
    path.join(projectDir, 'pom.xml'),
    `<project>
  <modules>
    <module>modules/a</module>
    <module>modules/b</module>
  </modules>
</project>
`,
    'utf8',
  );
  fs.writeFileSync(
    path.join(projectDir, 'modules', 'a', 'pom.xml'),
    `<project><artifactId>../evil</artifactId></project>`,
    'utf8',
  );
  fs.writeFileSync(
    path.join(projectDir, 'modules', 'b', 'pom.xml'),
    `<project><artifactId>evil</artifactId></project>`,
    'utf8',
  );

  const result = validateDocsGenerationResult({
    projectDir,
    result: {
      schemaVersion: 1,
      mode: 'refresh',
      surfacesYaml: 'primary_surface: public-sdk',
      codemaps: [
        { path: 'docs/codemaps/project-overview.md', content: '# ok', action: 'upsert' },
        { path: 'docs/codemaps/module-map.md', content: '# modules', action: 'upsert' },
        { path: 'docs/codemaps/modules/evil.md', content: '# module', action: 'upsert' },
      ],
    },
  });

  assert.equal(result.status, 'invalid');
  assert.match(result.findings.join('\n'), /Duplicate module codemap name detected: evil/);
  assert.ok(result.allowedTargets.includes('docs/codemaps/modules/evil.md'));
  assert.ok(!result.allowedTargets.some((entry) => entry.includes('..')));
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
  const fakeOpenSpec = installFakeOpenSpec(projectDir, 'CLI');
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
  const migration = withPrependedPath(fakeOpenSpec.globalBinDir, () => runCli([
    'migrate',
    '--project-dir',
    projectDir,
    '--agent',
    'codex',
  ]));

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
