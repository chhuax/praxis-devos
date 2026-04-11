import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runRelease } from '../scripts/release.mjs';

test('runRelease creates a GitHub Release after publish and marks state complete', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-release-root-'));
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-release-work-'));

  fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify({
    name: 'praxis-devos',
    version: '0.6.1',
  }, null, 2));

  fs.writeFileSync(path.join(repoRoot, '.release-state.json'), JSON.stringify({
    version: '0.6.1',
    tarballPath: path.join(workDir, 'praxis-devos-0.6.1.tgz'),
    checks: ['package-version', 'changelog-entry', 'test-command', 'smoke-command'],
    generatedAt: '2026-04-12T00:00:00.000Z',
    status: 'published',
  }, null, 2));

  const executed = [];
  const runCommand = ({ command, cwd }) => {
    executed.push({ command, cwd });

    if (command === 'gh release view v0.6.1') {
      throw new Error('release not found');
    }

    return { stdout: '' };
  };

  const result = runRelease({
    workDir,
    repoRoot,
    runCommand,
    now: () => '2026-04-12T01:00:00.000Z',
  });

  assert.deepEqual(result, {
    version: '0.6.1',
    tagName: 'v0.6.1',
    status: 'completed',
    completedAt: '2026-04-12T01:00:00.000Z',
  });

  assert.deepEqual(executed, [
    { command: 'gh release view v0.6.1', cwd: workDir },
    { command: 'gh release create v0.6.1 --generate-notes', cwd: workDir },
  ]);

  const state = JSON.parse(fs.readFileSync(path.join(repoRoot, '.release-state.json'), 'utf8'));
  assert.equal(state.status, 'completed');
  assert.equal(state.completedAt, '2026-04-12T01:00:00.000Z');
});

test('runRelease supports compensation when publish and tag exist but state file is missing', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-release-root-'));
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-release-work-'));

  fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify({
    name: 'praxis-devos',
    version: '0.6.1',
  }, null, 2));

  const executed = [];
  const runCommand = ({ command, cwd }) => {
    executed.push({ command, cwd });

    switch (command) {
      case 'npm view praxis-devos@0.6.1 version':
        return { stdout: '0.6.1\n' };
      case 'git rev-parse refs/tags/v0.6.1':
        return { stdout: 'abc123\n' };
      case 'gh release view v0.6.1':
        throw new Error('release not found');
      case 'gh release create v0.6.1 --generate-notes':
        return { stdout: '' };
      default:
        throw new Error(`Unexpected command: ${command}`);
    }
  };

  const result = runRelease({
    workDir,
    repoRoot,
    runCommand,
    now: () => '2026-04-12T01:30:00.000Z',
  });

  assert.deepEqual(result, {
    version: '0.6.1',
    tagName: 'v0.6.1',
    status: 'completed',
    completedAt: '2026-04-12T01:30:00.000Z',
  });

  assert.deepEqual(executed, [
    { command: 'npm view praxis-devos@0.6.1 version', cwd: workDir },
    { command: 'git rev-parse refs/tags/v0.6.1', cwd: workDir },
    { command: 'gh release view v0.6.1', cwd: workDir },
    { command: 'gh release create v0.6.1 --generate-notes', cwd: workDir },
  ]);
});
