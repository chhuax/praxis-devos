import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { projectToAgent, detectForAgent, expectedSkillNames } from '../projection/index.js';
import { resolveUserHomeDir } from '../support/home.js';
import {
  handleInstrumentationCommand,
  handleRecordCapabilityCommand,
  handleRecordSelectionCommand,
  handleValidateChangeCommand,
  initializeCapabilityEvidence,
  recordCapabilityEvidence,
  recordCapabilitySelection,
  updateCapabilityEvidenceStage,
  validateChangeEvidence,
} from '../monitoring/index.js';
import { selectCapabilities } from './capability-policy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PRAXIS_ROOT = path.resolve(__dirname, '../..');
export const PACKAGE_JSON = path.join(PRAXIS_ROOT, 'package.json');
export const MANAGED_ENTRY_TEMPLATE = path.join(PRAXIS_ROOT, 'src', 'templates', 'managed-entry.md');

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

const findCommandPath = (cmd) => {
  try {
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const stdout = execFileSync(whichCmd, [cmd], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0) || null;
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
  const localPath = localExecutablePath(projectDir, 'openspec');
  if (fs.existsSync(localPath)) {
    return {
      status: 'ok',
      source: 'project-local',
      command: localPath,
      detail: `OpenSpec available via ${localPath}`,
    };
  }

  const globalPath = findCommandPath('openspec');
  if (globalPath) {
    return {
      status: 'ok',
      source: 'global',
      command: globalPath,
      detail: `OpenSpec CLI is available on PATH via ${globalPath}`,
    };
  }

  return {
    status: 'missing',
    source: 'missing',
    command: null,
    detail: 'OpenSpec CLI is missing. Install it with `npx praxis-devos setup --agent <name>` or `npx praxis-devos bootstrap --agents <name>`.',
  };
};

const run = (cmd, opts = {}) => {
  try {
    const stdout = execSync(cmd, { encoding: 'utf8', timeout: 120_000, ...opts });
    return { ok: true, stdout: stdout.trim(), stderr: '' };
  } catch (err) {
    return { ok: false, stdout: '', stderr: err.stderr?.trim() || err.message };
  }
};

const isWindowsBatchScript = (cmd) => process.platform === 'win32'
  && ['.cmd', '.bat'].includes(path.extname(cmd).toLowerCase());

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
    const stdout = isWindowsBatchScript(cmd)
      ? execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', buildWindowsBatchCommand(cmd, args)], execOpts)
      : execFileSync(cmd, args, execOpts);
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
  if (path.extname(cmd)) {
    return findCommandPath(cmd) || cmd;
  }

  if (process.platform === 'win32') {
    return findCommandPath(`${cmd}.cmd`)
      || findCommandPath(`${cmd}.bat`)
      || findCommandPath(`${cmd}.exe`)
      || findCommandPath(cmd)
      || cmd;
  }

  return findCommandPath(cmd) || cmd;
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

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getPackageVersion = () => readJson(PACKAGE_JSON)?.version || '0.0.0';

const projectPaths = (projectDir) => ({
  projectDir,
  opencodeConfigPath: path.join(projectDir, 'opencode.json'),
  rootAgentsMd: path.join(projectDir, 'AGENTS.md'),
  rootClaudeMd: path.join(projectDir, 'CLAUDE.md'),
  openspecDir: path.join(projectDir, 'openspec'),
  legacyOpenCodeDir: path.join(projectDir, '.opencode'),
  legacyOpenCodeSkillsDir: path.join(projectDir, '.opencode', 'skills'),
});

const ensureOpenSpecLayout = ({ projectDir, log }) => {
  const runtime = resolveOpenSpecRuntime(projectDir);
  if (runtime.status !== 'ok' || !runtime.command) {
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
      projectToAgent({ agent, version, log });
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

  outputs.push('');
  outputs.push('== native projection ==');
  projectNativeSkills({ projectDir, agents: selectedAgents, log: projLog });
  populateOpenSpecConfig({ projectDir, log: projLog });
  outputs.push(projLogs.join('\n'));

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
  initializeCapabilityEvidence({ projectDir, changeId: nextChangeId });

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

const detectOpenCodeSuperpowers = (projectDir) => {
  const paths = projectPaths(projectDir);
  const config = readProjectJson(paths.opencodeConfigPath);

  if (!config) {
    return {
      status: 'missing',
      detail: `Missing ${path.basename(paths.opencodeConfigPath)}`,
    };
  }

  const plugins = Array.isArray(config.plugin) ? config.plugin : [];
  const hasSuperpowers = plugins.some((entry) =>
    typeof entry === 'string' && (
      entry.startsWith('superpowers@') || entry.includes('github.com/obra/superpowers')
    ));

  return hasSuperpowers
    ? { status: 'ok', detail: 'superpowers plugin declared in opencode.json' }
    : { status: 'missing', detail: 'superpowers plugin not declared in opencode.json' };
};

const ensureOpenSpecRuntime = (projectDir) => {
  const logs = [];
  const current = resolveOpenSpecRuntime(projectDir);

  if (current.status === 'ok') {
    logs.push(`== openspec ==`);
    logs.push(`⊘ OpenSpec already available (${current.source})`);
    logs.push(`- ${current.detail}`);
    return logs.join('\n');
  }

  if (!commandExists('npm')) {
    throw new Error('npm is required to install OpenSpec automatically. Install npm, then rerun `npx praxis-devos setup --agent <name>`.');
  }

  const npmCommand = resolveCommandForExecution('npm');
  const installResult = runFile(npmCommand, ['install', '-D', OPENSPEC_PACKAGE], {
    cwd: projectDir,
  });
  if (!installResult.ok) {
    throw new Error(`Automatic OpenSpec install failed: ${installResult.stderr}`);
  }

  const next = resolveOpenSpecRuntime(projectDir);
  if (next.status !== 'ok') {
    throw new Error(`OpenSpec install completed but runtime is still unavailable: ${next.detail}`);
  }

  logs.push('== openspec ==');
  logs.push(`✓ Installed OpenSpec locally with npm (${OPENSPEC_PACKAGE})`);
  logs.push(`- ${next.detail}`);
  return logs.join('\n');
};

const ensureOpenCodeSuperpowers = (projectDir) => {
  const paths = projectPaths(projectDir);
  const config = readProjectJson(paths.opencodeConfigPath) || {};
  const next = {
    ...config,
    plugin: [...new Set([
      ...(Array.isArray(config.plugin) ? config.plugin : []),
      PRAXIS_OPENCODE_PLUGIN,
      SUPERPOWERS_OPENCODE_PLUGIN,
    ])],
  };

  writeProjectJson(paths.opencodeConfigPath, next);
  return `Configured OpenCode plugins in ${paths.opencodeConfigPath}`;
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
      logs.push(ensureOpenCodeSuperpowers(projectDir));
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
    return detectOpenCodeSuperpowers(projectDir);
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
    const config = readProjectJson(paths.opencodeConfigPath) || {};
    const next = {
      ...config,
      plugin: [...new Set([
        ...(Array.isArray(config.plugin) ? config.plugin : []),
        PRAXIS_OPENCODE_PLUGIN,
        SUPERPOWERS_OPENCODE_PLUGIN,
      ])],
    };

    writeProjectJson(paths.opencodeConfigPath, next);
    return [
      `Updated ${paths.opencodeConfigPath}`,
      'Added OpenCode plugins:',
      `- ${PRAXIS_OPENCODE_PLUGIN}`,
      `- ${SUPERPOWERS_OPENCODE_PLUGIN}`,
      'Next steps:',
      '- Restart OpenCode',
      '- Start a new session and verify Superpowers skills are available',
      `Reference: ${SUPERPOWERS_DOCS.opencode}`,
    ].join('\n');
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
  if (runtime.status === 'ok') {
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
    'Preferred install (project-local):',
    `- npm install -D ${OPENSPEC_PACKAGE}`,
    'Then run OpenSpec directly:',
    '  ./node_modules/.bin/openspec list --specs',
    'Fallback install (global):',
    `- npm install -g ${OPENSPEC_PACKAGE}`,
    '- Then run:',
    '  openspec list --specs',
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
        detail: `All ${expected.length} OpenSpec skills projected`,
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
  lines.push(`- npx praxis-devos setup --agents ${selectedAgents.join(',')}`);
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

const normalizeTranscriptText = (input) => input
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n');

const matchAny = (text, patterns) => patterns.some((pattern) => pattern.test(text));

const PROPOSAL_INTAKE_PATTERNS = [
  /Proposal Intake/i,
  /change target/i,
  /intended behavior/i,
  /scope\/risk/i,
  /open questions/i,
  /变更对象/,
  /预期变化/,
  /范围.*风险/,
  /开放问题/,
];

const NATIVE_OPENSPEC_PROPOSAL_PATTERNS = [
  /openspec new change\b/i,
];

const WRITING_PLANS_PATTERNS = [
  /writing-plans/i,
  /实施计划/,
  /执行计划/,
  /分步计划/,
];

const OPENSPEC_VISIBLE_FLOW_PATTERNS = [
  /\/opsx:(?:propose|explore|apply|archive)\b/i,
  /proposal flow/i,
  /implementation flow/i,
  /archive flow/i,
  /当前进入 opsx-/i,
];

const SUPERPOWERS_VISIBLE_ANNOUNCEMENT_PATTERNS = [
  /Using (?:brainstorming|writing-plans|systematic-debugging|verification-before-completion|subagent-driven-development)/i,
  /显式加载 `?superpowers:/i,
  /进入\s+subagent-driven-development/i,
];

const SUPERPOWERS_DOC_OUTPUT_PATTERNS = [
  /docs\/superpowers\/(?:specs|plans)\//i,
];

const OPENSPEC_DUPLICATE_RECAP_PATTERNS = [
  /最后再总结一遍/,
  /再次总结/,
  /重复总结/,
  /再做一次收尾总结/,
  /最终总结/,
  /close-out recap/i,
  /summary again/i,
];

const SESSION_EVENT_RULES = [
  {
    id: 'proposal-flow',
    label: 'proposal flow',
    signal: [
      /\/opsx:propose\b/i,
      /\/opsx:explore\b/i,
      /proposal flow/i,
      /提案通道/,
      /proposal\.md/i,
      /spec delta/i,
    ],
    requirements: [
      {
        id: 'proposal-intake',
        label: 'Proposal Intake',
        patterns: PROPOSAL_INTAKE_PATTERNS,
      },
      {
        id: 'native-openspec-proposal',
        label: 'native OpenSpec proposal execution',
        patterns: NATIVE_OPENSPEC_PROPOSAL_PATTERNS,
      },
    ],
  },
  {
    id: 'proposal-ambiguity',
    label: 'proposal ambiguity',
    signal: [
      /open questions/i,
      /阻塞缺口/,
      /多种可行方案/,
      /架构分歧/,
      /边界分歧/,
      /不确定/,
      /方案探索/,
    ],
    requirements: [
      {
        id: 'brainstorming',
        label: 'brainstorming',
        patterns: [
          /brainstorming/i,
          /澄清范围/,
          /澄清需求/,
          /方案比较/,
          /方案探索/,
          /边界收敛/,
        ],
      },
    ],
  },
  {
    id: 'planning-before-proposal',
    label: 'planning before proposal',
    signal: WRITING_PLANS_PATTERNS,
    requirements: [
      {
        id: 'proposal-intake',
        label: 'Proposal Intake',
        patterns: PROPOSAL_INTAKE_PATTERNS,
      },
      {
        id: 'native-openspec-proposal',
        label: 'native OpenSpec proposal execution',
        patterns: NATIVE_OPENSPEC_PROPOSAL_PATTERNS,
      },
    ],
  },
  {
    id: 'implementation-branch-gate',
    label: 'approved proposal implementation',
    signal: [
      /已批准.*实现/,
      /继续实现/,
      /approved proposal/i,
      /start implementation/i,
      /implementation flow/i,
    ],
    requirements: [
      {
        id: 'git-workflow',
        label: 'git-workflow / branch check',
        patterns: [
          /git-workflow/i,
          /当前 Git 分支/,
          /专用实现分支/,
          /创建.*分支/,
          /切换.*分支/,
          /reuse.*branch/i,
          /branch check/i,
        ],
      },
    ],
  },
  {
    id: 'multi-step-work',
    label: 'multi-step work',
    signal: [
      /多步骤/,
      /tasks\.md/i,
      /实施计划/,
      /分步/,
      /步骤\s*[1-9]/,
      /step 1/i,
    ],
    requirements: [
      {
        id: 'writing-plans',
        label: 'writing-plans',
        patterns: [
          ...WRITING_PLANS_PATTERNS,
          /step 1/i,
          /1\.\s.+\n2\.\s/s,
        ],
      },
    ],
  },
  {
    id: 'bug-debugging',
    label: 'bug / failure debugging',
    signal: [
      /\bbug\b/i,
      /测试失败/,
      /failing test/i,
      /failed test/i,
      /报错/,
      /异常/,
      /回归/,
    ],
    requirements: [
      {
        id: 'systematic-debugging',
        label: 'systematic-debugging',
        patterns: [
          /systematic-debugging/i,
          /复现步骤/,
          /复现条件/,
          /假设/,
          /验证假设/,
          /根因/,
          /排查步骤/,
        ],
      },
    ],
  },
  {
    id: 'parallel-work',
    label: 'parallelizable work',
    signal: [
      /并行/,
      /parallel/i,
      /多个独立子任务/,
      /subagent/i,
      /委派/,
    ],
    requirements: [
      {
        id: 'subagent-driven-development',
        label: 'subagent-driven-development',
        patterns: [
          /subagent-driven-development/i,
          /subagent/i,
          /并行子任务/,
          /并行拆分/,
          /委派/,
        ],
      },
    ],
  },
  {
    id: 'completion-gate',
    label: 'completion gate',
    signal: [
      /准备提交/,
      /提交前/,
      /即将完成/,
      /准备合并/,
      /\bPR\b/,
      /merge/i,
      /发布/,
      /验证结果/,
      /收尾/,
    ],
    requirements: [
      {
        id: 'verification-before-completion',
        label: 'verification-before-completion',
        patterns: [
          /verification-before-completion/i,
          /验证结果/,
          /验收清单/,
          /验证项/,
          /npm test/i,
          /git diff --check/i,
          /openspec validate/i,
        ],
      },
    ],
  },
];

export const analyzeSessionTranscript = (transcriptText) => {
  const text = normalizeTranscriptText(transcriptText);
  const triggered = [];
  const findings = [];

  for (const rule of SESSION_EVENT_RULES) {
    if (!matchAny(text, rule.signal)) {
      continue;
    }

    const requirements = rule.requirements.map((requirement) => {
      const ok = matchAny(text, requirement.patterns);
      if (!ok) {
        findings.push(`Missing ${requirement.label} evidence after ${rule.label} signal`);
      }

      return {
        id: requirement.id,
        label: requirement.label,
        ok,
      };
    });

    triggered.push({
      id: rule.id,
      label: rule.label,
      requirements,
    });
  }

  if (matchAny(text, OPENSPEC_VISIBLE_FLOW_PATTERNS) && matchAny(text, SUPERPOWERS_VISIBLE_ANNOUNCEMENT_PATTERNS)) {
    findings.push('Avoid separate SuperPowers workflow announcements inside OpenSpec flow');
  }

  if (matchAny(text, OPENSPEC_VISIBLE_FLOW_PATTERNS) && matchAny(text, SUPERPOWERS_DOC_OUTPUT_PATTERNS)) {
    findings.push('Keep OpenSpec-stage outputs in the current change artifacts, not docs/superpowers');
  }

  if (matchAny(text, OPENSPEC_VISIBLE_FLOW_PATTERNS) && matchAny(text, OPENSPEC_DUPLICATE_RECAP_PATTERNS)) {
    findings.push('Avoid duplicate stage summaries or close-out recaps inside OpenSpec flow');
  }

  return {
    status: findings.length === 0 ? 'pass' : 'needs-attention',
    triggered,
    findings,
  };
};

export const validateSessionTranscript = ({ filePath, strict = false }) => {
  if (!filePath) {
    throw new Error('Missing transcript file. Use `npx praxis-devos validate-session --file <path>`.');
  }

  const transcriptText = readFile(filePath);
  if (transcriptText == null) {
    throw new Error(`Transcript file not found: ${filePath}`);
  }

  const result = analyzeSessionTranscript(transcriptText);
  const lines = [
    'Session transcript validation',
    `file: ${filePath}`,
    `status: ${result.status}`,
  ];

  if (result.triggered.length === 0) {
    lines.push('triggered hooks: none');
  } else {
    lines.push('triggered hooks:');
    for (const hook of result.triggered) {
      lines.push(`- ${hook.label}`);
      for (const requirement of hook.requirements) {
        lines.push(`  - ${requirement.label}: ${requirement.ok ? 'ok' : 'missing'}`);
      }
    }
  }

  if (result.findings.length === 0) {
    lines.push('findings: none');
  } else {
    lines.push('findings:');
    for (const finding of result.findings) {
      lines.push(`- ${finding}`);
    }
  }

  const report = lines.join('\n');
  if (strict && result.findings.length > 0) {
    throw new Error(report);
  }

  return report;
};

export {
  selectCapabilities,
  validateChangeEvidence,
  initializeCapabilityEvidence,
  recordCapabilityEvidence,
  recordCapabilitySelection,
  updateCapabilityEvidenceStage,
};

export const renderHelp = () => `praxis-devos <command> [options]

Commands:
  setup          Bootstrap dependencies, initialize framework files
  init           Initialize the framework skeleton in the current project
  sync           Refresh agent adapters and managed blocks
  migrate        Sync adapters (legacy .praxis migration is no longer needed)
  instrumentation Enable, disable, or inspect projected monitoring overlays
  status         Show current project initialization and dependency state
  doctor         Check required openspec/superpowers dependencies
  bootstrap      Print or apply dependency bootstrap steps for each agent
  validate-session  Validate a transcript against Praxis evidence hooks
  validate-change  Validate embedded capability evidence for an OpenSpec change
  help           Show this help

Options:
  --agent <name>         Sync one agent adapter (repeatable)
  --agents a,b,c         Sync multiple agent adapters
  --project-dir <path>   Project directory (defaults to cwd)
  --file <path>          Transcript file for \`validate-session\`
  --change-id <name>     OpenSpec change id for \`validate-change\`
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

  if (parsed.command === 'instrumentation') {
    const action = parsed.positional[0] || 'status';
    const logs = [];
    const log = (msg) => logs.push(msg);
    const lines = handleInstrumentationCommand({ action, agents, log });
    return [...lines, ...logs].join('\n');
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

  if (parsed.command === 'validate-session') {
    return validateSessionTranscript({
      filePath: parsed.file,
      strict: parsed.strict,
    });
  }

  if (parsed.command === 'validate-change') {
    return handleValidateChangeCommand({
      projectDir: parsed.projectDir,
      changeId: parsed.changeId,
      stage: parsed.stage,
      strict: parsed.strict,
    });
  }

  if (parsed.command === 'record-selection') {
    return handleRecordSelectionCommand({
      projectDir: parsed.projectDir,
      changeId: parsed.changeId,
      stage: parsed.stage,
      signals: parsed.signals,
    });
  }

  if (parsed.command === 'record-capability') {
    return handleRecordCapabilityCommand({
      projectDir: parsed.projectDir,
      changeId: parsed.changeId,
      stage: parsed.stage,
      capability: parsed.capability,
      selected: parsed.selected,
      reasons: parsed.reasons,
      evidenceJson: parsed.evidenceJson,
      signals: parsed.signals,
    });
  }

  if (parsed.command === 'init') {
    return initProject({
      projectDir: parsed.projectDir,
      agents,
    });
  }

  if (parsed.command === 'sync') {
    return syncProject({
      projectDir: parsed.projectDir,
      agents,
    });
  }

    if (parsed.command === 'migrate') {
      return migrateProject({
        projectDir: parsed.projectDir,
        agents,
      });
    }

  throw new Error(`Unknown command: ${parsed.command}`);
};
