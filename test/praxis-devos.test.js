import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { createChangeScaffold, renderHelp, runCli } from '../src/core/praxis-devos.js';

const makeTempProject = () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-devos-test-'));
  fs.mkdirSync(path.join(projectDir, 'openspec', 'changes'), { recursive: true });
  return projectDir;
};

test('renderHelp exposes change and proposal commands', () => {
  const help = renderHelp();
  assert.match(help, /change\s+Create an OpenSpec change scaffold/);
  assert.match(help, /proposal\s+Compatibility alias of `change`/);
});

test('createChangeScaffold creates a full change by default', () => {
  const projectDir = makeTempProject();
  const output = createChangeScaffold({
    projectDir,
    title: 'Add two factor auth',
    capability: 'auth',
  });

  assert.match(output, /type: auto -> full/);
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'add-two-factor-auth', 'proposal.md')));
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'add-two-factor-auth', 'tasks.md')));
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'add-two-factor-auth', 'specs', 'auth', 'spec.md')));
});

test('proposal alias creates a lightweight scaffold without tasks', () => {
  const projectDir = makeTempProject();
  const output = runCli([
    'proposal',
    'create',
    '--type',
    'lite',
    '--capability',
    'order-query',
    '--project-dir',
    projectDir,
    'Adjust order query filters',
  ]);

  assert.match(output, /lightweight change scaffold/);
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'adjust-order-query-filters', 'proposal.md')));
  assert.ok(!fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'adjust-order-query-filters', 'tasks.md')));
  assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'changes', 'adjust-order-query-filters', 'specs', 'order-query', 'spec.md')));
});

test('list-stacks remains callable through runCli', () => {
  const output = runCli(['list-stacks']);
  assert.match(output, /java-spring/);
  assert.match(output, /starter/);
});
