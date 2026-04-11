import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import {
  projectToAgent,
  detectForAgent,
  expectedSkillNames,
} from '../projection/index.js';
import { resolveUserHomeDir } from '../support/home.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PRAXIS_ROOT = path.resolve(__dirname, '../..');
export const PACKAGE_JSON = path.join(PRAXIS_ROOT, 'package.json');
export const MANAGED_ENTRY_TEMPLATE = path.join(PRAXIS_ROOT, 'src', 'templates', 'managed-entry.md');
export const DOCS_LITE_TEMPLATE_ROOT = path.join(PRAXIS_ROOT, 'src', 'templates', 'docs-lite');

export const SUPPORTED_AGENTS = ['opencode', 'codex', 'claude'];
export const SUPERPOWERS_OPENCODE_PLUGIN = 'superpowers@git+https://github.com/obra/superpowers.git';
export const PRAXIS_OPENCODE_PLUGIN = 'praxis-devos@git+https://github.com/chhuax/praxis-devos.git';
export const CLAUDE_SUPERPOWERS_PLUGIN = 'superpowers@claude-plugins-official';
const SUPERPOWERS_GIT_URL = 'https://github.com/obra/superpowers.git';
export const OPENSPEC_PACKAGE = '@fission-ai/openspec';

const SUPERPOWERS_DOCS = {
  main: 'https://github.com/obra/superpowers',
  codex: 'https://github.com/obra/superpowers/blob/main/docs/README.codex.md',
  opencode: 'https://github.com/obra/superpowers/blob/main/docs/README.opencode.md',
};

const OPENSPEC_INSTALL_DOC = 'https://github.com/Fission-AI/OpenSpec';

const AGENTS_MANAGED_START = '<!-- PRAXIS_DEVOS_START -->';
const AGENTS_MANAGED_END = '<!-- PRAXIS_DEVOS_END -->';

const CLAUDE_MANAGED_START = '<!-- PRAXIS_DEVOS_START -->';
const CLAUDE_MANAGED_END = '<!-- PRAXIS_DEVOS_END -->';
const CODEMAP_MANAGED_START = '<!-- PRAXIS_DOCS_REFRESH_START -->';
const CODEMAP_MANAGED_END = '<!-- PRAXIS_DOCS_REFRESH_END -->';
const DOCS_LITE_TEMPLATE_FILES = [
  'docs/codemaps/project-overview.md',
  'docs/surfaces.yaml',
];
const DOCS_PLACEHOLDER_PATTERNS = [
  /TODO/i,
  /TBD/i,
  /<[^>\n]+>/,
  /\[fill[^\]]*\]/i,
  /\[填写[^\]]*\]/,
  /待补充/,
];
const DOCS_ALLOWED_TARGET_BASE = [
  'docs/surfaces.yaml',
  'docs/codemaps/project-overview.md',
  'docs/codemaps/module-map.md',
];

const AGENTS_MD_TEMPLATE = `# [项目名称]

> 请在此文件中描述项目上下文，帮助 AI 代理理解你的项目。

## 项目概述

<!-- 简要描述项目类型、核心业务、部署方式 -->

## 技术栈

<!-- 列出运行时、框架、持久层、缓存等关键技术选型 -->

## 模块结构

<!-- 列出核心模块及职责 -->

| 模块 | 职责 |
|------|------|
| | |

## 构建命令

<!-- 列出常用命令 -->

\`\`\`bash
\`\`\`

## 分支策略

<!-- 描述 Git 分支模型 -->

## 额外约定

<!-- 列出本项目特有的编码约定 -->
`;

const CLAUDE_MD_TEMPLATE = `# Claude Code Project Memory

此文件由 Praxis DevOS 维护 Claude Code 的项目入口信息。
`;

const OPENCODE_ADAPTER_README = `# OpenCode Adapter Output

This directory is a generated compatibility marker for OpenCode.
Praxis manages project state through CLAUDE.md/AGENTS.md managed blocks and openspec/ directory.

- \`.opencode/\` no longer mirrors canonical skills or rules files by default
- If you add OpenCode-only supplemental skills, place them in \`.opencode/skills/\`
- Re-run \`npx praxis-devos sync --agent opencode\` after changing canonical files
`;

export const readFile = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
};

export const listDirs = (dirPath) => {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
};

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

const resolveOpenSpecRuntime = (projectDir) => {
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

const isGlobalOpenSpecRuntime = (runtime) => runtime?.status === 'ok' && runtime?.source === 'global';

const run = (cmd, opts = {}) => {
  try {
    const stdout = execSync(cmd, { encoding: 'utf8', timeout: 120_000, ...opts });
    return { ok: true, stdout: stdout.trim(), stderr: '' };
  } catch (err) {
    return { ok: false, stdout: '', stderr: err.stderr?.trim() || err.message };
  }
};

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

const runFile = (cmd, args, opts = {}) => {
  try {
    const execOpts = { encoding: 'utf8', timeout: 120_000, ...opts };
    const normalizedCmd = normalizeCommandPath(cmd);
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

const codexSuperpowersPaths = () => ({
  skillsPath: path.join(resolveUserHomeDir(), '.codex', 'skills', 'superpowers'),
  skillsParent: path.join(resolveUserHomeDir(), '.codex', 'skills'),
  clonePath: path.join(resolveUserHomeDir(), '.codex', 'superpowers'),
  cloneParent: path.join(resolveUserHomeDir(), '.codex'),
});

const hasSkillMarkdownFiles = (rootDir) => {
  if (!rootDir || !fs.existsSync(rootDir)) {
    return false;
  }

  const pending = [rootDir];
  while (pending.length > 0) {
    const currentDir = pending.pop();
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isFile() && entry.name === 'SKILL.md') {
        return true;
      }
      if (entry.isDirectory()) {
        pending.push(entryPath);
      }
    }
  }

  return false;
};

const resolveCommandForExecution = (cmd) => {
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

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const writeText = (filePath, content) => {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
};

const copyFile = (src, dst) => {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
};

const syncDirRecursive = (src, dst) => {
  ensureDir(dst);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      syncDirRecursive(srcPath, dstPath);
      continue;
    }
    copyFile(srcPath, dstPath);
  }
};

const syncMissingFilesRecursive = (src, dst) => {
  ensureDir(dst);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      syncMissingFilesRecursive(srcPath, dstPath);
      continue;
    }
    if (!fs.existsSync(dstPath)) {
      copyFile(srcPath, dstPath);
    }
  }
};

const copyDirIfMissing = (src, dst) => {
  if (!fs.existsSync(dst)) {
    syncDirRecursive(src, dst);
  }
};

const sourceSkillLooksIncomplete = (src, dst) => {
  const srcSkillMd = path.join(src, 'SKILL.md');
  const dstSkillMd = path.join(dst, 'SKILL.md');
  return fs.existsSync(srcSkillMd) && !fs.existsSync(dstSkillMd);
};

const ensureDirSeeded = (src, dst) => {
  if (!fs.existsSync(dst)) {
    syncDirRecursive(src, dst);
    return 'created';
  }

  if (sourceSkillLooksIncomplete(src, dst)) {
    syncMissingFilesRecursive(src, dst);
    return 'repaired';
  }

  return 'skipped';
};

const removePathIfExists = (targetPath) => {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
};

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
};

const writeJson = (filePath, data) => {
  writeText(filePath, `${JSON.stringify(data, null, 2)}\n`);
};

const extractSkillSummary = (skillMd) => {
  if (!skillMd) {
    return 'No description.';
  }

  const frontmatterMatch = skillMd.match(/^---\n([\s\S]*?)\n---\n?/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const blockDescriptionMatch = frontmatter.match(/(?:^|\n)description:\s*\|\s*\n((?:[ \t].*\n?)*)/m);
    if (blockDescriptionMatch) {
      const description = blockDescriptionMatch[1]
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join(' ');
      if (description) {
        return description;
      }
    }

    const inlineDescriptionMatch = frontmatter.match(/(?:^|\n)description:\s*(.+)$/m);
    if (inlineDescriptionMatch?.[1]?.trim()) {
      return inlineDescriptionMatch[1].trim();
    }
  }

  const body = frontmatterMatch ? skillMd.slice(frontmatterMatch[0].length) : skillMd;
  const lines = body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (
      line.startsWith('#')
      || line === '---'
      || line === '```'
      || /^[-*_]{3,}$/.test(line)
    ) {
      continue;
    }

    const normalized = line
      .replace(/^>\s*/, '')
      .replace(/^-\s+/, '')
      .replace(/`/g, '')
      .trim();

    if (normalized) {
      return normalized;
    }
  }

  return 'No description.';
};

const uniqueAgents = (agents = []) => {
  const normalized = agents
    .flatMap((agent) => String(agent || '').split(','))
    .map((agent) => agent.trim().toLowerCase())
    .filter(Boolean);

  const values = normalized.length > 0 ? normalized : [...SUPPORTED_AGENTS];
  const deduped = [...new Set(values)];
  return deduped.filter((agent) => SUPPORTED_AGENTS.includes(agent));
};

const upsertManagedBlock = (filePath, startMarker, endMarker, blockContent, fallbackContent = '') => {
  const existing = readFile(filePath);
  const managedBlock = `${startMarker}\n${blockContent.trim()}\n${endMarker}`;

  if (!existing) {
    const base = fallbackContent.trim();
    const next = base ? `${managedBlock}\n\n${base}\n` : `${managedBlock}\n`;
    writeText(filePath, next);
    return 'created';
  }

  if (existing.includes(startMarker) && existing.includes(endMarker)) {
    const withoutManagedBlock = existing.replace(
      new RegExp(`${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}\\n?`, 'm'),
      '',
    ).trimStart();
    const next = withoutManagedBlock
      ? `${managedBlock}\n\n${withoutManagedBlock}`
      : `${managedBlock}\n`;

    if (next !== existing) {
      writeText(filePath, next);
      return 'updated';
    }

    return 'unchanged';
  }

  const next = existing.trim()
    ? `${managedBlock}\n\n${existing}`
    : `${managedBlock}\n`;
  writeText(filePath, next);
  return 'appended';
};

const upsertManagedBlockInPlace = (filePath, startMarker, endMarker, blockContent, fallbackContent = '') => {
  const existing = readFile(filePath);
  const managedBlock = `${startMarker}\n${blockContent.trim()}\n${endMarker}`;

  if (!existing) {
    const base = fallbackContent.trim();
    const next = base
      ? (base.includes(startMarker) && base.includes(endMarker)
        ? `${base.replace(
          new RegExp(`${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`, 'm'),
          managedBlock,
        )}\n`
        : `${managedBlock}\n\n${base}\n`)
      : `${managedBlock}\n`;
    writeText(filePath, next);
    return 'created';
  }

  if (existing.includes(startMarker) && existing.includes(endMarker)) {
    const next = existing.replace(
      new RegExp(`${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`, 'm'),
      managedBlock,
    );

    if (next !== existing) {
      writeText(filePath, next);
      return 'updated';
    }

    return 'unchanged';
  }

  const base = fallbackContent.trim();
  const next = base
    ? (base.includes(startMarker) && base.includes(endMarker)
      ? `${base.replace(
        new RegExp(`${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`, 'm'),
        managedBlock,
      )}\n\n${existing.trimStart()}`
      : `${managedBlock}\n\n${base}\n\n${existing.trimStart()}`)
    : `${managedBlock}\n\n${existing.trimStart()}`;
  writeText(filePath, next);
  return 'appended';
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getPackageVersion = () => readJson(PACKAGE_JSON)?.version || '0.0.0';

const globalOpencodeConfigPath = () =>
  path.join(resolveUserHomeDir(), '.config', 'opencode', 'config.json');

const projectPaths = (projectDir) => ({
  projectDir,
  opencodeConfigPath: path.join(projectDir, 'opencode.json'),
  rootAgentsMd: path.join(projectDir, 'AGENTS.md'),
  rootClaudeMd: path.join(projectDir, 'CLAUDE.md'),
  openspecDir: path.join(projectDir, 'openspec'),
  legacyOpenCodeDir: path.join(projectDir, '.opencode'),
  legacyOpenCodeSkillsDir: path.join(projectDir, '.opencode', 'skills'),
  docsCodemapsDir: path.join(projectDir, 'docs', 'codemaps'),
  docsReferenceDir: path.join(projectDir, 'docs', 'reference'),
  codemapOverviewPath: path.join(projectDir, 'docs', 'codemaps', 'project-overview.md'),
  codemapModuleMapPath: path.join(projectDir, 'docs', 'codemaps', 'module-map.md'),
  codemapModulesDir: path.join(projectDir, 'docs', 'codemaps', 'modules'),
  apiReferencePath: path.join(projectDir, 'docs', 'reference', 'api.md'),
  surfacesPath: path.join(projectDir, 'docs', 'surfaces.yaml'),
  nonCanonicalSurfacesPath: path.join(projectDir, 'contracts', 'surfaces.yaml'),
  rootPomPath: path.join(projectDir, 'pom.xml'),
});

const formatRelativePath = (projectDir, targetPath) => {
  const relative = path.relative(projectDir, targetPath);
  return relative.split(path.sep).join('/');
};

const formatPathRef = (relativePath, isDir = false) => `\`${isDir ? `${relativePath.replace(/\/+$/, '')}/` : relativePath}\``;

const listVisibleTopLevelEntries = (projectDir) => {
  try {
    return fs.readdirSync(projectDir, { withFileTypes: true })
      .filter((entry) => !entry.name.startsWith('.'))
      .filter((entry) => entry.name !== 'node_modules')
      .map((entry) => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
      }))
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  } catch {
    return [];
  }
};

const firstExistingRelativePath = (projectDir, candidates) => {
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(projectDir, candidate))) {
      return candidate;
    }
  }

  return null;
};

const collectPreferredReadPaths = ({ projectDir, primarySurfaceLocation }) => {
  const preferred = [
    'AGENTS.md',
    'README.md',
    'docs/codemaps/project-overview.md',
    'docs/surfaces.yaml',
    primarySurfaceLocation || null,
    firstExistingRelativePath(projectDir, ['src/index.ts', 'src/index.js', 'src/main.ts', 'src/main.js', 'index.ts', 'index.js']),
    firstExistingRelativePath(projectDir, ['test', 'tests', 'spec']),
  ].filter(Boolean);

  return [...new Set(preferred)];
};

const collectEntryCandidates = ({ projectDir, primarySurfaceLocation }) => {
  const candidates = [
    primarySurfaceLocation || null,
    firstExistingRelativePath(projectDir, ['src/index.ts', 'src/index.js', 'src/main.ts', 'src/main.js', 'index.ts', 'index.js']),
    firstExistingRelativePath(projectDir, ['bin', 'app', 'lib', 'packages']),
  ].filter(Boolean);

  return [...new Set(candidates)];
};

const renderProblemRouting = ({ primarySurfaceLocation, testPath, sourcePath }) => {
  const lines = [
    '## Problem Routing',
    '',
    '- External surface changes: read `docs/surfaces.yaml`.',
    `- Source code changes: read ${formatPathRef(sourcePath || 'src/', !sourcePath || !/\.[a-z0-9]+$/i.test(sourcePath))}.`,
    `- Tests: read ${formatPathRef(testPath || 'test/', !testPath || !/\.[a-z0-9]+$/i.test(testPath))}.`,
    '- Docs and project map updates: read `docs/codemaps/project-overview.md` and `docs/surfaces.yaml`.',
  ];

  return lines.join('\n');
};

const renderGeneratedProjectOverview = ({ projectDir }) => {
  const paths = projectPaths(projectDir);
  const surfacesContent = readFile(paths.surfacesPath) || '';
  const parsed = parseSurfacesYaml(surfacesContent);
  const primarySurface = parsed.primarySurface || 'not-declared';
  const surface = parsed.surfaces.find((entry) => entry.id === parsed.primarySurface) || parsed.surfaces[0] || null;
  const primarySurfaceKind = surface?.kind || 'unknown';
  const primarySurfaceLocation = surface?.location || 'not-declared';
  const topLevelEntries = listVisibleTopLevelEntries(projectDir);
  const readPaths = collectPreferredReadPaths({ projectDir, primarySurfaceLocation });
  const entryCandidates = collectEntryCandidates({ projectDir, primarySurfaceLocation });
  const testPath = firstExistingRelativePath(projectDir, ['test', 'tests', 'spec']);
  const sourcePath = firstExistingRelativePath(projectDir, ['src', 'app', 'lib', 'packages']);

  const lines = [
    '## Generated Overview',
    '',
    '> This section is maintained by `praxis-devos docs refresh` as a compatibility path. Prefer `/devos-docs-refresh` when host command wiring is available.',
    '',
    '## Project Summary',
    '',
    `- Primary surface: \`${primarySurface}\``,
    `- Surface kind: \`${primarySurfaceKind}\``,
    `- Surface location: \`${primarySurfaceLocation}\``,
    '',
    '## Read These Files First',
    '',
    ...readPaths.map((entry) => `- ${formatPathRef(entry, !/\.[a-z0-9]+$/i.test(entry))}`),
    '',
    '## Top-Level Structure',
    '',
    ...(topLevelEntries.length > 0
      ? topLevelEntries.map((entry) => `- ${formatPathRef(entry.name, entry.isDirectory)}`)
      : ['- No visible top-level entries detected yet.']),
    '',
    '## Entry Candidates',
    '',
    ...(entryCandidates.length > 0
      ? entryCandidates.map((entry) => `- ${formatPathRef(entry, !/\.[a-z0-9]+$/i.test(entry))}`)
      : ['- No entry candidates detected.']),
    '',
    renderProblemRouting({ primarySurfaceLocation, testPath, sourcePath }),
  ];

  return lines.join('\n');
};

const codemapFallbackContent = (title) => [
  `# Codemap: ${title}`,
  '',
  `${CODEMAP_MANAGED_START}`,
  'Praxis DevOS will refresh this block.',
  `${CODEMAP_MANAGED_END}`,
  '',
  '## User Notes',
  '',
  'Add project-specific notes here. Praxis refresh preserves this section.',
].join('\n');

const normalizeYamlScalar = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith('\'') && trimmed.endsWith('\''))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
};

const parseSurfacesYaml = (content) => {
  const parsed = {
    primarySurface: '',
    surfaces: [],
  };

  if (!content) {
    return parsed;
  }

  let currentSurface = null;
  let inSurfaces = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, '');
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const primaryMatch = trimmed.match(/^primary_surface:\s*(.+)?$/);
    if (primaryMatch) {
      parsed.primarySurface = normalizeYamlScalar(primaryMatch[1] || '');
      continue;
    }

    if (trimmed === 'surfaces:') {
      inSurfaces = true;
      currentSurface = null;
      continue;
    }

    if (!inSurfaces) {
      continue;
    }

    const surfaceStartMatch = line.match(/^\s*-\s+id:\s*(.+)?$/);
    if (surfaceStartMatch) {
      currentSurface = { id: normalizeYamlScalar(surfaceStartMatch[1] || '') };
      parsed.surfaces.push(currentSurface);
      continue;
    }

    const fieldMatch = line.match(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):\s*(.+)?$/);
    if (fieldMatch && currentSurface) {
      currentSurface[fieldMatch[1]] = normalizeYamlScalar(fieldMatch[2] || '');
    }
  }

  return parsed;
};

const parsePomModules = (content) => {
  const modulesBlock = content.match(/<modules>\s*([\s\S]*?)\s*<\/modules>/i);
  if (!modulesBlock) {
    return [];
  }

  return [...modulesBlock[1].matchAll(/<module>\s*([^<]+?)\s*<\/module>/gi)]
    .map((match) => match[1].trim())
    .filter(Boolean);
};

const parsePomArtifactId = (content) => {
  const withoutParent = content.replace(/<parent>\s*[\s\S]*?\s*<\/parent>/i, '');
  const artifactMatch = withoutParent.match(/<artifactId>\s*([^<]+?)\s*<\/artifactId>/i);
  return artifactMatch?.[1]?.trim() || '';
};

const normalizeModuleFallbackName = (relativeDir) => relativeDir
  .split(/[\\/]+/)
  .filter(Boolean)
  .join('--');

const sanitizeModuleStableName = (value) => value
  .replace(/[\\/]+/g, '--')
  .replace(/[^A-Za-z0-9._-]+/g, '-')
  .replace(/^\.+/, '')
  .replace(/\.+$/, '')
  .replace(/^-+/, '')
  .replace(/-+$/, '')
  .replace(/-{2,}/g, '-');

const uniqueDuplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  }
  return [...duplicates].sort();
};

const discoverMavenModules = (projectDir) => {
  const paths = projectPaths(projectDir);
  if (!fs.existsSync(paths.rootPomPath)) {
    return { rootHasPom: false, isMultiModule: false, modules: [] };
  }

  const discovered = [];
  const seenPomPaths = new Set();

  const visitPom = (pomPath) => {
    const normalizedPomPath = path.resolve(pomPath);
    if (seenPomPaths.has(normalizedPomPath) || !fs.existsSync(normalizedPomPath)) {
      return;
    }
    seenPomPaths.add(normalizedPomPath);

    const pomContent = fs.readFileSync(normalizedPomPath, 'utf8');
    const moduleRefs = parsePomModules(pomContent);

    for (const moduleRef of moduleRefs) {
      const moduleDir = path.resolve(path.dirname(normalizedPomPath), moduleRef);
      const modulePomPath = path.join(moduleDir, 'pom.xml');
      if (!fs.existsSync(modulePomPath)) {
        continue;
      }

      const relativeDir = path.relative(projectDir, moduleDir).split(path.sep).join('/');
      const modulePomContent = fs.readFileSync(modulePomPath, 'utf8');
      const artifactId = parsePomArtifactId(modulePomContent);
      const stableName = sanitizeModuleStableName(artifactId)
        || sanitizeModuleStableName(normalizeModuleFallbackName(relativeDir))
        || 'module';

      if (!discovered.some((entry) => entry.relativeDir === relativeDir)) {
        discovered.push({
          artifactId,
          stableName,
          relativeDir,
          pomPath: modulePomPath,
        });
      }

      visitPom(modulePomPath);
    }
  };

  visitPom(paths.rootPomPath);

  const duplicateStableNames = uniqueDuplicateValues(discovered.map((entry) => entry.stableName));
  return {
    rootHasPom: true,
    isMultiModule: discovered.length > 0,
    modules: discovered.sort((a, b) => a.relativeDir.localeCompare(b.relativeDir)),
    duplicateStableNames,
  };
};

const moduleCodemapPath = ({ projectDir, moduleName }) => path.join(
  projectDir,
  'docs',
  'codemaps',
  'modules',
  `${moduleName}.md`,
);

const moduleCodemapRelativePath = (moduleName) => `docs/codemaps/modules/${moduleName}.md`;

const formatModuleSummary = (module) => {
  if (module.relativeDir.includes('/')) {
    return `Nested Maven module under \`${module.relativeDir.split('/').slice(0, -1).join('/')}\`.`;
  }
  return 'Top-level Maven module declared in explicit aggregation.';
};

const detectModuleEntryCandidates = ({ projectDir, module }) => {
  const moduleRoot = path.join(projectDir, module.relativeDir);
  const candidates = [
    'src/main/java',
    'src/main/kotlin',
    'src/main/resources',
    'src',
    'README.md',
  ];

  return candidates
    .filter((candidate) => fs.existsSync(path.join(moduleRoot, candidate)))
    .map((candidate) => path.posix.join(module.relativeDir, candidate))
    .slice(0, 4);
};

const detectInRepoModuleDependencies = ({ modules, module }) => {
  const prefix = `${module.relativeDir}/`;
  const childModules = modules
    .filter((candidate) => candidate.relativeDir.startsWith(prefix))
    .map((candidate) => candidate.stableName);
  const parentModule = modules.find((candidate) => module.relativeDir.startsWith(`${candidate.relativeDir}/`));
  const dependencies = [];

  if (parentModule) {
    dependencies.push(`Parent aggregate: \`${parentModule.stableName}\``);
  }
  if (childModules.length > 0) {
    dependencies.push(`Child modules: ${childModules.map((name) => `\`${name}\``).join(', ')}`);
  }
  if (dependencies.length === 0) {
    dependencies.push('No explicit in-repo module dependency inferred from aggregation.');
  }

  return dependencies;
};

const renderGeneratedModuleMap = ({ projectDir, modules }) => {
  const lines = [
    '## Generated Module Map',
    '',
    '> This section is maintained by `praxis-devos docs refresh` as a compatibility path. Prefer `/devos-docs-refresh` when host command wiring is available.',
    '',
    '## Modules',
    '',
  ];

  for (const module of modules) {
    const displayName = module.artifactId || module.stableName;
    lines.push(`- \`${displayName}\` — path \`${module.relativeDir}/\` — ${formatModuleSummary(module)}`);
  }

  return lines.join('\n');
};

const renderGeneratedModuleCodemap = ({ projectDir, module, modules }) => {
  const entryCandidates = detectModuleEntryCandidates({ projectDir, module });
  const dependencies = detectInRepoModuleDependencies({ modules, module });
  const displayName = module.artifactId || module.stableName;
  const lines = [
    '## Generated Module Overview',
    '',
    '> This section is maintained by `praxis-devos docs refresh` as a compatibility path. Prefer `/devos-docs-refresh` when host command wiring is available.',
    '',
    '## Module Identity',
    '',
    `- Name: \`${displayName}\``,
    `- Relative path: \`${module.relativeDir}/\``,
    `- pom.xml: \`${path.posix.join(module.relativeDir, 'pom.xml')}\``,
    '',
    '## Purpose',
    '',
    `- ${formatModuleSummary(module)}`,
    '',
    '## Key Entry Points Or Public Interfaces',
    '',
    ...(entryCandidates.length > 0
      ? entryCandidates.map((entry) => `- \`${entry}${entry.endsWith('.md') ? '' : '/'}\``)
      : ['- No obvious entry points detected yet.']),
    '',
    '## Important In-Repo Dependencies',
    '',
    ...dependencies.map((entry) => `- ${entry}`),
  ];

  return lines.join('\n');
};

const allowedDocsWriteTargets = ({ projectDir }) => {
  const discoveredModules = discoverMavenModules(projectDir);
  const targets = [
    ...DOCS_ALLOWED_TARGET_BASE,
    ...discoveredModules.modules.map((module) => moduleCodemapRelativePath(module.stableName)),
  ];
  return [...new Set(targets)];
};

const normalizeRepoRelativePath = ({ projectDir, filePath }) => {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    return '';
  }

  const trimmed = filePath.trim();
  const absoluteCandidate = path.resolve(projectDir, trimmed);
  const relative = path.relative(projectDir, absoluteCandidate);
  const normalized = relative
    .split(path.sep).join('/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');

  if (!normalized || normalized === '.' || normalized.startsWith('../') || normalized === '..') {
    return '';
  }

  return normalized;
};

const pathMatchesCandidate = (changedPath, candidatePath) => changedPath === candidatePath
  || changedPath.startsWith(`${candidatePath.replace(/\/+$/, '')}/`);

const moduleHintCandidates = (module) => [
  module.stableName,
  module.artifactId,
  module.relativeDir,
  path.posix.basename(module.relativeDir),
]
  .filter(Boolean)
  .map((value) => value.toLowerCase());

const findModuleFromHints = ({ modules, targetModuleHints }) => {
  const hints = [...new Set((targetModuleHints || [])
    .flatMap((value) => String(value || '').split(','))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean))];

  for (const hint of hints) {
    const matched = modules.find((module) => moduleHintCandidates(module).includes(hint));
    if (matched) {
      return { module: matched, reason: `target-hint:${hint}`, route: 'module-routing' };
    }
  }

  return null;
};

const findModuleFromChangedPaths = ({ modules, changedPaths }) => {
  let bestMatch = null;

  for (const changedPath of changedPaths || []) {
    let matched = null;
    for (const module of modules || []) {
      if (
        pathMatchesCandidate(changedPath, module.relativeDir)
        && (!matched || module.relativeDir.length > matched.relativeDir.length)
      ) {
        matched = module;
      }
    }

    if (matched) {
      if (!bestMatch || matched.relativeDir.length > bestMatch.module.relativeDir.length) {
        bestMatch = {
          module: matched,
          reason: `changed-path:${changedPath}`,
          route: 'module-routing',
        };
      }
    }
  }

  return bestMatch;
};

const findModuleFromChangeArtifacts = ({ projectDir, modules, changeArtifactPaths }) => {
  const artifactPaths = [...new Set((changeArtifactPaths || [])
    .map((entry) => normalizeRepoRelativePath({ projectDir, filePath: entry }))
    .filter(Boolean))];

  for (const artifactPath of artifactPaths) {
    const content = readFile(path.join(projectDir, artifactPath));
    if (!content) {
      continue;
    }
    const lowerContent = content.toLowerCase();

    for (const module of modules) {
      const candidates = moduleHintCandidates(module)
        .filter((value) => value.length >= 3)
        .sort((a, b) => b.length - a.length);

      if (candidates.some((candidate) => lowerContent.includes(candidate))) {
        return {
          module,
          reason: `change-artifact:${artifactPath}`,
          route: 'change-aware',
        };
      }
    }
  }

  return null;
};

const detectTargetModule = ({
  projectDir,
  modules,
  changedPaths = [],
  targetModuleHints = [],
  changeArtifactPaths = [],
}) => findModuleFromHints({ modules, targetModuleHints })
  || findModuleFromChangedPaths({ modules, changedPaths })
  || findModuleFromChangeArtifacts({ projectDir, modules, changeArtifactPaths });

export const buildDocsContextPack = ({
  projectDir,
  changedPaths = [],
  targetModuleHints = [],
  changeArtifactPaths = [],
}) => {
  const normalizedChangedPaths = [...new Set((changedPaths || [])
    .map((entry) => normalizeRepoRelativePath({ projectDir, filePath: entry }))
    .filter(Boolean))];
  const normalizedArtifactPaths = [...new Set((changeArtifactPaths || [])
    .map((entry) => normalizeRepoRelativePath({ projectDir, filePath: entry }))
    .filter(Boolean))];
  const discoveredModules = discoverMavenModules(projectDir);
  const routingMetadata = [];
  const seenPaths = new Set();

  const addRoute = (pathValue, route, reason) => {
    if (!pathValue || seenPaths.has(pathValue)) {
      return;
    }
    seenPaths.add(pathValue);
    routingMetadata.push({
      path: pathValue,
      route,
      reason,
    });
  };

  addRoute('docs/surfaces.yaml', 'default', 'canonical-surface');
  addRoute('docs/codemaps/project-overview.md', 'default', 'project-overview');

  let targetModule = null;
  if (discoveredModules.isMultiModule) {
    addRoute('docs/codemaps/module-map.md', 'module-routing', 'multi-module-project');
    targetModule = detectTargetModule({
      projectDir,
      modules: discoveredModules.modules,
      changedPaths: normalizedChangedPaths,
      targetModuleHints,
      changeArtifactPaths: normalizedArtifactPaths,
    });
    if (targetModule) {
      addRoute(
        moduleCodemapRelativePath(targetModule.module.stableName),
        targetModule.route,
        targetModule.reason,
      );
    }
  }

  return {
    schemaVersion: 1,
    canonicalSurfacesPath: 'docs/surfaces.yaml',
    selectedPaths: routingMetadata.map((entry) => entry.path),
    routingMetadata,
    multiModule: discoveredModules.isMultiModule,
    targetModule: targetModule?.module?.stableName || null,
    changedPaths: normalizedChangedPaths,
    changeArtifactPaths: normalizedArtifactPaths,
  };
};

const collectExistingDocsArtifacts = ({ projectDir }) => allowedDocsWriteTargets({ projectDir })
  .filter((relativePath) => fs.existsSync(path.join(projectDir, relativePath)));

const docsImpactFromChangeArtifacts = ({ projectDir, changeArtifactPaths }) => {
  const normalizedArtifactPaths = [...new Set((changeArtifactPaths || [])
    .map((entry) => normalizeRepoRelativePath({ projectDir, filePath: entry }))
    .filter(Boolean))];
  const rules = [
    { label: 'external surface', patterns: [/external surface/i, /primary surface/i] },
    { label: 'module topology', patterns: [/module topology/i, /module structure/i] },
    { label: 'project map', patterns: [/project map/i, /codemap/i] },
  ];

  const reasons = [];
  for (const artifactPath of normalizedArtifactPaths) {
    const content = readFile(path.join(projectDir, artifactPath));
    if (!content) {
      continue;
    }

    for (const rule of rules) {
      if (rule.patterns.some((pattern) => pattern.test(content))) {
        reasons.push(`change artifacts declare docs impact: ${rule.label} (${artifactPath})`);
      }
    }
  }

  return [...new Set(reasons)];
};

export const assessDocsRefreshNeed = ({
  projectDir,
  changedPaths = [],
  changeArtifactPaths = [],
}) => {
  const paths = projectPaths(projectDir);
  const surfacesContent = readFile(paths.surfacesPath) || '';
  const parsed = parseSurfacesYaml(surfacesContent);
  const primarySurface = parsed.surfaces.find((entry) => entry.id === parsed.primarySurface) || parsed.surfaces[0] || null;
  const normalizedChangedPaths = [...new Set((changedPaths || [])
    .map((entry) => normalizeRepoRelativePath({ projectDir, filePath: entry }))
    .filter(Boolean))];
  const reasons = [];
  const discoveredModules = discoverMavenModules(projectDir);
  const topologyInputs = [
    fs.existsSync(paths.rootPomPath) ? 'pom.xml' : null,
    ...discoveredModules.modules.map((module) => path.posix.join(module.relativeDir, 'pom.xml')),
  ].filter(Boolean);
  const entryCandidates = collectEntryCandidates({
    projectDir,
    primarySurfaceLocation: primarySurface?.location || '',
  });

  if (normalizedChangedPaths.some((entry) => entry === 'docs/surfaces.yaml')) {
    reasons.push('changed paths hit docs/surfaces.yaml');
  }

  if (primarySurface?.location && normalizedChangedPaths.some((entry) => pathMatchesCandidate(entry, primarySurface.location))) {
    reasons.push(`changed paths hit primary surface location: ${primarySurface.location}`);
  }

  if (normalizedChangedPaths.some((entry) => topologyInputs.some((candidate) => pathMatchesCandidate(entry, candidate)))) {
    reasons.push('changed paths hit module topology input');
  }

  if (normalizedChangedPaths.some((entry) => entryCandidates.some((candidate) => pathMatchesCandidate(entry, candidate)))) {
    reasons.push('changed paths hit entry candidate');
  }

  reasons.push(...docsImpactFromChangeArtifacts({
    projectDir,
    changeArtifactPaths,
  }));

  return {
    needed: reasons.length > 0,
    reasons: [...new Set(reasons)],
  };
};


export const buildDocsSubagentRequest = ({
  projectDir,
  mode,
  changeId = '',
  changeArtifactPaths = [],
  changedPaths = [],
  targetModuleHints = [],
}) => {
  if (!['init', 'refresh'].includes(mode)) {
    throw new Error(`Unsupported docs subagent mode: ${mode}`);
  }

  const paths = projectPaths(projectDir);
  const surfacesContent = readFile(paths.surfacesPath) || '';
  const parsed = parseSurfacesYaml(surfacesContent);
  const primarySurface = parsed.primarySurface || '';
  const surface = parsed.surfaces.find((entry) => entry.id === primarySurface) || parsed.surfaces[0] || null;
  const discoveredModules = discoverMavenModules(projectDir);
  const docsContextPack = buildDocsContextPack({
    projectDir,
    changedPaths,
    targetModuleHints,
    changeArtifactPaths,
  });
  const normalizedChangedPaths = docsContextPack.changedPaths;
  const normalizedArtifactPaths = docsContextPack.changeArtifactPaths;

  return {
    schemaVersion: 1,
    mode,
    canonicalSurfacesPath: 'docs/surfaces.yaml',
    allowedTargets: allowedDocsWriteTargets({ projectDir }),
    readPaths: [...new Set([
      ...docsContextPack.selectedPaths,
      ...collectPreferredReadPaths({
      projectDir,
      primarySurfaceLocation: surface?.location || '',
    }),
    ])],
    docsContextPack,
    refreshContext: mode === 'refresh'
      ? {
        changeId,
        changeArtifactPaths: normalizedArtifactPaths,
        changedPaths: normalizedChangedPaths,
        targetModuleHints: [...new Set((targetModuleHints || []).map((entry) => String(entry || '').trim()).filter(Boolean))],
        existingDocsArtifacts: collectExistingDocsArtifacts({ projectDir }),
      }
      : null,
    context: {
      primarySurface,
      primarySurfaceKind: surface?.kind || '',
      primarySurfaceLocation: surface?.location || '',
      mavenMultiModule: discoveredModules.isMultiModule,
      discoveredModules: discoveredModules.modules.map((module) => ({
        artifactId: module.artifactId,
        stableName: module.stableName,
        relativeDir: module.relativeDir,
      })),
    },
  };
};

export const validateDocsGenerationResult = ({ projectDir, result }) => {
  const findings = [];
  const allowedTargets = allowedDocsWriteTargets({ projectDir });
  const discoveredModules = discoverMavenModules(projectDir);
  const allowedModuleNames = new Set(discoveredModules.modules.map((module) => module.stableName));

  for (const duplicateName of discoveredModules.duplicateStableNames || []) {
    findings.push(`Duplicate module codemap name detected: ${duplicateName}`);
  }

  if (!result || typeof result !== 'object') {
    return {
      status: 'invalid',
      findings: ['Docs generation result must be an object'],
      allowedTargets,
    };
  }

  if (result.schemaVersion !== 1) {
    findings.push('schemaVersion is required and must equal 1');
  }

  if (!['init', 'refresh'].includes(result.mode)) {
    findings.push('mode is required and must be either init or refresh');
  }

  if (typeof result.surfacesYaml !== 'string' || !result.surfacesYaml.trim()) {
    findings.push('surfacesYaml is required and must be non-empty');
  }

  if (!Array.isArray(result.codemaps)) {
    findings.push('codemaps must be an array');
  } else {
    const seenPaths = new Set();
    for (const [index, codemap] of result.codemaps.entries()) {
      const pathValue = typeof codemap?.path === 'string' ? codemap.path.trim() : '';
      const contentValue = typeof codemap?.content === 'string' ? codemap.content.trim() : '';
      const actionValue = codemap?.action;

      if (!pathValue) {
        findings.push(`codemaps[${index}].path is required and must be non-empty`);
      } else {
        if (seenPaths.has(pathValue)) {
          findings.push(`Duplicate codemap path detected: ${pathValue}`);
        }
        seenPaths.add(pathValue);

        if (!allowedTargets.includes(pathValue)) {
          findings.push(`Path is outside the allowed target set: ${pathValue}`);
        }

        if (pathValue === 'contracts/surfaces.yaml') {
          findings.push('contracts/surfaces.yaml is not a valid write target');
        }

        const modulePathMatch = pathValue.match(/^docs\/codemaps\/modules\/(.+)\.md$/);
        if (modulePathMatch && !allowedModuleNames.has(modulePathMatch[1])) {
          findings.push(`Module codemap path does not match a discovered module: ${pathValue}`);
        }
      }

      if (!contentValue) {
        findings.push(`codemaps[${index}].content is required and must be non-empty`);
      }

      if (actionValue !== 'upsert') {
        findings.push(`codemaps[${index}].action must equal "upsert"`);
      }
    }
  }

  return {
    status: findings.length === 0 ? 'valid' : 'invalid',
    findings,
    allowedTargets,
  };
};

const hasPlaceholderText = (content) => DOCS_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(content));

const ensureDocsLiteTemplate = () => {
  if (!fs.existsSync(DOCS_LITE_TEMPLATE_ROOT)) {
    throw new Error(`Docs-lite template root is missing: ${DOCS_LITE_TEMPLATE_ROOT}`);
  }
};

export const ensureDocsLiteSkeleton = ({ projectDir, log = () => {} }) => {
  ensureDocsLiteTemplate();

  const created = [];
  for (const relativePath of DOCS_LITE_TEMPLATE_FILES) {
    const srcPath = path.join(DOCS_LITE_TEMPLATE_ROOT, relativePath);
    const dstPath = path.join(projectDir, relativePath);
    if (!fs.existsSync(dstPath)) {
      copyFile(srcPath, dstPath);
      created.push(relativePath);
      log(`✓ Seeded ${relativePath}`);
    }
  }

  if (created.length === 0) {
    log('⊘ docs-lite skeleton already present');
  }

  return created;
};

export const initDocsLite = ({ projectDir }) => {
  const logs = [];
  const log = (msg) => logs.push(msg);
  ensureDocsLiteSkeleton({ projectDir, log });
  const refreshLogs = refreshDocsLite({ projectDir });
  if (refreshLogs) {
    logs.push(refreshLogs);
  }
  logs.push('✓ Initialized docs-lite compatibility skeleton');
  return logs.join('\n');
};

export const refreshDocsLite = ({ projectDir }) => {
  const logs = [];
  const log = (msg) => logs.push(msg);
  ensureDocsLiteSkeleton({ projectDir, log });

  const paths = projectPaths(projectDir);
  const status = upsertManagedBlockInPlace(
    paths.codemapOverviewPath,
    CODEMAP_MANAGED_START,
    CODEMAP_MANAGED_END,
    renderGeneratedProjectOverview({ projectDir }),
    codemapFallbackContent('Project Overview'),
  );

  log(`✓ Refreshed docs-lite codemap (${status})`);

  const discoveredModules = discoverMavenModules(projectDir);
  if (discoveredModules.isMultiModule) {
    const moduleMapStatus = upsertManagedBlockInPlace(
      paths.codemapModuleMapPath,
      CODEMAP_MANAGED_START,
      CODEMAP_MANAGED_END,
      renderGeneratedModuleMap({ projectDir, modules: discoveredModules.modules }),
      codemapFallbackContent('Module Map'),
    );
    log(`✓ Refreshed docs-lite module map (${moduleMapStatus})`);

    for (const module of discoveredModules.modules) {
      const modulePath = moduleCodemapPath({ projectDir, moduleName: module.stableName });
      const moduleStatus = upsertManagedBlockInPlace(
        modulePath,
        CODEMAP_MANAGED_START,
        CODEMAP_MANAGED_END,
        renderGeneratedModuleCodemap({ projectDir, module, modules: discoveredModules.modules }),
        codemapFallbackContent(`Module ${module.stableName}`),
      );
      log(`✓ Refreshed docs-lite module codemap (${module.stableName}: ${moduleStatus})`);
    }
  }

  return logs.join('\n');
};

export const checkDocsLite = ({ projectDir }) => {
  const paths = projectPaths(projectDir);
  const findings = [];
  const lines = [
    'Docs check',
    `project: ${projectDir}`,
  ];

  const codemapExists = fs.existsSync(paths.codemapOverviewPath);
  lines.push(`- docs/codemaps/project-overview.md: ${codemapExists ? 'ok' : 'missing'}`);
  if (!codemapExists) {
    findings.push('Missing docs/codemaps/project-overview.md');
  }

  const surfacesExists = fs.existsSync(paths.surfacesPath);
  lines.push(`- docs/surfaces.yaml: ${surfacesExists ? 'ok' : 'missing'}`);
  if (!surfacesExists) {
    findings.push('Missing docs/surfaces.yaml');
  }

  const nonCanonicalSurfacesExists = fs.existsSync(paths.nonCanonicalSurfacesPath);
  lines.push(`- contracts/surfaces.yaml: ${nonCanonicalSurfacesExists ? 'conflict' : 'absent'}`);
  if (nonCanonicalSurfacesExists) {
    findings.push('Conflict: contracts/surfaces.yaml exists but docs/surfaces.yaml is the canonical path');
  }

  if (codemapExists) {
    const codemapContent = fs.readFileSync(paths.codemapOverviewPath, 'utf8');
    if (!codemapContent.trim()) {
      findings.push('docs/codemaps/project-overview.md is blank');
    } else if (hasPlaceholderText(codemapContent)) {
      findings.push('Placeholder text remains in docs/codemaps/project-overview.md');
    }
  }

  if (surfacesExists) {
    const surfacesContent = fs.readFileSync(paths.surfacesPath, 'utf8');
    if (!surfacesContent.trim()) {
      findings.push('docs/surfaces.yaml is blank');
    } else if (hasPlaceholderText(surfacesContent)) {
      findings.push('Placeholder text remains in docs/surfaces.yaml');
    }

    const parsed = parseSurfacesYaml(surfacesContent);
    if (!parsed.primarySurface) {
      findings.push('Missing primary_surface in docs/surfaces.yaml');
    }

    if (parsed.primarySurface && !parsed.surfaces.some((surface) => surface.id === parsed.primarySurface)) {
      findings.push(`primary_surface "${parsed.primarySurface}" not found in surfaces list`);
    }

    parsed.surfaces.forEach((surface, index) => {
      for (const field of ['id', 'kind', 'location']) {
        if (!surface[field]) {
          findings.push(`Surface #${index + 1} is missing ${field}`);
        }
      }
    });
  }

  const discoveredModules = discoverMavenModules(projectDir);
  if (discoveredModules.isMultiModule) {
    const moduleMapExists = fs.existsSync(paths.codemapModuleMapPath);
    lines.push(`- docs/codemaps/module-map.md: ${moduleMapExists ? 'ok' : 'missing'}`);
    if (!moduleMapExists) {
      findings.push('Missing docs/codemaps/module-map.md for detected Maven multi-module project');
    } else {
      const moduleMapContent = fs.readFileSync(paths.codemapModuleMapPath, 'utf8');
      if (!moduleMapContent.trim()) {
        findings.push('docs/codemaps/module-map.md is blank');
      } else if (hasPlaceholderText(moduleMapContent)) {
        findings.push('Placeholder text remains in docs/codemaps/module-map.md');
      }
    }

    const seenModuleNames = new Set();
    for (const module of discoveredModules.modules) {
      if (seenModuleNames.has(module.stableName)) {
        findings.push(`Duplicate module codemap name detected: ${module.stableName}`);
        continue;
      }
      seenModuleNames.add(module.stableName);

      const modulePath = moduleCodemapPath({ projectDir, moduleName: module.stableName });
      const relativeModulePath = formatRelativePath(projectDir, modulePath);
      if (!fs.existsSync(modulePath)) {
        findings.push(`Missing ${relativeModulePath}`);
        continue;
      }

      const moduleContent = fs.readFileSync(modulePath, 'utf8');
      if (!moduleContent.trim()) {
        findings.push(`${relativeModulePath} is blank`);
      } else if (hasPlaceholderText(moduleContent)) {
        findings.push(`Placeholder text remains in ${relativeModulePath}`);
      }
    }
  }

  lines.push(`status: ${findings.length === 0 ? 'pass' : 'needs-attention'}`);
  if (findings.length === 0) {
    lines.push('findings: none');
  } else {
    lines.push('findings:');
    for (const finding of findings) {
      lines.push(`- ${finding}`);
    }
  }

  return lines.join('\n');
};

const ensureOpenSpecLayout = ({ projectDir, log }) => {
  const runtime = resolveOpenSpecRuntime(projectDir);
  if ((runtime.status !== 'ok' && runtime.status !== 'warning') || !runtime.command) {
    throw new Error(
      `OpenSpec is required before project initialization. ${runtime.detail}`,
    );
  }

  const initResult = runFile(runtime.command, ['init', projectDir, '--tools', 'none', '--force'], {
    cwd: projectDir,
  });
  if (initResult.ok) {
    log(`✓ openspec init completed (${runtime.source})`);
    return;
  }

  throw new Error(`OpenSpec init failed: ${initResult.stderr}`);
};

const ensureFrameworkFiles = ({ projectDir, log }) => {
  const openspecDir = path.join(projectDir, 'openspec');
  const dirsToEnsure = [
    path.join(openspecDir, 'specs'),
    path.join(openspecDir, 'changes'),
    path.join(openspecDir, 'changes', 'archive'),
  ];
  for (const dir of dirsToEnsure) {
    fs.mkdirSync(dir, { recursive: true });
  }

  log('✓ OpenSpec directory structure ensured');
};

const renderManagedEntryTemplate = () => {
  const template = readFile(MANAGED_ENTRY_TEMPLATE);
  if (!template) {
    throw new Error(`Managed entry template is missing: ${MANAGED_ENTRY_TEMPLATE}`);
  }

  return template;
};

const renderManagedBlock = () => {
  return renderManagedEntryTemplate();
};

const renderClaudeManagedBlock = () => {
  return [
    '@AGENTS.md',
    '',
    '> Claude Code 通过 `CLAUDE.md` 读取项目指令；共享项目规则统一维护在 `AGENTS.md`。',
    '> 如需 Claude 专属补充，请只在此文件追加少量差异内容，不要复制 `AGENTS.md` 全文。',
  ].join('\n');
};

const syncCodexAdapter = ({ projectDir, log }) => {
  const paths = projectPaths(projectDir);
  const status = upsertManagedBlock(
    paths.rootAgentsMd,
    AGENTS_MANAGED_START,
    AGENTS_MANAGED_END,
    renderManagedBlock(),
    AGENTS_MD_TEMPLATE,
  );

  log(`✓ Codex adapter synced via AGENTS.md (${status})`);
};

const syncClaudeAdapter = ({ projectDir, log }) => {
  const paths = projectPaths(projectDir);

  const agentsStatus = upsertManagedBlock(
    paths.rootAgentsMd,
    AGENTS_MANAGED_START,
    AGENTS_MANAGED_END,
    renderManagedBlock(),
    AGENTS_MD_TEMPLATE,
  );
  log(`✓ Claude Code adapter synced via AGENTS.md (${agentsStatus})`);

  const claudeStatus = upsertManagedBlock(
    paths.rootClaudeMd,
    CLAUDE_MANAGED_START,
    CLAUDE_MANAGED_END,
    renderClaudeManagedBlock(),
    CLAUDE_MD_TEMPLATE,
  );
  log(`✓ Claude Code adapter synced via CLAUDE.md (${claudeStatus})`);
};

const syncOpenCodeAdapter = ({ projectDir, log }) => {
  const paths = projectPaths(projectDir);

  ensureDir(paths.legacyOpenCodeDir);
  writeText(path.join(paths.legacyOpenCodeDir, 'README.md'), `${OPENCODE_ADAPTER_README}\n`);
  log('✓ OpenCode adapter synced to .opencode/');

  const status = upsertManagedBlock(
    paths.rootAgentsMd,
    AGENTS_MANAGED_START,
    AGENTS_MANAGED_END,
    renderManagedBlock(),
    AGENTS_MD_TEMPLATE,
  );
  log(`✓ OpenCode adapter synced via AGENTS.md (${status})`);
};

const syncAgent = ({ projectDir, agent, log }) => {
  if (agent === 'codex') {
    syncCodexAdapter({ projectDir, log });
    return;
  }

  if (agent === 'claude') {
    syncClaudeAdapter({ projectDir, log });
    return;
  }

  if (agent === 'opencode') {
    syncOpenCodeAdapter({ projectDir, log });
    return;
  }

  throw new Error(`Unsupported agent: ${agent}`);
};

export const syncProject = ({ projectDir, agents = SUPPORTED_AGENTS }) => {
  const logs = [];
  const log = (msg) => logs.push(msg);

  const selectedAgents = uniqueAgents(agents);
  ensureDocsLiteSkeleton({ projectDir, log });
  const refreshLogs = refreshDocsLite({ projectDir });
  if (refreshLogs) {
    logs.push(refreshLogs);
  }

  for (const agent of selectedAgents) {
    syncAgent({ projectDir, agent, log });
  }

  log(`✓ Synced adapters: ${selectedAgents.join(', ')}`);
  return logs.join('\n');
};

export const initProject = ({ projectDir, agents = SUPPORTED_AGENTS }) => {
  const logs = [];
  const log = (msg) => logs.push(msg);

  const selectedAgents = uniqueAgents(agents);

  ensureOpenSpecLayout({ projectDir, log });
  ensureFrameworkFiles({ projectDir, log });

  const syncLogs = syncProject({ projectDir, agents: selectedAgents });
  if (syncLogs) {
    logs.push(syncLogs);
  }

  return logs.join('\n');
};

const isProjectInitialized = (projectDir) => {
  const paths = projectPaths(projectDir);
  return fs.existsSync(paths.openspecDir);
};

export const projectNativeSkills = ({ projectDir, agents, log }) => {
  const version = getPackageVersion();
  for (const agent of uniqueAgents(agents)) {
    try {
      projectToAgent({ agent, projectDir, version, log });
    } catch (err) {
      log(`⚠ Projection to ${agent} failed: ${err.message}`);
    }
  }
};

export const populateOpenSpecConfig = ({ projectDir, log }) => {
  const configPath = path.join(projectDir, 'openspec', 'config.yaml');
  if (!fs.existsSync(configPath)) {
    log('⊘ openspec/config.yaml not found, skipping context population');
    return;
  }

  const content = fs.readFileSync(configPath, 'utf8');
  if (content.includes('context:') && !content.includes('# context:') && !content.includes('context: |')) {
    log('⊘ openspec/config.yaml already has custom context, skipping');
    return;
  }

  log('⊘ No stack context to populate into openspec/config.yaml');
};

export const setupProject = ({ projectDir, agents = SUPPORTED_AGENTS, strict = false }) => {
  const selectedAgents = uniqueAgents(agents);
  const outputs = [];

  outputs.push(ensureOpenSpecRuntime(projectDir));
  outputs.push('');
  outputs.push(ensureRuntimeDependencies({ projectDir, agents: selectedAgents }));
  outputs.push('');

  if (!isProjectInitialized(projectDir)) {
    outputs.push('== setup ==');
    outputs.push(initProject({ projectDir, agents: selectedAgents }));
  } else {
    outputs.push('== setup ==');
    outputs.push('Project already initialized; refreshing selected agents and managed adapters.');
    outputs.push(syncProject({ projectDir, agents: selectedAgents }));
  }

  const projLogs = [];
  const projLog = (msg) => projLogs.push(msg);
  projectNativeSkills({ projectDir, agents: selectedAgents, log: projLog });
  populateOpenSpecConfig({ projectDir, log: projLog });
  if (projLogs.length > 0) {
    outputs.push('');
    outputs.push('== native projection ==');
    outputs.push(projLogs.join('\n'));
  }

  outputs.push('');
  outputs.push(doctorProject({ projectDir, agents: selectedAgents, strict }));

  return outputs.filter(Boolean).join('\n');
};

export const migrateProject = ({ projectDir, agents = SUPPORTED_AGENTS }) => {
  const logs = [];
  const log = (msg) => logs.push(msg);

  log('✓ Migration completed (no .praxis assets to migrate)');

  const syncLogs = syncProject({ projectDir, agents });
  if (syncLogs) {
    logs.push(syncLogs);
  }

  return logs.join('\n');
};

export const statusProject = ({ projectDir, agents = SUPPORTED_AGENTS }) => {
  const paths = projectPaths(projectDir);
  const selectedAgents = uniqueAgents(agents);
  const activeChangesDir = path.join(paths.openspecDir, 'changes');
  const activeChanges = listDirs(activeChangesDir).filter((name) => !name.startsWith('.'));
  const adapterStatuses = [
    { name: 'codex', ok: fs.existsSync(paths.rootAgentsMd) },
    { name: 'claude', ok: fs.existsSync(paths.rootClaudeMd) },
    { name: 'opencode', ok: fs.existsSync(paths.legacyOpenCodeDir) },
  ];
  const openspecRuntime = resolveOpenSpecRuntime(projectDir);
  const dependencyLines = [
    `- openspec: [${formatStatus(openspecRuntime.status)}] ${openspecRuntime.detail}`,
    ...selectedAgents.map((agent) => {
      const detection = detectSuperpowersForAgent(projectDir, agent);
      return `- superpowers:${agent}: [${formatStatus(detection.status)}] ${detection.detail}`;
    }),
  ];

  const lines = [
    'Project status:',
    `- initialized: ${fs.existsSync(paths.openspecDir) ? 'yes' : 'no'}`,
    `- openspec workspace: ${fs.existsSync(paths.openspecDir) ? 'present' : 'missing'}`,
    `- framework version: ${getPackageVersion()}`,
  ];

  lines.push(`- adapters: ${adapterStatuses.map((adapter) => `${adapter.name}=${adapter.ok ? 'ready' : 'missing'}`).join(', ')}`);
  lines.push(`- active changes: ${activeChanges.length > 0 ? activeChanges.join(', ') : 'none'}`);
  lines.push('');
  lines.push('Dependencies:');
  lines.push(...dependencyLines);

  return lines.join('\n');
};

const normalizeChangeId = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .replace(/-{2,}/g, '-');

const normalizeCapability = (value) => normalizeChangeId(value).replace(/^-+|-+$/g, '') || 'general';

const deriveChangeId = (title) => {
  const normalized = normalizeChangeId(title);
  return normalized || 'change';
};

const deriveCapability = ({ capability, changeId }) => {
  if (capability) {
    return normalizeCapability(capability);
  }

  const parts = normalizeChangeId(changeId).split('-').filter(Boolean);
  if (parts.length > 1) {
    return normalizeCapability(parts.slice(1).join('-'));
  }

  return 'general';
};

const validateChangeType = (value) => {
  const normalized = String(value || 'auto').trim().toLowerCase();
  if (['auto', 'full', 'lite'].includes(normalized)) {
    return normalized;
  }

  throw new Error(`Unsupported change type: ${value}. Use auto, full, or lite.`);
};

const renderProposalContent = ({ title, summary, changeId, capability, type }) => {
  const why = summary?.trim() || `需要为“${title}”建立 OpenSpec 提案，并补齐范围与验收边界。`;
  const proposalLines = [
    `# 变更：${title}`,
    '',
    '## 为什么',
    why,
    '',
    '## 变更内容',
    `- 为 \`${capability}\` 能力创建 ${type === 'lite' ? '轻量' : '完整'}提案`,
    '- 补充或更新对应 spec delta',
    '- 提案获批后再进入实现与建分支',
    '',
    '## 影响范围',
    `- 影响规范：${capability}`,
    '- 影响代码：待补充',
    '',
    '## 备注',
    `- change-id: \`${changeId}\``,
  ];

  return `${proposalLines.join('\n')}\n`;
};

const renderTasksContent = () => `## 1. 实现任务
- [ ] 1.1 细化提案范围与影响面
- [ ] 1.2 补充 spec delta 与场景
- [ ] 1.3 提案获批后进入实现
- [ ] 1.4 完成前执行验证与回归检查
`;

const renderSpecDeltaContent = ({ title }) => `## ADDED Requirements
### Requirement: ${title}
TODO: 补充该需求的规范性描述，使用 MUST / SHALL 表达行为约束。

#### Scenario: 待补充主场景
- **WHEN** 待补充触发条件
- **THEN** 待补充预期结果
`;

export const createChangeScaffold = ({
  projectDir,
  title,
  changeId = null,
  capability = null,
  type = 'auto',
  summary = '',
}) => {
  const paths = projectPaths(projectDir);

  if (!fs.existsSync(paths.openspecDir)) {
    throw new Error('OpenSpec workspace is missing. Run `npx praxis-devos setup --agent <name>` first.');
  }

  const trimmedTitle = String(title || '').trim();
  if (!trimmedTitle) {
    throw new Error('Change title is required. Pass it with `--title` or as a positional argument.');
  }

  const resolvedType = validateChangeType(type);
  const effectiveType = resolvedType === 'auto' ? 'full' : resolvedType;
  const nextChangeId = normalizeChangeId(changeId) || deriveChangeId(trimmedTitle);
  const nextCapability = deriveCapability({ capability, changeId: nextChangeId });
  const changeDir = path.join(paths.openspecDir, 'changes', nextChangeId);
  const proposalPath = path.join(changeDir, 'proposal.md');
  const tasksPath = path.join(changeDir, 'tasks.md');
  const specPath = path.join(changeDir, 'specs', nextCapability, 'spec.md');

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextChangeId)) {
    throw new Error(`Invalid change-id: ${nextChangeId}. Use kebab-case.`);
  }

  if (fs.existsSync(changeDir)) {
    throw new Error(`Change "${nextChangeId}" already exists at ${changeDir}`);
  }

  writeText(
    proposalPath,
    renderProposalContent({
      title: trimmedTitle,
      summary,
      changeId: nextChangeId,
      capability: nextCapability,
      type: effectiveType,
    }),
  );

  if (effectiveType === 'full') {
    writeText(tasksPath, renderTasksContent());
  }

  writeText(specPath, renderSpecDeltaContent({ title: trimmedTitle }));

  const created = [
    path.relative(projectDir, proposalPath),
    effectiveType === 'full' ? path.relative(projectDir, tasksPath) : null,
    path.relative(projectDir, specPath),
  ].filter(Boolean);

  const lines = [
    `Created OpenSpec ${effectiveType === 'lite' ? 'lightweight' : 'full'} change scaffold: ${nextChangeId}`,
    `- capability: ${nextCapability}`,
    ...created.map((file) => `- ${file}`),
    '',
    'Next steps:',
    '- refine proposal.md and spec delta before validation',
    `- run: openspec validate ${nextChangeId} --strict --no-interactive`,
    '- request approval before implementation',
    '- after approval, create the implementation branch and start coding',
  ];

  if (resolvedType === 'auto') {
    lines.splice(1, 0, '- type: auto -> full (safer default)');
  }

  return lines.join('\n');
};

const readProjectJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
};

const writeProjectJson = (filePath, value) => {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const readJsonFileWithRaw = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {
      ok: true,
      exists: false,
      raw: null,
      value: null,
    };
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return {
      ok: true,
      exists: true,
      raw,
      value: JSON.parse(raw),
    };
  } catch (error) {
    return {
      ok: false,
      exists: true,
      raw: readFile(filePath),
      error,
    };
  }
};

const backupFile = (filePath) => {
  const backupPath = `${filePath}.bak-${Date.now()}`;
  ensureDir(path.dirname(backupPath));
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
};

const isPlainObject = (value) => value != null && typeof value === 'object' && !Array.isArray(value);

const validateOpenCodeConfigShape = (configPath, config) => {
  if (!isPlainObject(config)) {
    throw new Error(`Cannot safely merge OpenCode config at ${configPath}: expected a JSON object at the top level.`);
  }

  if (Object.prototype.hasOwnProperty.call(config, 'plugin') && !Array.isArray(config.plugin)) {
    throw new Error(`Cannot safely merge OpenCode config at ${configPath}: expected "plugin" to be an array.`);
  }
};

const mergeOpenCodePlugins = (config) => ({
  ...config,
  plugin: [...new Set([
    ...(Array.isArray(config.plugin) ? config.plugin : []),
    PRAXIS_OPENCODE_PLUGIN,
    SUPERPOWERS_OPENCODE_PLUGIN,
  ])],
});

const ensureOpenCodePluginsConfigured = () => {
  const configPath = globalOpencodeConfigPath();
  ensureDir(path.dirname(configPath));

  const current = readJsonFileWithRaw(configPath);
  if (!current.ok) {
    let backupPath = null;
    try {
      backupPath = backupFile(configPath);
    } catch (backupError) {
      throw new Error(`Cannot safely merge OpenCode config at ${configPath}. Failed to back up the original file: ${backupError.message}. Left the config unchanged.`);
    }
    throw new Error(`Cannot safely merge OpenCode config at ${configPath}. Backed up the original file to ${backupPath} and left the config unchanged.`);
  }

  const config = current.value ?? {};
  let backupPath = null;
  let tempPath = null;

  try {
    validateOpenCodeConfigShape(configPath, config);
    const next = mergeOpenCodePlugins(config);
    const nextText = `${JSON.stringify(next, null, 2)}\n`;

    if (current.raw === nextText) {
      return {
        changed: false,
        configPath,
        backupPath: null,
      };
    }

    backupPath = current.exists ? backupFile(configPath) : null;
    tempPath = `${configPath}.tmp-${process.pid}-${Date.now()}`;
    writeText(tempPath, nextText);
    fs.renameSync(tempPath, configPath);

    return {
      changed: true,
      configPath,
      backupPath,
    };
  } catch (error) {
    if (tempPath && fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    if (!backupPath && current.exists) {
      backupPath = backupFile(configPath);
    }

    const backupNote = backupPath ? ` Backed up the original file to ${backupPath}.` : '';
    throw new Error(`${error.message}${backupNote} Left the config unchanged.`);
  }
};

const detectOpenCodeSuperpowers = () => {
  const configPath = globalOpencodeConfigPath();
  const config = readProjectJson(configPath);

  if (!config) {
    return {
      status: 'missing',
      detail: `Missing ${configPath}`,
    };
  }

  const plugins = Array.isArray(config.plugin) ? config.plugin : [];
  const hasSuperpowers = plugins.some((entry) =>
    typeof entry === 'string' && (
      entry.startsWith('superpowers@') || entry.includes('github.com/obra/superpowers')
    ));

  return hasSuperpowers
    ? { status: 'ok', detail: `superpowers plugin declared in ${configPath}` }
    : { status: 'missing', detail: `superpowers plugin not declared in ${configPath}` };
};

const ensureOpenSpecRuntime = (projectDir) => {
  const logs = [];
  const current = resolveOpenSpecRuntime(projectDir);

  if (isGlobalOpenSpecRuntime(current)) {
    logs.push(`== openspec ==`);
    logs.push(`⊘ OpenSpec already available (${current.source})`);
    logs.push(`- ${current.detail}`);
    return logs.join('\n');
  }

  if (!commandExists('npm')) {
    throw new Error('npm is required to install OpenSpec automatically. Install npm, then rerun `npx praxis-devos setup --agent <name>`.');
  }

  const npmCommand = resolveCommandForExecution('npm');
  const installResult = runFile(npmCommand, ['install', '-g', OPENSPEC_PACKAGE], {
    cwd: projectDir,
  });
  if (!installResult.ok) {
    throw new Error(`Automatic OpenSpec install failed: ${installResult.stderr}`);
  }

  const next = resolveOpenSpecRuntime(projectDir);
  if (!isGlobalOpenSpecRuntime(next)) {
    throw new Error(`OpenSpec install completed but global runtime is still unavailable: ${next.detail}`);
  }

  logs.push('== openspec ==');
  logs.push(`✓ Installed OpenSpec globally with npm (user-level command) (${OPENSPEC_PACKAGE})`);
  logs.push(`- ${next.detail}`);
  return logs.join('\n');
};

const ensureOpenCodeSuperpowers = () => {
  const result = ensureOpenCodePluginsConfigured();
  const lines = [`Configured OpenCode plugins in ${result.configPath}`];

  if (result.backupPath) {
    lines.push(`Backed up existing OpenCode config to ${result.backupPath}`);
  }

  if (!result.changed) {
    lines.push('OpenCode plugin config already contained the required plugins');
  }

  return lines.join('\n');
};

const detectCodexSuperpowers = () => {
  const { skillsPath, clonePath } = codexSuperpowersPaths();
  const cloneSkillsPath = path.join(clonePath, 'skills');

  if (fs.existsSync(skillsPath)) {
    if (!hasSkillMarkdownFiles(skillsPath)) {
      return {
        status: 'warning',
        detail: `Detected Codex skills path at ${skillsPath}, but no SKILL.md files were found`,
      };
    }

    return {
      status: 'ok',
      detail: `Detected Codex skills path with skill content at ${skillsPath}`,
    };
  }

  if (fs.existsSync(clonePath)) {
    if (!fs.existsSync(cloneSkillsPath)) {
      return {
        status: 'warning',
        detail: `Found clone at ${clonePath}, but ${cloneSkillsPath} is missing`,
      };
    }

    if (!hasSkillMarkdownFiles(cloneSkillsPath)) {
      return {
        status: 'warning',
        detail: `Found clone at ${clonePath}, but ${cloneSkillsPath} has no SKILL.md files`,
      };
    }

    return {
      status: 'warning',
      detail: `Found clone at ${clonePath}, but ~/.codex/skills/superpowers is missing`,
    };
  }

  return {
    status: 'missing',
    detail: 'Codex superpowers install not detected',
  };
};

const ensureCodexSuperpowers = () => {
  const { skillsPath, skillsParent, clonePath, cloneParent } = codexSuperpowersPaths();
  const logs = [];

  const current = detectCodexSuperpowers();
  if (current.status === 'ok') {
    logs.push(`⊘ Codex SuperPowers already installed at ${skillsPath}`);
    return logs.join('\n');
  }

  if (!commandExists('git')) {
    throw new Error('Git is required to install Codex SuperPowers automatically. Install Git, then rerun `npx praxis-devos setup --agent codex`.');
  }

  ensureDir(cloneParent);
  ensureDir(skillsParent);

  if (!fs.existsSync(clonePath)) {
    const cloneResult = runFile('git', ['clone', SUPERPOWERS_GIT_URL, clonePath]);
    if (!cloneResult.ok) {
      throw new Error(`Automatic Codex SuperPowers clone failed: ${cloneResult.stderr}`);
    }
    logs.push(`✓ Cloned Codex SuperPowers to ${clonePath}`);
  } else {
    logs.push(`⊘ Codex SuperPowers clone already exists at ${clonePath}`);
  }

  const targetPath = path.join(clonePath, 'skills');
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Codex SuperPowers clone is incomplete: missing ${targetPath}`);
  }

  if (!hasSkillMarkdownFiles(targetPath)) {
    throw new Error(`Codex SuperPowers clone is incomplete: no SKILL.md files found under ${targetPath}`);
  }

  if (!fs.existsSync(skillsPath)) {
    try {
      fs.symlinkSync(targetPath, skillsPath, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (err) {
      throw new Error(`Automatic Codex SuperPowers link creation failed: ${err.message}`);
    }
    logs.push(`✓ Linked Codex SuperPowers skills at ${skillsPath}`);
  } else {
    logs.push(`⊘ Codex SuperPowers skills link already exists at ${skillsPath}`);
  }

  const next = detectCodexSuperpowers();
  if (next.status !== 'ok') {
    throw new Error(`Codex SuperPowers installation did not validate: ${next.detail}`);
  }

  return logs.join('\n');
};

const claudeSettingsCandidates = (projectDir) => [
  path.join(resolveUserHomeDir(), '.claude', 'settings.json'),
  path.join(projectDir, '.claude', 'settings.json'),
  path.join(projectDir, '.claude', 'settings.local.json'),
];

const detectClaudeSuperpowers = (projectDir) => {
  for (const settingsPath of claudeSettingsCandidates(projectDir)) {
    const content = readFile(settingsPath);
    if (content && content.includes(CLAUDE_SUPERPOWERS_PLUGIN)) {
      return {
        status: 'ok',
        detail: `Detected Claude SuperPowers in ${settingsPath}`,
      };
    }
  }

  if (!commandExists('claude')) {
    return {
      status: 'missing',
      detail: 'Claude Code CLI is not available on PATH',
    };
  }

  return {
    status: 'missing',
    detail: `Claude SuperPowers plugin not detected. Run \`claude plugin install ${CLAUDE_SUPERPOWERS_PLUGIN} --scope user\`.`,
  };
};

const ensureClaudeSuperpowers = (projectDir) => {
  const current = detectClaudeSuperpowers(projectDir);
  if (current.status === 'ok') {
    return `⊘ Claude SuperPowers already installed (${current.detail})`;
  }

  if (!commandExists('claude')) {
    throw new Error('Claude Code CLI is required to install Claude SuperPowers automatically. Install Claude Code, then rerun `npx praxis-devos setup --agent claude`.');
  }

  const claudeCommand = resolveCommandForExecution('claude');
  const installResult = runFile(claudeCommand, ['plugin', 'install', CLAUDE_SUPERPOWERS_PLUGIN, '--scope', 'user'], {
    cwd: projectDir,
  });
  if (!installResult.ok) {
    throw new Error(`Automatic Claude SuperPowers install failed: ${installResult.stderr}`);
  }

  const next = detectClaudeSuperpowers(projectDir);
  if (next.status !== 'ok') {
    throw new Error(`Claude SuperPowers install completed but validation is still missing: ${next.detail}`);
  }

  return [
    `✓ Installed Claude SuperPowers with Claude Code CLI (${CLAUDE_SUPERPOWERS_PLUGIN})`,
    `- ${next.detail}`,
  ].join('\n');
};

const ensureRuntimeDependencies = ({ projectDir, agents }) => {
  const logs = [];
  const selectedAgents = uniqueAgents(agents);

  for (const agent of selectedAgents) {
    if (agent === 'opencode') {
      logs.push(`== ${agent} ==`);
      logs.push(ensureOpenCodeSuperpowers());
      continue;
    }

    if (agent === 'codex') {
      logs.push(`== ${agent} ==`);
      logs.push(ensureCodexSuperpowers());
      continue;
    }

    if (agent === 'claude') {
      logs.push(`== ${agent} ==`);
      logs.push(ensureClaudeSuperpowers(projectDir));
      continue;
    }
  }

  return logs.join('\n');
};

const detectSuperpowersForAgent = (projectDir, agent) => {
  if (agent === 'opencode') {
    return detectOpenCodeSuperpowers();
  }

  if (agent === 'codex') {
    return detectCodexSuperpowers();
  }

  if (agent === 'claude') {
    return detectClaudeSuperpowers(projectDir);
  }

  return {
    status: 'unknown',
    detail: `Unsupported agent: ${agent}`,
  };
};

const formatStatus = (status) => {
  if (status === 'ok') return 'OK';
  if (status === 'warning') return 'WARN';
  if (status === 'missing') return 'MISSING';
  return 'UNKNOWN';
};

const renderBootstrapInstructions = ({ projectDir, agent }) => {
  const paths = projectPaths(projectDir);

  if (agent === 'opencode') {
    const result = ensureOpenCodePluginsConfigured();
    const lines = [
      `Updated ${result.configPath}`,
      'Added OpenCode plugins:',
      `- ${PRAXIS_OPENCODE_PLUGIN}`,
      `- ${SUPERPOWERS_OPENCODE_PLUGIN}`,
    ];

    if (result.backupPath) {
      lines.push(`Backed up existing OpenCode config to ${result.backupPath}`);
    }

    if (!result.changed) {
      lines.push('OpenCode plugin config already contained the required plugins.');
    }

    lines.push(
      'Next steps:',
      '- Restart OpenCode',
      '- Start a new session and verify Superpowers skills are available',
      `Reference: ${SUPERPOWERS_DOCS.opencode}`,
    );

    return lines.join('\n');
  }

  if (agent === 'codex') {
    if (process.platform === 'win32') {
      return [
        'Follow the official Codex installation steps for Superpowers (PowerShell):',
        `- Reference: ${SUPERPOWERS_DOCS.codex}`,
        '- Clone the repo:',
        '  git clone https://github.com/obra/superpowers.git "$HOME/.codex/superpowers"',
        '- Create the skills directory:',
        '  New-Item -ItemType Directory -Force "$HOME/.codex/skills" | Out-Null',
        '- Link the skills directory (junction avoids Windows symlink privilege issues):',
        '  New-Item -ItemType Junction -Path "$HOME/.codex/skills/superpowers" -Target "$HOME/.codex/superpowers/skills"',
        '- Restart Codex',
        '- Optional: enable multi-agent in Codex config if you want subagent skills',
      ].join('\n');
    }

    return [
      'Follow the official Codex installation steps for Superpowers:',
      `- Reference: ${SUPERPOWERS_DOCS.codex}`,
      '- Clone the repo:',
      '  git clone https://github.com/obra/superpowers.git ~/.codex/superpowers',
      '- Create the skills symlink:',
      '  mkdir -p ~/.codex/skills',
      '  ln -s ~/.codex/superpowers/skills ~/.codex/skills/superpowers',
      '- Restart Codex',
      '- Optional: enable multi-agent in Codex config if you want subagent skills',
    ].join('\n');
  }

  if (agent === 'claude') {
    return [
      'Install Claude SuperPowers from the official Claude plugin marketplace:',
      `- Reference: ${SUPERPOWERS_DOCS.main}`,
      '- Run:',
      `  claude plugin install ${CLAUDE_SUPERPOWERS_PLUGIN} --scope user`,
      '- Start a new Claude Code session after installation',
    ].join('\n');
  }

  throw new Error(`Unsupported agent for bootstrap: ${agent}`);
};

export const bootstrapProject = ({ projectDir, agents = SUPPORTED_AGENTS }) => {
  const selectedAgents = uniqueAgents(agents);
  const outputs = [];

  for (const agent of selectedAgents) {
    outputs.push(`== ${agent} ==`);
    outputs.push(renderBootstrapInstructions({ projectDir, agent }));
    outputs.push('');
  }

  return outputs.join('\n').trim();
};

export const bootstrapOpenSpec = ({ projectDir }) => {
  const runtime = resolveOpenSpecRuntime(projectDir);
  if (runtime.status === 'ok' || runtime.status === 'warning') {
    return [
      '== openspec ==',
      `OpenSpec already available (${runtime.source})`,
      `- ${runtime.detail}`,
      '- Use the OpenSpec CLI directly from the same installation context:',
      `  ${runtime.command} list --specs`,
    ].join('\n');
  }

  return [
    '== openspec ==',
    'OpenSpec is a hard dependency of Praxis DevOS.',
    'Preferred install (user-global):',
    `- npm install -g ${OPENSPEC_PACKAGE}`,
    '- Then run:',
    '  openspec list --specs',
    'Project-local fallback (if global is blocked by policy):',
    `- npm install -D ${OPENSPEC_PACKAGE}`,
    '- Then run OpenSpec directly:',
    '  ./node_modules/.bin/openspec list --specs',
    `Reference: ${OPENSPEC_INSTALL_DOC}`,
  ].join('\n');
};

export const doctorProject = ({ projectDir, agents = SUPPORTED_AGENTS, strict = false }) => {
  const selectedAgents = uniqueAgents(agents);
  const results = [];

  const openspecRuntime = resolveOpenSpecRuntime(projectDir);
  results.push({
    name: 'openspec',
    status: openspecRuntime.status,
    detail: openspecRuntime.detail,
  });

  for (const agent of selectedAgents) {
    const detection = detectSuperpowersForAgent(projectDir, agent);
    results.push({
      name: `superpowers:${agent}`,
      status: detection.status,
      detail: detection.detail,
    });
  }

  for (const agent of selectedAgents) {
    const projections = detectForAgent(agent);
    const expected = expectedSkillNames();
    const found = projections.map((p) => p.name);
    const missing = expected.filter((name) => !found.includes(name));

    if (missing.length === 0) {
      results.push({
        name: `projection:${agent}`,
        status: 'ok',
        detail: `All ${expected.length} bundled Praxis skills projected`,
      });
    } else {
      results.push({
        name: `projection:${agent}`,
        status: 'warning',
        detail: `Missing projections: ${missing.join(', ')}. Run \`npx praxis-devos setup --agent ${agent}\` to fix.`,
      });
    }
  }

  const lines = ['Dependency doctor:'];
  for (const result of results) {
    lines.push(`- [${formatStatus(result.status)}] ${result.name} — ${result.detail}`);
  }

  lines.push('');
  lines.push('Recommended next step:');
  if (selectedAgents.length === 1) {
    lines.push(`- npx praxis-devos setup --agent ${selectedAgents[0]}`);
  } else {
    lines.push(`- npx praxis-devos setup --agents ${selectedAgents.join(',')}`);
  }
  lines.push('');
  lines.push('Advanced repair command:');
  lines.push(`- npx praxis-devos bootstrap --agents ${selectedAgents.join(',')}`);

  const hasBlockingIssue = results.some((result) =>
    result.status === 'missing' || (strict && result.status === 'unknown'));

  if (strict && hasBlockingIssue) {
    throw new Error(`${lines.join('\n')}\n\nStrict dependency check failed.`);
  }

  return lines.join('\n');
};

export const parseCliArgs = (argv) => {
  const args = [...argv];
  const parsed = {
    command: args.shift() || 'help',
    agents: [],
    capability: null,
    changeId: null,
    evidenceJson: null,
    file: null,
    positional: [],
    projectDir: process.cwd(),
    reasons: '',
    selected: false,
    signals: '',
    stage: null,
    strict: false,
    withOpenSpec: false,
  };

  while (args.length > 0) {
    const token = args.shift();

    if (token === '--agent') {
      const agent = args.shift();
      if (agent) parsed.agents.push(agent);
      continue;
    }

    if (token === '--agents') {
      const value = args.shift();
      if (value) parsed.agents.push(...value.split(','));
      continue;
    }

    if (token === '--project-dir') {
      parsed.projectDir = path.resolve(args.shift() || parsed.projectDir);
      continue;
    }

    if (token === '--file') {
      parsed.file = path.resolve(args.shift() || parsed.projectDir);
      continue;
    }

    if (token === '--change-id') {
      parsed.changeId = args.shift() || null;
      continue;
    }

    if (token === '--capability') {
      parsed.capability = args.shift() || null;
      continue;
    }

    if (token === '--signals') {
      parsed.signals = args.shift() || '';
      continue;
    }

    if (token === '--reasons') {
      parsed.reasons = args.shift() || '';
      continue;
    }

    if (token === '--evidence-json') {
      parsed.evidenceJson = args.shift() || null;
      continue;
    }

    if (token === '--selected') {
      parsed.selected = true;
      continue;
    }

    if (token === '--stage') {
      parsed.stage = args.shift() || null;
      continue;
    }

    if (token === '--strict') {
      parsed.strict = true;
      continue;
    }

    if (token === '--openspec') {
      throw new Error('`--openspec` has been removed. `bootstrap` always includes OpenSpec. Use `npx praxis-devos bootstrap --agent <name>` or `npx praxis-devos setup --agent <name>`.');
    }

    parsed.positional.push(token);
  }

  return parsed;
};

const parseChangeCliArgs = (argv) => {
  const args = [...argv];
  if (args[0] === 'create') {
    args.shift();
  }

  const parsed = {
    projectDir: process.cwd(),
    title: '',
    summary: '',
    capability: null,
    changeId: null,
    type: 'auto',
  };
  const titleParts = [];

  while (args.length > 0) {
    const token = args.shift();

    if (token === '--project-dir') {
      parsed.projectDir = path.resolve(args.shift() || parsed.projectDir);
      continue;
    }

    if (token === '--title') {
      parsed.title = args.shift() || '';
      continue;
    }

    if (token === '--summary') {
      parsed.summary = args.shift() || '';
      continue;
    }

    if (token === '--capability') {
      parsed.capability = args.shift() || null;
      continue;
    }

    if (token === '--change-id') {
      parsed.changeId = args.shift() || null;
      continue;
    }

    if (token === '--type') {
      parsed.type = args.shift() || 'auto';
      continue;
    }

    if (token === '--full') {
      parsed.type = 'full';
      continue;
    }

    if (token === '--lite') {
      parsed.type = 'lite';
      continue;
    }

    titleParts.push(token);
  }

  if (!parsed.title && titleParts.length > 0) {
    parsed.title = titleParts.join(' ');
  }

  return parsed;
};

export const renderHelp = () => `praxis-devos <command> [options]

Commands:
  setup          Bootstrap dependencies, initialize framework files
  init           Initialize the framework skeleton in the current project
  sync           Refresh agent adapters and managed blocks
  docs           Compatibility/fallback init, refresh, or check for codemap/surfaces artifacts
  migrate        Sync adapters (legacy .praxis migration is no longer needed)
  status         Show current project initialization and dependency state
  doctor         Check required openspec/superpowers dependencies
  bootstrap      Print or apply dependency bootstrap steps for each agent
  help           Show this help

Options:
  --agent <name>         Sync one agent adapter (repeatable)
  --agents a,b,c         Sync multiple agent adapters
  --project-dir <path>   Project directory (defaults to cwd)
  --stage <name>         Capability stage to validate (\`explore\`, \`propose\`, \`apply\`, \`archive\`)
  --strict               Fail doctor if required dependencies are missing

Supported agents:
  ${SUPPORTED_AGENTS.join(', ')}
`;

export const runCli = (argv) => {
  const parsed = parseCliArgs(argv);
  const agents = parsed.agents.length > 0 ? parsed.agents : SUPPORTED_AGENTS;

  if (parsed.command === 'help' || parsed.command === '--help' || parsed.command === '-h') {
    return renderHelp();
  }

  if (parsed.command === 'status') {
    return statusProject({
      projectDir: parsed.projectDir,
      agents,
    });
  }

  if (parsed.command === 'doctor') {
    return doctorProject({
      projectDir: parsed.projectDir,
      agents,
      strict: parsed.strict,
    });
  }

  if (parsed.command === 'bootstrap') {
    const outputs = [];
    outputs.push(bootstrapOpenSpec({
      projectDir: parsed.projectDir,
    }));
    outputs.push(bootstrapProject({
      projectDir: parsed.projectDir,
      agents,
    }));

    return outputs.join('\n\n');
  }

  if (parsed.command === 'setup') {
    return setupProject({
      projectDir: parsed.projectDir,
      agents,
      strict: parsed.strict,
    });
  }

  if (parsed.command === 'docs') {
    const action = parsed.positional[0] || 'check';
    if (action === 'init') {
      return initDocsLite({
        projectDir: parsed.projectDir,
      });
    }

    if (action === 'refresh') {
      return refreshDocsLite({
        projectDir: parsed.projectDir,
      });
    }

    if (action === 'check') {
      return checkDocsLite({
        projectDir: parsed.projectDir,
      });
    }

    throw new Error(`Unknown docs subcommand: ${action}`);
  }

  if (parsed.command === 'init') {
    return initProject({
      projectDir: parsed.projectDir,
      agents,
    });
  }

  if (parsed.command === 'sync') {
    const outputParts = [];
    outputParts.push(syncProject({
      projectDir: parsed.projectDir,
      agents,
    }));

    const projectionLogs = [];
    projectNativeSkills({
      projectDir: parsed.projectDir,
      agents,
      log: (msg) => projectionLogs.push(msg),
    });
    if (projectionLogs.length > 0) {
      outputParts.push(projectionLogs.join('\n'));
    }

    return outputParts.filter(Boolean).join('\n');
  }

  if (parsed.command === 'migrate') {
    return migrateProject({
      projectDir: parsed.projectDir,
      agents,
    });
  }

  throw new Error(`Unknown command: ${parsed.command}`);
};
