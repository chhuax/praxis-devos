import { execFileSync as defaultExecFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const runGit = (cwd, execFileSync, args) => execFileSync('git', args, {
  cwd,
  encoding: 'utf8',
}).trim();

const defaultRemoveWorktree = (worktreePath, execFileSync = defaultExecFileSync) => {
  execFileSync('git', ['worktree', 'remove', '--force', worktreePath], {
    cwd: path.dirname(worktreePath),
    encoding: 'utf8',
  });
};

export const loadConfig = ({ cwd = process.cwd() } = {}) => {
  const packageJsonPath = path.join(cwd, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const releaseKitConfig = packageJson['release-kit'] ?? {};

  return {
    testCommand: releaseKitConfig.testCommand ?? 'node --test',
    smokeCommand: releaseKitConfig.smokeCommand ?? 'npm pack',
    workingTreeAllowlist: releaseKitConfig.workingTreeAllowlist ?? [],
  };
};

export const ensureMainWorktree = ({
  cwd = process.cwd(),
  execFileSync = defaultExecFileSync,
  removeWorktree = (worktreePath) => defaultRemoveWorktree(worktreePath, execFileSync),
  processObject = process,
  logger = console,
} = {}) => {
  const branch = runGit(cwd, execFileSync, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const status = runGit(cwd, execFileSync, ['status', '--porcelain']);
  const head = runGit(cwd, execFileSync, ['rev-parse', 'HEAD']);
  const originMain = runGit(cwd, execFileSync, ['rev-parse', 'origin/main']);

  if (branch === 'main' && status === '' && head === originMain) {
    return {
      mode: 'direct',
      workDir: cwd,
      repoRoot: cwd,
      cleanup: null,
    };
  }

  const worktreePath = path.join(cwd, '.worktrees', 'release-kit-origin-main');

  try {
    execFileSync('git', ['worktree', 'add', worktreePath, '--detach', 'origin/main'], {
      cwd,
      encoding: 'utf8',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create release worktree: ${message}`);
  }

  return {
    mode: 'worktree',
    workDir: worktreePath,
    repoRoot: cwd,
    cleanup: () => removeWorktree(worktreePath),
    registerCleanupHooks: () => {
      const signals = ['SIGINT', 'SIGTERM'];
      const handler = (signal) => {
        try {
          removeWorktree(worktreePath);
        } catch {
          logger.warn(`Manual cleanup required for worktree: ${worktreePath}`);
        } finally {
          for (const s of signals) {
            processObject.off?.(s, handler);
          }
          processObject.kill?.(processObject.pid, signal);
        }
      };

      for (const signal of signals) {
        processObject.on?.(signal, handler);
      }

      processObject.on?.('exit', () => {
        try {
          removeWorktree(worktreePath);
        } catch {
          logger.warn(`Manual cleanup required for worktree: ${worktreePath}`);
        }
      });
    },
  };
};
