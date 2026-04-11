import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const releaseKitRoot = new URL('..', import.meta.url);

const readText = (relativePath) => fs.readFileSync(
  new URL(relativePath, releaseKitRoot),
  'utf8',
);

test('release-kit defines the v1 maintainer-only boundary', () => {
  const requiredPaths = [
    'README.md',
    'skill/',
    'skill/SKILL.md',
    'scripts/',
    'test/',
    'fixtures/',
  ];

  for (const relativePath of requiredPaths) {
    const absolutePath = new URL(relativePath, releaseKitRoot);
    assert.ok(
      fs.existsSync(absolutePath),
      `Expected ${path.relative(process.cwd(), absolutePath.pathname)} to exist`,
    );
  }

  const readme = readText('README.md');
  assert.match(readme, /maintainer-only/i);
  assert.match(readme, /Node\/npm \+ git \+ GitHub/i);
  assert.match(readme, /not part of the projection system/i);

  const skill = readText('skill/SKILL.md');
  assert.match(skill, /maintainer-only/i);
  assert.match(skill, /verify \/ publish \/ release/i);
  assert.match(skill, /delegate all deterministic execution to repo scripts/i);
});
