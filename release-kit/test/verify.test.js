import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runVerify } from '../scripts/verify.mjs';

test('runVerify writes verified state to repo root after checks pass', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-verify-root-'));
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-verify-work-'));

  fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify({
    name: 'praxis-devos',
    version: '0.6.1',
    'release-kit': {
      testCommand: 'node --test release-kit/test/*.test.js',
      smokeCommand: 'npm pack',
    },
  }, null, 2));

  fs.writeFileSync(path.join(workDir, 'CHANGELOG.md'), '# Changelog\n\n## [0.6.1] - 2026-04-11\n');

  const executed = [];
  const runCommand = ({ command, cwd }) => {
    executed.push({ command, cwd });
    if (command === 'npm pack') {
      return {
        stdout: 'praxis-devos-0.6.1.tgz\n',
      };
    }

    return { stdout: '' };
  };

  const result = runVerify({
    workDir,
    repoRoot,
    now: () => '2026-04-12T00:00:00.000Z',
    runCommand,
  });

  assert.deepEqual(result, {
    version: '0.6.1',
    tarballPath: path.join(workDir, 'praxis-devos-0.6.1.tgz'),
    checks: [
      'package-version',
      'changelog-entry',
      'test-command',
      'smoke-command',
    ],
    generatedAt: '2026-04-12T00:00:00.000Z',
    status: 'ready',
  });

  assert.deepEqual(executed, [
    { command: 'node --test release-kit/test/*.test.js', cwd: workDir },
    { command: 'npm pack', cwd: workDir },
  ]);

  const statePath = path.join(repoRoot, '.release-state.json');
  assert.ok(fs.existsSync(statePath));

  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  assert.deepEqual(state, result);
});

test('runVerify rejects when smoke command produces empty tarball name', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-verify-root-'));
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-verify-work-'));

  fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify({
    name: 'praxis-devos',
    version: '0.6.1',
    'release-kit': { testCommand: 'true', smokeCommand: 'echo' },
  }, null, 2));

  fs.writeFileSync(path.join(workDir, 'CHANGELOG.md'), '# Changelog\n\n## [0.6.1] - 2026-04-11\n');

  const runCommand = ({ command }) => {
    if (command === 'echo') {
      return { stdout: '\n' };
    }
    return { stdout: '' };
  };

  assert.throws(
    () => runVerify({ workDir, repoRoot, runCommand }),
    /smoke command did not produce a tarball filename/,
  );
});

test('runVerify rejects when smoke command produces non-.tgz filename', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-verify-root-'));
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-verify-work-'));

  fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify({
    name: 'praxis-devos',
    version: '0.6.1',
    'release-kit': { testCommand: 'true', smokeCommand: 'echo' },
  }, null, 2));

  fs.writeFileSync(path.join(workDir, 'CHANGELOG.md'), '# Changelog\n\n## [0.6.1] - 2026-04-11\n');

  const runCommand = ({ command }) => {
    if (command === 'echo') {
      return { stdout: 'some-random-output.zip\n' };
    }
    return { stdout: '' };
  };

  assert.throws(
    () => runVerify({ workDir, repoRoot, runCommand }),
    /smoke command produced invalid tarball filename/,
  );
});
