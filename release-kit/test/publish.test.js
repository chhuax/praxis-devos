import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runPublish } from '../scripts/publish.mjs';

test('runPublish rejects when verified state is missing', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-publish-root-'));
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-publish-work-'));

  fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify({
    name: 'praxis-devos',
    version: '0.6.1',
  }, null, 2));

  assert.throws(
    () => runPublish({ workDir, repoRoot }),
    /Verified state is required before publish/,
  );
});

test('runPublish rejects when verified state version drifts from package.json', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-publish-root-'));
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-publish-work-'));

  fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify({
    name: 'praxis-devos',
    version: '0.6.1',
  }, null, 2));

  fs.writeFileSync(path.join(repoRoot, '.release-state.json'), JSON.stringify({
    version: '0.6.0',
    tarballPath: path.join(workDir, 'praxis-devos-0.6.0.tgz'),
    checks: ['package-version'],
    generatedAt: '2026-04-12T00:00:00.000Z',
    status: 'ready',
  }, null, 2));

  assert.throws(
    () => runPublish({ workDir, repoRoot }),
    /Verified state version 0.6.0 does not match package.json version 0.6.1/,
  );
});

test('runPublish performs npm publish, git tag, and git push tag for the verified version', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-publish-root-'));
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-publish-work-'));

  fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify({
    name: 'praxis-devos',
    version: '0.6.1',
  }, null, 2));

  fs.writeFileSync(path.join(repoRoot, '.release-state.json'), JSON.stringify({
    version: '0.6.1',
    tarballPath: path.join(workDir, 'praxis-devos-0.6.1.tgz'),
    checks: ['package-version', 'changelog-entry', 'test-command', 'smoke-command'],
    generatedAt: '2026-04-12T00:00:00.000Z',
    status: 'ready',
  }, null, 2));

  const executed = [];
  const runCommand = ({ command, cwd }) => {
    executed.push({ command, cwd });
    return { stdout: '' };
  };

  const result = runPublish({ workDir, repoRoot, runCommand });

  assert.deepEqual(result, {
    version: '0.6.1',
    tagName: 'v0.6.1',
    publishedTarballPath: path.join(workDir, 'praxis-devos-0.6.1.tgz'),
    status: 'published',
  });

  assert.deepEqual(executed, [
    { command: 'npm publish', cwd: workDir },
    { command: 'git tag v0.6.1', cwd: workDir },
    { command: 'git push origin v0.6.1', cwd: workDir },
  ]);
});
