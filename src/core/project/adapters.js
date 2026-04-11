import fs from 'fs';
import path from 'path';
import { projectToAgent } from '../../projection/index.js';
import {
  ensureDir,
  getPackageVersion,
  MANAGED_ENTRY_TEMPLATE,
  projectPaths,
  readFile,
  SUPPORTED_AGENTS,
  uniqueAgents,
  writeText,
} from './state.js';
import { resolveOpenSpecRuntime, runFile } from '../runtime/commands.js';

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

// Adapter sync owns generated compatibility files and managed blocks in project
// root files. It should never generate semantic project docs.

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

const renderManagedEntryTemplate = () => {
  const template = readFile(MANAGED_ENTRY_TEMPLATE);
  if (!template) {
    throw new Error(`Managed entry template is missing: ${MANAGED_ENTRY_TEMPLATE}`);
  }

  return template;
};

const renderManagedBlock = () => renderManagedEntryTemplate();

const renderClaudeManagedBlock = () => [
  '@AGENTS.md',
  '',
  '> Claude Code 通过 `CLAUDE.md` 读取项目指令；共享项目规则统一维护在 `AGENTS.md`。',
  '> 如需 Claude 专属补充，请只在此文件追加少量差异内容，不要复制 `AGENTS.md` 全文。',
].join('\n');

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

// Refresh only the scaffold-owned adapter surfaces for the selected agents.
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

// Initialize the OpenSpec workspace skeleton, then project the managed agent
// adapters into the project root.
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

// User-level projection is separate from project adapter sync: this writes the
// bundled skills/commands into the agent-native discovery locations.
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
