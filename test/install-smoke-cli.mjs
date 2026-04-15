#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildQuotedWindowsClaudeShim,
  buildQuotedWindowsNodeCmdWrapper,
  buildQuotedWindowsNpmShim,
} from './support/quoted-windows-smoke.mjs';

const WINDOWS_BATCH_EXTENSIONS = new Set(['.cmd', '.bat']);
const PROJECTED_PRAXIS_SKILLS = [
  'devos-change-docs',
  'devos-docs',
];

const PROJECTED_OPEN_SPEC_SKILL_ASSERTIONS = [
  {
    name: 'openspec-explore',
    mustInclude: [/owner_flow: openspec-explore/, /PRAXIS_DEVOS_OVERLAY_START/],
  },
  {
    name: 'openspec-propose',
    mustInclude: [/owner_flow: openspec-propose/, /当前唯一可见 flow 是 `openspec-propose`/],
  },
  {
    name: 'openspec-apply-change',
    mustInclude: [/owner_flow: openspec-apply-change/, /verification-before-completion/, /writing-plans/],
  },
  {
    name: 'openspec-archive-change',
    mustInclude: [/owner_flow: openspec-archive-change/, /verification-before-completion/],
  },
];

const ADOPTED_OPEN_SPEC_WORKFLOW_SKILL_PATTERN = /adopted OpenSpec workflow skill/i;

const quoteWindowsArg = (value) => {
  if (value.length === 0) {
    return '""';
  }

  const escaped = value.replace(/"/g, '""');
  return /[\s"&()<>^|]/.test(value) ? `"${escaped}"` : escaped;
};

const getPathKey = (env) => {
  if (Object.prototype.hasOwnProperty.call(env, 'PATH')) {
    return 'PATH';
  }
  if (Object.prototype.hasOwnProperty.call(env, 'Path')) {
    return 'Path';
  }
  return 'PATH';
};

const prependToPath = (env, entry) => {
  const pathKey = getPathKey(env);
  const currentPath = env[pathKey] || '';
  env[pathKey] = currentPath ? `${entry}${path.delimiter}${currentPath}` : entry;
};

const normalizeEol = (value) => value.replace(/\r\n/g, '\n');

const runCommand = (command, args, options = {}) => {
  const {
    cwd = process.cwd(),
    env = process.env,
    expectOk = true,
  } = options;

  const commandName = path.basename(command).toLowerCase();
  const isWindowsBatch = process.platform === 'win32'
    && (WINDOWS_BATCH_EXTENSIONS.has(path.extname(commandName)) || ['npm', 'npx'].includes(commandName));

  const result = isWindowsBatch
    ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', [command, ...args].map(quoteWindowsArg).join(' ')], {
      cwd,
      env,
      encoding: 'utf8',
    })
    : spawnSync(command, args, {
      cwd,
      env,
      encoding: 'utf8',
    });

  const stdout = result.stdout?.trim() || '';
  const stderr = result.stderr?.trim() || '';
  if (expectOk && result.status !== 0) {
    throw new Error([
      `Command failed: ${command} ${args.join(' ')}`.trim(),
      `cwd: ${cwd}`,
      stdout ? `stdout:\n${stdout}` : null,
      stderr ? `stderr:\n${stderr}` : null,
    ].filter(Boolean).join('\n\n'));
  }

  return { status: result.status ?? 0, stdout, stderr };
};

const parseArgs = (argv) => {
  const args = [...argv];
  const parsed = {
    packageFile: '',
    scenario: '',
    commandPathMode: 'normal',
  };

  while (args.length > 0) {
    const token = args.shift();
    if (token === '--package') {
      parsed.packageFile = args.shift() || '';
      continue;
    }
    if (token === '--scenario') {
      parsed.scenario = args.shift() || '';
      continue;
    }
    if (token === '--command-path-mode') {
      parsed.commandPathMode = args.shift() || '';
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!parsed.packageFile) {
    throw new Error('Missing `--package <path>`.');
  }
  if (!parsed.scenario) {
    throw new Error('Missing `--scenario <codex|opencode|claude|copilot>`.');
  }
  if (!['normal', 'quoted-windows-space'].includes(parsed.commandPathMode)) {
    throw new Error('Invalid `--command-path-mode`. Use `normal` or `quoted-windows-space`.');
  }

  return parsed;
};

const scenarioConfig = (scenario) => {
  if (scenario === 'codex') {
    return { agent: 'codex', strictDoctor: true };
  }
  if (scenario === 'opencode') {
    return { agent: 'opencode', strictDoctor: true };
  }
  if (scenario === 'claude') {
    return { agent: 'claude', strictDoctor: true };
  }
  if (scenario === 'copilot') {
    return { agent: 'copilot', strictDoctor: true };
  }
  throw new Error(`Unsupported scenario: ${scenario}`);
};

const localOpenSpecPath = (projectDir) => path.join(
  projectDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'openspec.cmd' : 'openspec',
);

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

const assertProjectedCodexSkills = (fakeHome) => {
  const skillsRoot = path.join(fakeHome, '.codex', 'skills');
  for (const name of PROJECTED_PRAXIS_SKILLS) {
    assert.ok(
      fs.existsSync(path.join(skillsRoot, name, 'SKILL.md')),
      `Expected Codex projected skill at ${path.join(skillsRoot, name, 'SKILL.md')}`,
    );
  }
};

const assertProjectedOpenSpecSkillBodies = (skillsRoot) => {
  for (const { name } of PROJECTED_OPEN_SPEC_SKILL_ASSERTIONS) {
    assert.ok(
      fs.existsSync(path.join(skillsRoot, name, 'SKILL.md')),
      `Expected adopted OpenSpec workflow skill at ${path.join(skillsRoot, name, 'SKILL.md')}`,
    );
  }

  for (const { name, mustInclude } of PROJECTED_OPEN_SPEC_SKILL_ASSERTIONS) {
    const skillPath = path.join(skillsRoot, name, 'SKILL.md');
    const skill = normalizeEol(fs.readFileSync(skillPath, 'utf8'));

    assert.match(skill, /^---\n[\s\S]*?\n---\n<!-- PRAXIS_PROJECTION /);
    assert.match(skill, new RegExp(`^name: ${name}$`, 'm'));
    assert.match(skill, /generatedBy: "1\.3\.0"/);

    for (const pattern of mustInclude) {
      assert.match(skill, pattern);
    }
  }
};

const assertOpenSpecWorkflowSkillProjectionState = ({ setupStdout, skillsRoot }) => {
  if (ADOPTED_OPEN_SPEC_WORKFLOW_SKILL_PATTERN.test(setupStdout)) {
    assertProjectedOpenSpecSkillBodies(skillsRoot);
    return;
  }

  for (const { name } of PROJECTED_OPEN_SPEC_SKILL_ASSERTIONS) {
    assert.equal(
      fs.existsSync(path.join(skillsRoot, name, 'SKILL.md')),
      false,
      `Did not expect OpenSpec workflow skill projection without project-local generated assets: ${path.join(skillsRoot, name, 'SKILL.md')}`,
    );
  }
};

const assertProjectedClaudeSkills = (fakeHome) => {
  const skillsRoot = path.join(fakeHome, '.claude', 'skills');
  for (const name of PROJECTED_PRAXIS_SKILLS) {
    assert.ok(
      fs.existsSync(path.join(skillsRoot, name, 'SKILL.md')),
      `Expected Claude projected skill at ${path.join(skillsRoot, name, 'SKILL.md')}`,
    );
  }
};

const assertProjectedOpenCodeSkills = (fakeHome) => {
  const skillsRoot = path.join(fakeHome, '.claude', 'skills');
  for (const name of PROJECTED_PRAXIS_SKILLS) {
    assert.ok(
      fs.existsSync(path.join(skillsRoot, name, 'SKILL.md')),
      `Expected OpenCode shared skill at ${path.join(skillsRoot, name, 'SKILL.md')}`,
    );
  }
};

const assertProjectedCopilotSkills = (fakeHome) => {
  const skillsRoot = path.join(fakeHome, '.claude', 'skills');
  for (const name of PROJECTED_PRAXIS_SKILLS) {
    assert.ok(
      fs.existsSync(path.join(skillsRoot, name, 'SKILL.md')),
      `Expected GitHub Copilot shared skill at ${path.join(skillsRoot, name, 'SKILL.md')}`,
    );
  }
};

const assertOpenSpecWorkspace = (projectDir) => {
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec')), 'Expected openspec/ workspace');
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'specs')), 'Expected openspec/specs');
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'archive')), 'Expected openspec/changes/archive');
};

const installFakeCodexSuperpowers = (fakeHome) => {
  const skillPath = path.join(fakeHome, '.codex', 'skills', 'superpowers', 'example', 'SKILL.md');
  fs.mkdirSync(path.dirname(skillPath), { recursive: true });
  fs.writeFileSync(
    skillPath,
    [
      '---',
      'name: superpowers-example',
      'description: Minimal fake Codex SuperPowers skill for install smoke.',
      '---',
      '',
      'Install smoke fixture.',
      '',
    ].join('\n'),
    'utf8',
  );
};

const installFakeClaude = (fakeHome) => {
  const binDir = path.join(fakeHome, 'fake-claude-bin');
  const scriptPath = path.join(binDir, process.platform === 'win32' ? 'claude.cmd' : 'claude');
  fs.mkdirSync(binDir, { recursive: true });

  if (process.platform === 'win32') {
    fs.writeFileSync(
      scriptPath,
      '@echo off\r\nnode "%~dp0\\\\claude-shim.cjs" %*\r\n',
    );
    fs.writeFileSync(
      path.join(binDir, 'claude-shim.cjs'),
      `const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
if (args[0] === 'plugin' && args[1] === 'install' && args[2] === 'superpowers@claude-plugins-official' && args[3] === '--scope' && args[4] === 'user') {
  const settingsPath = path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'settings.json');
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify({ enabledPlugins: ['superpowers@claude-plugins-official'] }, null, 2));
  process.stdout.write('installed\\n');
  process.exit(0);
}
process.stderr.write(\`unsupported claude invocation: \${args.join(' ')}\\n\`);
process.exit(1);
`,
    );
    return binDir;
  }

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

const installQuotedWindowsCommandWrappers = ({ tempRoot, fakeHome, env }) => {
  assert.equal(process.platform, 'win32', 'quoted-windows-space mode is only supported on Windows');

  const commandDir = path.join(tempRoot, 'Program Files', 'nodejs');
  const invocationLogPath = path.join(tempRoot, 'quoted-command-invocations.log');
  const diagnosticLogPath = path.join(tempRoot, 'quoted-command-diagnostics.log');
  const npmShimPath = path.join(commandDir, 'npm-shim.cjs');
  const claudeShimPath = path.join(commandDir, 'claude-shim.cjs');
  const npmCmdPath = path.join(commandDir, 'npm.cmd');
  const claudeCmdPath = path.join(commandDir, 'claude.cmd');
  const openspecCmdPath = path.join(tempRoot, 'project', 'node_modules', '.bin', 'openspec.cmd');
  const openspecShimPath = path.join(tempRoot, 'project', 'node_modules', '.bin', 'openspec-shim.cjs');

  fs.mkdirSync(commandDir, { recursive: true });

  fs.writeFileSync(
    npmShimPath,
    buildQuotedWindowsNpmShim({
      invocationLogPath,
      diagnosticLogPath,
      openspecCmdPath,
      openspecShimPath,
    }),
  );

  fs.writeFileSync(
    claudeShimPath,
    buildQuotedWindowsClaudeShim({
      fakeHome,
      invocationLogPath,
      diagnosticLogPath,
    }),
  );

  fs.writeFileSync(
    npmCmdPath,
    buildQuotedWindowsNodeCmdWrapper('npm-shim.cjs'),
  );

  fs.writeFileSync(
    claudeCmdPath,
    buildQuotedWindowsNodeCmdWrapper('claude-shim.cjs'),
  );

  prependToPath(env, commandDir);
  return {
    commandDir,
    diagnosticLogPath,
    invocationLogPath,
  };
};

const readOptionalFile = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch {
    return '';
  }
};

const appendQuotedWindowsDiagnostics = (message, quotedWindowsWrappers) => {
  if (!quotedWindowsWrappers) {
    return message;
  }

  const invocationLog = readOptionalFile(quotedWindowsWrappers.invocationLogPath);
  const diagnosticLog = readOptionalFile(quotedWindowsWrappers.diagnosticLogPath);
  return [
    message,
    invocationLog ? `wrapper invocations:\n${invocationLog}` : null,
    diagnosticLog ? `wrapper diagnostics:\n${diagnosticLog}` : null,
  ].filter(Boolean).join('\n\n');
};

const runSmoke = ({ packageFile, scenario, commandPathMode }) => {
  const { agent, strictDoctor } = scenarioConfig(scenario);
  const packagePath = path.resolve(packageFile);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `praxis-devos-${scenario}-smoke-`));
  const projectDir = path.join(tempRoot, 'project');
  const fakeHome = path.join(tempRoot, 'home');

  assert.ok(fs.existsSync(packagePath), `Package file not found: ${packagePath}`);

  fs.mkdirSync(projectDir, { recursive: true });
  fs.mkdirSync(fakeHome, { recursive: true });

  const env = {
    ...process.env,
    HOME: fakeHome,
    USERPROFILE: fakeHome,
  };

  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  if (scenario === 'claude') {
    const fakeClaudeBin = installFakeClaude(fakeHome);
    prependToPath(env, fakeClaudeBin);
  }
  if (scenario === 'codex') {
    installFakeCodexSuperpowers(fakeHome);
  }

  runCommand(npmCmd, ['init', '-y'], { cwd: projectDir, env });
  runCommand(npmCmd, ['install', '-D', packagePath], { cwd: projectDir, env });

  let quotedWindowsWrappers = null;
  if (commandPathMode === 'quoted-windows-space') {
    quotedWindowsWrappers = installQuotedWindowsCommandWrappers({ tempRoot, fakeHome, env });
  }

  let setupResult;
  try {
    setupResult = runCommand(npxCmd, ['praxis-devos', 'setup', '--agent', agent], {
      cwd: projectDir,
      env,
    });
  } catch (err) {
    throw new Error(
      appendQuotedWindowsDiagnostics(
        err instanceof Error ? err.message : String(err),
        quotedWindowsWrappers,
      ),
    );
  }
  const secondSetupResult = runCommand(npxCmd, ['praxis-devos', 'setup', '--agent', agent], {
    cwd: projectDir,
    env,
  });

  assertOpenSpecWorkspace(projectDir);
  assert.ok(
    fs.existsSync(localOpenSpecPath(projectDir))
    || /OpenSpec already available \(global\)/.test(setupResult.stdout)
    || /Installed OpenSpec globally with npm \(user-level command\)/.test(setupResult.stdout),
    `Expected project-local OpenSpec, existing global OpenSpec, or successful global OpenSpec install.\n${setupResult.stdout}`,
  );
  assert.match(secondSetupResult.stdout, /Project already initialized; refreshing selected agents and managed adapters\./);

  if (scenario === 'codex') {
    const codexSkillsPath = path.join(fakeHome, '.codex', 'skills', 'superpowers');
    assert.ok(fs.existsSync(path.join(projectDir, 'AGENTS.md')), `Expected AGENTS.md in ${projectDir}`);
    assert.ok(fs.existsSync(codexSkillsPath), `Expected Codex skills path at ${codexSkillsPath}`);
    assert.ok(findSkillMarkdown(codexSkillsPath), `Expected Codex SuperPowers content under ${codexSkillsPath}`);
    assertProjectedCodexSkills(fakeHome);
    assertOpenSpecWorkflowSkillProjectionState({
      setupStdout: setupResult.stdout,
      skillsRoot: path.join(fakeHome, '.codex', 'skills'),
    });
    assert.equal(fs.existsSync(path.join(fakeHome, '.codex', 'commands')), false);
    assert.match(setupResult.stdout, /== codex ==/);

    const doctor = runCommand(npxCmd, ['praxis-devos', 'doctor', '--strict', '--agent', 'codex'], {
      cwd: projectDir,
      env,
    });
    assert.match(doctor.stdout, /\[OK\] superpowers:codex/);
    assert.match(doctor.stdout, /\[OK\] projection:codex/);
    return;
  }

  if (scenario === 'opencode') {
    const configPath = path.join(fakeHome, '.config', 'opencode', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.ok(fs.existsSync(path.join(projectDir, '.opencode', 'README.md')));
    assert.ok(Array.isArray(config.plugin));
    assert.ok(config.plugin.some((entry) => entry.includes('praxis-devos')));
    assert.ok(config.plugin.some((entry) => entry.includes('github.com/obra/superpowers')));
    assertProjectedOpenCodeSkills(fakeHome);
    assertOpenSpecWorkflowSkillProjectionState({
      setupStdout: setupResult.stdout,
      skillsRoot: path.join(fakeHome, '.claude', 'skills'),
    });
    assert.ok(fs.existsSync(path.join(fakeHome, '.config', 'opencode', 'commands', 'devos-docs-init.md')));
    assert.ok(fs.existsSync(path.join(fakeHome, '.config', 'opencode', 'commands', 'devos-docs-refresh.md')));

    const doctor = runCommand(npxCmd, ['praxis-devos', 'doctor', '--strict', '--agent', 'opencode'], {
      cwd: projectDir,
      env,
    });
    assert.match(doctor.stdout, /\[OK\] superpowers:opencode/);
    return;
  }

  if (scenario === 'copilot') {
    assert.ok(fs.existsSync(path.join(projectDir, 'AGENTS.md')), `Expected AGENTS.md in ${projectDir}`);
    assert.equal(fs.existsSync(path.join(projectDir, 'CLAUDE.md')), false);
    assertProjectedCopilotSkills(fakeHome);
    assertOpenSpecWorkflowSkillProjectionState({
      setupStdout: setupResult.stdout,
      skillsRoot: path.join(fakeHome, '.claude', 'skills'),
    });
    assert.ok(fs.existsSync(path.join(fakeHome, '.claude', 'commands', 'devos-docs-init.md')));
    assert.ok(fs.existsSync(path.join(fakeHome, '.claude', 'commands', 'devos-docs-refresh.md')));
    assert.match(setupResult.stdout, /== copilot ==/);
    assert.match(setupResult.stdout, /no separate runtime dependency to install/i);

    const doctor = runCommand(npxCmd, ['praxis-devos', 'doctor', '--strict', '--agent', 'copilot'], {
      cwd: projectDir,
      env,
    });
    assert.match(doctor.stdout, /\[OK\] superpowers:copilot/);
    assert.match(doctor.stdout, /\[OK\] projection:copilot/);
    return;
  }

  assert.ok(fs.existsSync(path.join(projectDir, 'CLAUDE.md')), `Expected CLAUDE.md in ${projectDir}`);
  assertProjectedClaudeSkills(fakeHome);
  assertOpenSpecWorkflowSkillProjectionState({
    setupStdout: setupResult.stdout,
    skillsRoot: path.join(fakeHome, '.claude', 'skills'),
  });
  assert.ok(fs.existsSync(path.join(fakeHome, '.claude', 'commands', 'devos-docs-init.md')));
  assert.ok(fs.existsSync(path.join(fakeHome, '.claude', 'commands', 'devos-docs-refresh.md')));
  assert.match(setupResult.stdout, /Installed Claude SuperPowers with Claude Code CLI/);
  if (quotedWindowsWrappers) {
    const invocationLog = fs.readFileSync(quotedWindowsWrappers.invocationLogPath, 'utf8');
    const diagnostics = fs.readFileSync(quotedWindowsWrappers.diagnosticLogPath, 'utf8')
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    assert.match(invocationLog, /npm\.cmd/);
    assert.match(invocationLog, /claude\.cmd/);
    assert.ok(diagnostics.some((entry) => entry.command === 'npm.cmd'));
    assert.ok(diagnostics.some((entry) => entry.command === 'claude.cmd'));
    assert.ok(diagnostics.some((entry) => /Program Files[\\/]+nodejs[\\/]+npm-shim\.cjs$/i.test(entry.shimPath)));
    assert.ok(diagnostics.some((entry) => /Program Files[\\/]+nodejs[\\/]+claude-shim\.cjs$/i.test(entry.shimPath)));
  }

  const doctorArgs = ['praxis-devos', 'doctor', '--agent', 'claude'];
  if (strictDoctor) {
    doctorArgs.push('--strict');
  }
  const doctor = runCommand(npxCmd, doctorArgs, {
    cwd: projectDir,
    env,
  });
  assert.match(doctor.stdout, /\[OK\] superpowers:claude/);
  assert.match(doctor.stdout, /\[OK\] projection:claude/);
  assert.equal(strictDoctor, true);
};

try {
  if (process.argv.length <= 2) {
    process.exit(0);
  }

  const parsed = parseArgs(process.argv.slice(2));
  runSmoke(parsed);
  console.log(`Install smoke passed for scenario: ${parsed.scenario} (${parsed.commandPathMode})`);
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
