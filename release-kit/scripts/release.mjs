import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const defaultRunCommand = ({ command, cwd }) => ({
  stdout: execSync(command, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }),
});

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

export const runRelease = ({
  workDir,
  repoRoot,
  runCommand = defaultRunCommand,
  now = () => new Date().toISOString(),
} = {}) => {
  const packageJson = readJson(path.join(workDir, 'package.json'));
  const version = packageJson.version;
  const tagName = `v${version}`;
  const statePath = path.join(repoRoot, '.release-state.json');

  let state;
  if (fs.existsSync(statePath)) {
    state = readJson(statePath);
    if (!['published', 'completed'].includes(state.status)) {
      throw new Error('Release requires published state or compensation prerequisites');
    }
    if (state.version !== version) {
      throw new Error(
        `Release state version mismatch: expected ${version}, found ${state.version}`,
      );
    }
    if (state.status === 'completed') {
      return {
        version,
        tagName,
        status: 'completed',
        completedAt: state.completedAt,
      };
    }
  } else {
    runCommand({ command: `npm view ${packageJson.name}@${version} version`, cwd: workDir });
    runCommand({ command: `git rev-parse refs/tags/${tagName}`, cwd: workDir });
    state = {
      version,
      status: 'published',
    };
  }

  try {
    runCommand({ command: `gh release view ${tagName}`, cwd: workDir });
  } catch {
    runCommand({ command: `gh release create ${tagName} --generate-notes`, cwd: workDir });
  }

  const completedState = {
    ...state,
    version,
    tagName,
    status: 'completed',
    completedAt: now(),
  };

  fs.writeFileSync(statePath, `${JSON.stringify(completedState, null, 2)}\n`);

  return {
    version,
    tagName,
    status: 'completed',
    completedAt: completedState.completedAt,
  };
};
