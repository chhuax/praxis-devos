import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ensureMainWorktree, loadConfig } from '../scripts/lib.mjs';

test('ensureMainWorktree returns the current repo when already on clean main at origin/main', () => {
  const calls = [];
  const execFileSync = (command, args, options) => {
    calls.push({ command, args, options });

    const key = `${command} ${args.join(' ')}`;
    switch (key) {
      case 'git rev-parse --abbrev-ref HEAD':
        return 'main\n';
      case 'git status --porcelain':
        return '';
      case 'git rev-parse HEAD':
        return 'abc123\n';
      case 'git rev-parse origin/main':
        return 'abc123\n';
      default:
        throw new Error(`Unexpected command: ${key}`);
    }
  };

  const result = ensureMainWorktree({
    cwd: '/repo',
    execFileSync,
  });

  assert.deepEqual(result, {
    mode: 'direct',
    workDir: '/repo',
    repoRoot: '/repo',
    cleanup: null,
  });

  assert.deepEqual(
    calls.map(({ command, args }) => `${command} ${args.join(' ')}`),
    [
      'git rev-parse --abbrev-ref HEAD',
      'git status --porcelain',
      'git rev-parse HEAD',
      'git rev-parse origin/main',
    ],
  );
});

test('ensureMainWorktree creates a temporary worktree when not on a clean synced main branch', () => {
  const calls = [];
  const removed = [];
  const execFileSync = (command, args, options) => {
    calls.push({ command, args, options });

    const key = `${command} ${args.join(' ')}`;
    switch (key) {
      case 'git rev-parse --abbrev-ref HEAD':
        return 'feat/add-release-kit\n';
      case 'git status --porcelain':
        return ' M release-kit/test/lib.test.js\n';
      case 'git rev-parse HEAD':
        return 'local-head\n';
      case 'git rev-parse origin/main':
        return 'origin-head\n';
      case 'git worktree add /repo/.worktrees/release-kit-origin-main --detach origin/main':
        return 'Preparing worktree\n';
      default:
        throw new Error(`Unexpected command: ${key}`);
    }
  };

  const result = ensureMainWorktree({
    cwd: '/repo',
    execFileSync,
    removeWorktree: (worktreePath) => {
      removed.push(worktreePath);
    },
  });

  assert.equal(result.mode, 'worktree');
  assert.equal(result.repoRoot, '/repo');
  assert.equal(result.workDir, '/repo/.worktrees/release-kit-origin-main');
  assert.equal(typeof result.cleanup, 'function');

  result.cleanup();
  assert.deepEqual(removed, ['/repo/.worktrees/release-kit-origin-main']);
});

test('ensureMainWorktree rejects when worktree creation fails', () => {
  const execFileSync = (command, args) => {
    const key = `${command} ${args.join(' ')}`;
    switch (key) {
      case 'git rev-parse --abbrev-ref HEAD':
        return 'feature\n';
      case 'git status --porcelain':
        return ' M foo\n';
      case 'git rev-parse HEAD':
        return 'local-head\n';
      case 'git rev-parse origin/main':
        return 'origin-head\n';
      case 'git worktree add /repo/.worktrees/release-kit-origin-main --detach origin/main':
        throw new Error('worktree already exists');
      default:
        throw new Error(`Unexpected command: ${key}`);
    }
  };

  assert.throws(
    () => ensureMainWorktree({ cwd: '/repo', execFileSync }),
    /Failed to create release worktree: worktree already exists/,
  );
});

test('ensureMainWorktree registers cleanup hooks and reports manual cleanup path on removal failure', () => {
  const execFileSync = (command, args) => {
    const key = `${command} ${args.join(' ')}`;
    switch (key) {
      case 'git rev-parse --abbrev-ref HEAD':
        return 'feature\n';
      case 'git status --porcelain':
        return ' M foo\n';
      case 'git rev-parse HEAD':
        return 'local-head\n';
      case 'git rev-parse origin/main':
        return 'origin-head\n';
      case 'git worktree add /repo/.worktrees/release-kit-origin-main --detach origin/main':
        return 'Preparing worktree\n';
      default:
        throw new Error(`Unexpected command: ${key}`);
    }
  };

  const handlers = new Map();
  const killed = [];
  const fakeProcess = {
    pid: 12345,
    on(event, handler) {
      handlers.set(event, handler);
    },
    off(event) {
      handlers.delete(event);
    },
    kill(pid, signal) {
      killed.push({ pid, signal });
    },
  };

  const messages = [];

  const result = ensureMainWorktree({
    cwd: '/repo',
    execFileSync,
    removeWorktree: () => {
      throw new Error('permission denied');
    },
    processObject: fakeProcess,
    logger: {
      warn(message) {
        messages.push(message);
      },
    },
  });

  result.registerCleanupHooks();
  assert.equal(typeof handlers.get('SIGINT'), 'function');

  handlers.get('SIGINT')('SIGINT');

  assert.match(
    messages.join('\n'),
    /Manual cleanup required for worktree: \/repo\/.worktrees\/release-kit-origin-main/,
  );

  assert.deepEqual(killed, [{ pid: 12345, signal: 'SIGINT' }]);
});

test('loadConfig reads package.json release-kit config with defaults', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-kit-config-'));
  const packageJsonPath = path.join(tempDir, 'package.json');

  fs.writeFileSync(packageJsonPath, JSON.stringify({
    name: 'demo',
    version: '1.2.3',
    'release-kit': {
      testCommand: 'node --test release-kit/test',
      smokeCommand: 'npm pack',
    },
  }, null, 2));

  const config = loadConfig({ cwd: tempDir });
  assert.deepEqual(config, {
    testCommand: 'node --test release-kit/test',
    smokeCommand: 'npm pack',
    workingTreeAllowlist: [],
  });
});
