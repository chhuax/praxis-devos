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

export const runPublish = ({
  workDir,
  repoRoot,
  runCommand = defaultRunCommand,
} = {}) => {
  const statePath = path.join(repoRoot, '.release-state.json');

  if (!fs.existsSync(statePath)) {
    throw new Error('Verified state is required before publish');
  }

  const verifiedState = readJson(statePath);
  if (verifiedState.status !== 'ready') {
    throw new Error('Verified state is not ready for publish');
  }

  const packageJson = readJson(path.join(workDir, 'package.json'));
  const version = packageJson.version;

  if (verifiedState.version !== version) {
    throw new Error(
      `Verified state version ${verifiedState.version} does not match package.json version ${version}`,
    );
  }

  if (!verifiedState.tarballPath) {
    throw new Error('Verified state tarball path is required before publish');
  }

  const tarballPath = path.isAbsolute(verifiedState.tarballPath)
    ? verifiedState.tarballPath
    : path.resolve(repoRoot, verifiedState.tarballPath);

  if (!fs.existsSync(tarballPath)) {
    throw new Error(`Verified tarball does not exist: ${tarballPath}`);
  }

  const tagName = `v${version}`;

  runCommand({ command: `npm publish "${tarballPath}"`, cwd: workDir });
  runCommand({ command: `git tag ${tagName}`, cwd: workDir });
  runCommand({ command: `git push origin ${tagName}`, cwd: workDir });

  const publishedState = {
    ...verifiedState,
    version,
    tagName,
    publishedTarballPath: tarballPath,
    status: 'published',
  };

  fs.writeFileSync(statePath, `${JSON.stringify(publishedState, null, 2)}\n`);

  return publishedState;
};
