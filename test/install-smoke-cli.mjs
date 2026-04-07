#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const WINDOWS_BATCH_EXTENSIONS = new Set(['.cmd', '.bat']);
const PROJECTED_OPENSPEC_SKILLS = [
  'opsx-propose',
  'opsx-explore',
  'opsx-apply',
  'opsx-archive',
];

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
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!parsed.packageFile) {
    throw new Error('Missing `--package <path>`.');
  }
  if (!parsed.scenario) {
    throw new Error('Missing `--scenario <codex|opencode|claude>`.');
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
  for (const name of PROJECTED_OPENSPEC_SKILLS) {
    assert.ok(
      fs.existsSync(path.join(skillsRoot, name, 'SKILL.md')),
      `Expected Codex projected skill at ${path.join(skillsRoot, name, 'SKILL.md')}`,
    );
  }
};

const assertProjectedClaudeSkills = (fakeHome) => {
  const skillsRoot = path.join(fakeHome, '.claude', 'skills');
  for (const name of PROJECTED_OPENSPEC_SKILLS) {
    assert.ok(
      fs.existsSync(path.join(skillsRoot, name, 'SKILL.md')),
      `Expected Claude projected skill at ${path.join(skillsRoot, name, 'SKILL.md')}`,
    );
  }
};

const assertProjectedOpenCodeSkills = (fakeHome) => {
  const skillsRoot = path.join(fakeHome, '.claude', 'skills');
  for (const name of PROJECTED_OPENSPEC_SKILLS) {
    assert.ok(
      fs.existsSync(path.join(skillsRoot, name, 'SKILL.md')),
      `Expected OpenCode shared skill at ${path.join(skillsRoot, name, 'SKILL.md')}`,
    );
  }
};

const assertOpenSpecWorkspace = (projectDir) => {
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec')), 'Expected openspec/ workspace');
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'specs')), 'Expected openspec/specs');
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'archive')), 'Expected openspec/changes/archive');
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

const runSmoke = ({ packageFile, scenario }) => {
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

  runCommand(npmCmd, ['init', '-y'], { cwd: projectDir, env });
  runCommand(npmCmd, ['install', '-D', packagePath], { cwd: projectDir, env });

  const setupResult = runCommand(npxCmd, ['praxis-devos', 'setup', '--agent', agent], {
    cwd: projectDir,
    env,
  });
  const secondSetupResult = runCommand(npxCmd, ['praxis-devos', 'setup', '--agent', agent], {
    cwd: projectDir,
    env,
  });

  assertOpenSpecWorkspace(projectDir);
  assert.ok(
    fs.existsSync(localOpenSpecPath(projectDir)) || /OpenSpec already available \(global\)/.test(setupResult.stdout),
    `Expected a project-local OpenSpec install or an acknowledged global runtime.\n${setupResult.stdout}`,
  );
  assert.match(secondSetupResult.stdout, /Project already initialized; refreshing selected agents and managed adapters\./);

  if (scenario === 'codex') {
    const codexSkillsPath = path.join(fakeHome, '.codex', 'skills', 'superpowers');
    assert.ok(fs.existsSync(path.join(projectDir, 'AGENTS.md')), `Expected AGENTS.md in ${projectDir}`);
    assert.ok(fs.existsSync(codexSkillsPath), `Expected Codex skills path at ${codexSkillsPath}`);
    assert.ok(findSkillMarkdown(codexSkillsPath), `Expected Codex SuperPowers content under ${codexSkillsPath}`);
    assertProjectedCodexSkills(fakeHome);
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

    const doctor = runCommand(npxCmd, ['praxis-devos', 'doctor', '--strict', '--agent', 'opencode'], {
      cwd: projectDir,
      env,
    });
    assert.match(doctor.stdout, /\[OK\] superpowers:opencode/);
    return;
  }

  assert.ok(fs.existsSync(path.join(projectDir, 'CLAUDE.md')), `Expected CLAUDE.md in ${projectDir}`);
  assertProjectedClaudeSkills(fakeHome);
  assert.match(setupResult.stdout, /Installed Claude SuperPowers with Claude Code CLI/);

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
  console.log(`Install smoke passed for scenario: ${parsed.scenario}`);
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
