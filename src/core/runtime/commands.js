import fs from 'fs';
import path from 'path';
import { execFileSync, execSync } from 'child_process';

// Process execution helpers live here so the core orchestrator stays focused on
// command routing instead of shell/platform details.

const normalizeCommandPath = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  let normalized = value.trim();

  while (normalized.length >= 2) {
    if (
      (normalized.startsWith('"') && normalized.endsWith('"'))
      || (normalized.startsWith('\'') && normalized.endsWith('\''))
    ) {
      normalized = normalized.slice(1, -1).trim();
      continue;
    }

    if (
      (normalized.startsWith('\\"') && normalized.endsWith('\\"'))
      || (normalized.startsWith("\\'") && normalized.endsWith("\\'"))
    ) {
      normalized = normalized.slice(2, -2).trim();
      continue;
    }

    break;
  }

  return normalized;
};

const findCommandPath = (cmd) => {
  try {
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const stdout = execFileSync(whichCmd, [cmd], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const candidates = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    for (const candidate of candidates) {
      const normalized = normalizeCommandPath(candidate);
      if (process.platform === 'win32' && path.extname(normalized).length === 0) {
        const pathExts = (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD')
          .split(';')
          .map((ext) => ext.trim().toLowerCase())
          .filter((ext) => ext.length > 0)
          .map((ext) => (ext.startsWith('.') ? ext : `.${ext}`));
        const fallbackExts = ['.cmd', '.exe', '.bat', '.com'];
        const executableExts = Array.from(new Set([...pathExts, ...fallbackExts]));
        for (const ext of executableExts) {
          const withExt = `${normalized}${ext}`;
          if (fs.existsSync(withExt)) {
            return withExt;
          }
        }

        if (fs.existsSync(normalized)) {
          return normalized;
        }
        continue;
      }

      if (fs.existsSync(normalized)) {
        return normalized;
      }
    }

    return null;
  } catch {
    return null;
  }
};

export const commandExists = (cmd) => Boolean(findCommandPath(cmd));

const localExecutablePath = (projectDir, executable) => {
  const fileName = process.platform === 'win32' ? `${executable}.cmd` : executable;
  return path.join(projectDir, 'node_modules', '.bin', fileName);
};

// OpenSpec runtime resolution is pure environment detection: find the best
// available CLI without making installation decisions here.
export const resolveOpenSpecRuntime = (projectDir) => {
  const globalPath = findCommandPath('openspec');
  if (globalPath) {
    return {
      status: 'ok',
      source: 'global',
      command: globalPath,
      detail: `OpenSpec CLI is available on PATH via ${globalPath}`,
    };
  }

  const localPath = localExecutablePath(projectDir, 'openspec');
  if (fs.existsSync(localPath)) {
    return {
      status: 'warning',
      source: 'project-local',
      command: localPath,
      detail: `OpenSpec is only available project-locally via ${localPath}; user-level global install is recommended`,
    };
  }

  return {
    status: 'missing',
    source: 'missing',
    command: null,
    detail: 'OpenSpec CLI is missing. Install it with `npx praxis-devos setup --agent <name>` or `npx praxis-devos bootstrap --agents <name>`.',
  };
};

export const isGlobalOpenSpecRuntime = (runtime) => runtime?.status === 'ok' && runtime?.source === 'global';

const isWindowsBatchScript = (cmd) => process.platform === 'win32'
  && ['.cmd', '.bat'].includes(path.extname(normalizeCommandPath(cmd)).toLowerCase());

const quoteWindowsCmdArg = (value) => {
  if (value.length === 0) {
    return '""';
  }

  const escaped = value.replace(/"/g, '""');
  return /[\s"&()<>^|]/.test(value) ? `"${escaped}"` : escaped;
};

const buildWindowsBatchCommand = (cmd, args) => [
  quoteWindowsCmdArg(cmd),
  ...args.map((arg) => quoteWindowsCmdArg(String(arg))),
].join(' ');

const isOpenSpecCommand = (cmd) => {
  const base = path.basename(normalizeCommandPath(cmd)).toLowerCase();
  return ['openspec', 'openspec.cmd', 'openspec.exe'].includes(base);
};

// Execute a command file with cross-platform handling and repo-wide OpenSpec
// telemetry opt-out so scaffold output stays quiet and deterministic.
export const runFile = (cmd, args, opts = {}) => {
  try {
    const execOpts = { encoding: 'utf8', timeout: 120_000, ...opts };
    const normalizedCmd = normalizeCommandPath(cmd);
    execOpts.env = {
      ...process.env,
      ...(isOpenSpecCommand(normalizedCmd) ? { OPENSPEC_TELEMETRY: '0' } : {}),
      ...(opts.env || {}),
    };
    const stdout = isWindowsBatchScript(normalizedCmd)
      ? execSync(
        buildWindowsBatchCommand(normalizedCmd, args),
        { ...execOpts, shell: process.env.ComSpec || true },
      )
      : execFileSync(normalizedCmd, args, execOpts);
    return { ok: true, stdout: stdout.trim(), stderr: '' };
  } catch (err) {
    return { ok: false, stdout: '', stderr: err.stderr?.trim() || err.message };
  }
};

export const resolveCommandForExecution = (cmd) => {
  const normalizedCmd = normalizeCommandPath(cmd);

  if (path.extname(normalizedCmd)) {
    return normalizeCommandPath(findCommandPath(normalizedCmd) || normalizedCmd);
  }

  if (process.platform === 'win32') {
    return normalizeCommandPath(
      findCommandPath(`${normalizedCmd}.cmd`)
      || findCommandPath(`${normalizedCmd}.bat`)
      || findCommandPath(`${normalizedCmd}.exe`)
      || findCommandPath(normalizedCmd)
      || normalizedCmd,
    );
  }

  return normalizeCommandPath(findCommandPath(normalizedCmd) || normalizedCmd);
};
