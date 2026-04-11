import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runPublish } from '../scripts/publish.mjs';
import { runRelease } from '../scripts/release.mjs';

const scenarios = JSON.parse(
  fs.readFileSync(new URL('../fixtures/interruption-scenarios.json', import.meta.url), 'utf8'),
);

const writePackageJson = (workDir, version) => {
  fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify({
    name: 'praxis-devos',
    version,
  }, null, 2));
};

test('fixture: npm publish can succeed before tag failure without mutating verified state', () => {
  const scenario = scenarios.find(({ name }) => name === 'publish succeeds then tag fails');
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-recovery-root-'));
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-recovery-work-'));

  writePackageJson(workDir, scenario.version);
  fs.writeFileSync(path.join(repoRoot, '.release-state.json'), JSON.stringify({
    ...scenario.initialState,
    tarballPath: path.join(workDir, scenario.initialState.tarballPath),
  }, null, 2));

  const executed = [];
  const runCommand = ({ command, cwd }) => {
    executed.push({ command, cwd });
    const step = scenario.commands.find((entry) => entry.command === command);

    if (step?.outcome === 'error') {
      throw new Error(step.message);
    }

    return { stdout: '' };
  };

  assert.throws(
    () => runPublish({ workDir, repoRoot, runCommand }),
    /tag failed/,
  );

  assert.deepEqual(executed, [
    { command: 'npm publish', cwd: workDir },
    { command: 'git tag v0.6.1', cwd: workDir },
  ]);

  const state = JSON.parse(fs.readFileSync(path.join(repoRoot, '.release-state.json'), 'utf8'));
  assert.equal(state.status, 'ready');
});

test('fixture: GitHub Release creation can fail once and succeed on compensation retry', () => {
  const scenario = scenarios.find(({ name }) => name === 'tag exists but GitHub release creation fails once');
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-recovery-root-'));
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-recovery-work-'));

  writePackageJson(workDir, scenario.version);
  fs.writeFileSync(path.join(repoRoot, '.release-state.json'), JSON.stringify(scenario.initialState, null, 2));

  let failedOnce = false;
  const executed = [];
  const runCommand = ({ command, cwd }) => {
    executed.push({ command, cwd });

    if (command === 'gh release view v0.6.1') {
      throw new Error('release missing');
    }

    if (command === 'gh release create v0.6.1 --generate-notes' && !failedOnce) {
      failedOnce = true;
      throw new Error('github create failed');
    }

    return { stdout: '' };
  };

  assert.throws(
    () => runRelease({ workDir, repoRoot, runCommand }),
    /github create failed/,
  );

  let state = JSON.parse(fs.readFileSync(path.join(repoRoot, '.release-state.json'), 'utf8'));
  assert.equal(state.status, 'published');

  const result = runRelease({
    workDir,
    repoRoot,
    runCommand,
    now: () => '2026-04-12T02:00:00.000Z',
  });

  assert.equal(result.status, 'completed');
  state = JSON.parse(fs.readFileSync(path.join(repoRoot, '.release-state.json'), 'utf8'));
  assert.equal(state.status, 'completed');
  assert.equal(state.completedAt, '2026-04-12T02:00:00.000Z');
});
