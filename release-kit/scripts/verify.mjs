import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { loadConfig } from './lib.mjs';

const defaultRunCommand = ({ command, cwd }) => ({
  stdout: execSync(command, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }),
});

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

export const runVerify = ({
  workDir,
  repoRoot,
  runCommand = defaultRunCommand,
  now = () => new Date().toISOString(),
} = {}) => {
  const packageJsonPath = path.join(workDir, 'package.json');
  const changelogPath = path.join(workDir, 'CHANGELOG.md');

  const packageJson = readJson(packageJsonPath);
  const version = packageJson.version;
  const changelog = fs.readFileSync(changelogPath, 'utf8');

  if (!version) {
    throw new Error('package.json version is required for verify');
  }

  if (!changelog.includes(`## [${version}]`)) {
    throw new Error(`CHANGELOG.md is missing entry for version ${version}`);
  }

  const config = loadConfig({ cwd: workDir });

  runCommand({ command: config.testCommand, cwd: workDir });
  const smokeResult = runCommand({ command: config.smokeCommand, cwd: workDir });
  const tarballName = smokeResult.stdout.trim().split(/\r?\n/).pop();

  if (!tarballName) {
    throw new Error('smoke command did not produce a tarball filename');
  }

  if (!tarballName.endsWith('.tgz')) {
    throw new Error(`smoke command produced invalid tarball filename: ${tarballName}`);
  }

  const state = {
    version,
    tarballPath: path.join(workDir, tarballName),
    checks: [
      'package-version',
      'changelog-entry',
      'test-command',
      'smoke-command',
    ],
    generatedAt: now(),
    status: 'ready',
  };

  fs.writeFileSync(
    path.join(repoRoot, '.release-state.json'),
    `${JSON.stringify(state, null, 2)}\n`,
  );

  return state;
};
