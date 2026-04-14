import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildQuotedWindowsNpmShim } from './support/quoted-windows-smoke.mjs';

test('quoted windows npm shim installs a global openspec wrapper for setup smoke', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-quoted-npm-'));
  const projectDir = path.join(tempRoot, 'project');
  const invocationLogPath = path.join(tempRoot, 'quoted-command-invocations.log');
  const diagnosticLogPath = path.join(tempRoot, 'quoted-command-diagnostics.log');
  const shimPath = path.join(tempRoot, 'npm-shim.cjs');
  const openspecCmdPath = path.join(tempRoot, 'global-bin', 'openspec.cmd');
  const openspecShimPath = path.join(tempRoot, 'global-bin', 'openspec-shim.cjs');

  fs.mkdirSync(projectDir, { recursive: true });
  fs.writeFileSync(
    shimPath,
    buildQuotedWindowsNpmShim({
      invocationLogPath,
      diagnosticLogPath,
      openspecCmdPath,
      openspecShimPath,
    }),
  );

  const install = spawnSync(process.execPath, [shimPath, 'install', '-g', '@fission-ai/openspec'], {
    encoding: 'utf8',
  });

  assert.equal(install.status, 0, install.stderr);
  assert.equal(fs.readFileSync(invocationLogPath, 'utf8').trim(), 'npm.cmd install -g @fission-ai/openspec');
  const diagnostic = JSON.parse(fs.readFileSync(diagnosticLogPath, 'utf8').trim());
  assert.equal(diagnostic.command, 'npm.cmd');
  assert.equal(fs.realpathSync(diagnostic.shimPath), fs.realpathSync(shimPath));
  assert.ok(fs.existsSync(openspecCmdPath));
  assert.ok(fs.existsSync(openspecShimPath));

  const init = spawnSync(process.execPath, [openspecShimPath, 'init', projectDir, '--tools', 'none', '--force'], {
    encoding: 'utf8',
  });

  assert.equal(init.status, 0, init.stderr);
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'specs')));
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'archive')));
  assert.match(fs.readFileSync(path.join(projectDir, 'openspec', 'config.yaml'), 'utf8'), /# context:/);
});
