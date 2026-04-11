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

test('runPublish performs npm publish with verified tarball, git tag, and git push tag', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-publish-root-'));
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-publish-work-'));

  const tarballPath = path.join(workDir, 'praxis-devos-0.6.1.tgz');
  fs.writeFileSync(tarballPath, '');

  fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify({
    name: 'praxis-devos',
    version: '0.6.1',
  }, null, 2));

  fs.writeFileSync(path.join(repoRoot, '.release-state.json'), JSON.stringify({
    version: '0.6.1',
    tarballPath,
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

  assert.equal(result.version, '0.6.1');
  assert.equal(result.tagName, 'v0.6.1');
  assert.equal(result.publishedTarballPath, tarballPath);
  assert.equal(result.status, 'published');

  assert.deepEqual(executed, [
    { command: `npm publish "${tarballPath}"`, cwd: workDir },
    { command: 'git tag v0.6.1', cwd: workDir },
    { command: 'git push origin v0.6.1', cwd: workDir },
  ]);

  const state = JSON.parse(fs.readFileSync(path.join(repoRoot, '.release-state.json'), 'utf8'));
  assert.equal(state.status, 'published');
  assert.equal(state.tagName, 'v0.6.1');
});

test('runPublish rejects when verified tarball does not exist', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-publish-root-'));
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-publish-work-'));

  fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify({
    name: 'praxis-devos',
    version: '0.6.1',
  }, null, 2));

  fs.writeFileSync(path.join(repoRoot, '.release-state.json'), JSON.stringify({
    version: '0.6.1',
    tarballPath: path.join(workDir, 'nonexistent.tgz'),
    checks: ['package-version'],
    generatedAt: '2026-04-12T00:00:00.000Z',
    status: 'ready',
  }, null, 2));

  assert.throws(
    () => runPublish({ workDir, repoRoot }),
    /Verified tarball does not exist/,
  );
});

test('runPublish does not persist published state when tag fails mid-flow', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-publish-root-'));
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-publish-work-'));

  const tarballPath = path.join(workDir, 'praxis-devos-0.6.1.tgz');
  fs.writeFileSync(tarballPath, '');

  fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify({
    name: 'praxis-devos',
    version: '0.6.1',
  }, null, 2));

  fs.writeFileSync(path.join(repoRoot, '.release-state.json'), JSON.stringify({
    version: '0.6.1',
    tarballPath,
    checks: ['package-version'],
    generatedAt: '2026-04-12T00:00:00.000Z',
    status: 'ready',
  }, null, 2));

  const runCommand = ({ command }) => {
    if (command.startsWith('git tag')) {
      throw new Error('tag failed');
    }
    return { stdout: '' };
  };

  assert.throws(
    () => runPublish({ workDir, repoRoot, runCommand }),
    /tag failed/,
  );

  const state = JSON.parse(fs.readFileSync(path.join(repoRoot, '.release-state.json'), 'utf8'));
  assert.equal(state.status, 'ready');
});
