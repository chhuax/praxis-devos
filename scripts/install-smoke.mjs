#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const WINDOWS_BATCH_EXTENSIONS = new Set(['.cmd', '.bat']);

const quoteWindowsArg = (value) => {
  if (value.length === 0) {
    return '""';
  }

  const escaped = value.replace(/"/g, '""');
  return /[\s"&()<>^|]/.test(value) ? `"${escaped}"` : escaped;
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
    return { agent: 'claude', strictDoctor: false };
  }
  throw new Error(`Unsupported scenario: ${scenario}`);
};

const localOpenSpecPath = (projectDir) => path.join(
  projectDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'openspec.cmd' : 'openspec',
);

const runSmoke = ({ packageFile, scenario }) => {
  const { agent, strictDoctor } = scenarioConfig(scenario);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `praxis-devos-${scenario}-smoke-`));
  const projectDir = path.join(tempRoot, 'project');
  const fakeHome = path.join(tempRoot, 'home');

  fs.mkdirSync(projectDir, { recursive: true });
  fs.mkdirSync(fakeHome, { recursive: true });

  const env = {
    ...process.env,
    HOME: fakeHome,
    USERPROFILE: fakeHome,
  };

  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  runCommand(npmCmd, ['init', '-y'], { cwd: projectDir, env });
  runCommand(npmCmd, ['install', '-D', packageFile], { cwd: projectDir, env });

  const setupResult = runCommand(npxCmd, ['praxis-devos', 'setup', '--agent', agent, '--stack', 'java-spring'], {
    cwd: projectDir,
    env,
  });
  const secondSetupResult = runCommand(npxCmd, ['praxis-devos', 'setup', '--agent', agent, '--stack', 'java-spring'], {
    cwd: projectDir,
    env,
  });

  assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'manifest.json')));
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec')));
  assert.ok(fs.existsSync(path.join(projectDir, '.praxis', 'skills', 'INDEX.md')));

  const openspecPath = localOpenSpecPath(projectDir);
  assert.ok(
    fs.existsSync(openspecPath) || /OpenSpec already available \(global\)/.test(setupResult.stdout),
    `Expected a project-local OpenSpec install or an acknowledged global runtime.\n${setupResult.stdout}`,
  );

  if (scenario === 'codex') {
    const codexSkillsPath = path.join(fakeHome, '.agents', 'skills', 'superpowers');
    assert.ok(fs.existsSync(codexSkillsPath), `Expected Codex skills path at ${codexSkillsPath}`);
    assert.match(setupResult.stdout, /== codex ==/);
    assert.doesNotMatch(setupResult.stdout, /\[MISSING\] superpowers:codex/);
    assert.match(secondSetupResult.stdout, /Codex SuperPowers/);

    const doctor = runCommand(npxCmd, ['praxis-devos', 'doctor', '--strict', '--agent', 'codex'], {
      cwd: projectDir,
      env,
    });
    assert.match(doctor.stdout, /\[OK\] superpowers:codex/);
    return;
  }

  if (scenario === 'opencode') {
    const configPath = path.join(projectDir, 'opencode.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.ok(Array.isArray(config.plugin));
    assert.ok(config.plugin.some((entry) => entry.includes('praxis-devos')));
    assert.ok(config.plugin.some((entry) => entry.includes('github.com/obra/superpowers')));

    const doctor = runCommand(npxCmd, ['praxis-devos', 'doctor', '--strict', '--agent', 'opencode'], {
      cwd: projectDir,
      env,
    });
    assert.match(doctor.stdout, /\[OK\] superpowers:opencode/);
    return;
  }

  assert.match(setupResult.stdout, /Manual action required: Claude Code SuperPowers cannot be installed automatically from Praxis/);
  assert.match(setupResult.stdout, /\/plugin install superpowers@claude-plugins-official/);
  assert.match(secondSetupResult.stdout, /Manual action required/);

  const doctor = runCommand(npxCmd, ['praxis-devos', 'doctor', '--agent', 'claude'], {
    cwd: projectDir,
    env,
  });
  assert.match(doctor.stdout, /\[UNKNOWN\] superpowers:claude/);
  assert.equal(strictDoctor, false);
};

try {
  const parsed = parseArgs(process.argv.slice(2));
  runSmoke(parsed);
  console.log(`Install smoke passed for scenario: ${parsed.scenario}`);
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
