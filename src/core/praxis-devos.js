import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PRAXIS_ROOT = path.resolve(__dirname, '../..');
export const SKILLS_DIR = path.join(PRAXIS_ROOT, 'skills');
export const STACKS_DIR = path.join(PRAXIS_ROOT, 'stacks');
export const FRAMEWORK_RULES_MD = path.join(PRAXIS_ROOT, 'RULES.md');
export const PACKAGE_JSON = path.join(PRAXIS_ROOT, 'package.json');

export const PRAXIS_DIRNAME = '.praxis';
export const PRAXIS_MANIFEST = 'manifest.json';
export const SUPPORTED_AGENTS = ['opencode', 'codex', 'claude'];
export const USER_SKILLS = ['git-workflow', 'code-review'];
export const PRAXIS_FRAMEWORK_RULES = 'framework-rules.md';
export const PRAXIS_COMPILED_RULES = 'compiled-rules.md';
export const PRAXIS_SKILLS_INDEX = 'INDEX.md';
export const SUPERPOWERS_OPENCODE_PLUGIN = 'superpowers@git+https://github.com/obra/superpowers.git';
export const PRAXIS_OPENCODE_PLUGIN = 'praxis-devos@git+https://github.com/chhuax/praxis-devos.git';
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

const STACK_SIGNATURES = {
  'java-spring': ['pom.xml', 'build.gradle', 'build.gradle.kts'],
};

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

<!-- 列出常用命令，或参考 .praxis/stack.md 中的 toolchain 定义 -->

\`\`\`bash
\`\`\`

## 分支策略

<!-- 描述 Git 分支模型 -->

## 额外约定

<!-- 列出本项目特有的编码约定（通用规范见 .praxis/rules.md） -->
`;

const CLAUDE_MD_TEMPLATE = `# Claude Code Project Memory

此文件由 Praxis DevOS 维护 Claude Code 的项目入口信息。
`;

const OPENCODE_ADAPTER_README = `# OpenCode Adapter Output

This directory is a generated compatibility marker for OpenCode.
Canonical project assets stay in \`.praxis/\`, and the Praxis OpenCode plugin reads them directly.

- Edit project skills in \`.praxis/skills/\`
- Edit stack metadata in \`.praxis/stack.md\`
- Edit framework gates in \`.praxis/framework-rules.md\`
- Compiled cross-agent rules live in \`.praxis/adapters/compiled-rules.md\`
- Edit stack rules in \`.praxis/rules.md\`
- \`.opencode/\` no longer mirrors canonical skills, stack, or rules files by default
- If you add OpenCode-only supplemental skills, place them in \`.opencode/skills/\`
- The plugin prioritizes \`.praxis/skills/\` and treats \`.opencode/skills/\` as a supplemental layer
- Re-run \`praxis-devos sync --agent opencode\` after changing canonical files
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

export const commandExists = (cmd) => {
  try {
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(whichCmd, [cmd], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

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

  if (commandExists('openspec')) {
    return {
      status: 'ok',
      source: 'global',
      command: 'openspec',
      detail: 'OpenSpec CLI is available on PATH',
    };
  }

  return {
    status: 'missing',
    source: 'missing',
    command: null,
    detail: 'OpenSpec CLI is missing. Install it with `praxis-devos bootstrap --openspec`.',
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

const runFile = (cmd, args, opts = {}) => {
  try {
    const stdout = execFileSync(cmd, args, { encoding: 'utf8', timeout: 120_000, ...opts });
    return { ok: true, stdout: stdout.trim(), stderr: '' };
  } catch (err) {
    return { ok: false, stdout: '', stderr: err.stderr?.trim() || err.message };
  }
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

const copyDirIfMissing = (src, dst) => {
  if (!fs.existsSync(dst)) {
    syncDirRecursive(src, dst);
  }
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

const listProjectSkillsDetailed = (projectDir) => {
  const paths = projectPaths(projectDir);
  return listDirs(paths.praxisSkillsDir).map((name) => {
    const skillMd = readFile(path.join(paths.praxisSkillsDir, name, 'SKILL.md'));
    return {
      name,
      summary: extractSkillSummary(skillMd),
    };
  });
};

const renderProjectSkillsIndex = (projectDir) => {
  const skills = listProjectSkillsDetailed(projectDir);
  const lines = [
    '# Project Skills Index',
    '',
    'This file is generated by Praxis DevOS from `.praxis/skills/`.',
    'It summarizes the currently installed project and stack skills for agent entrypoints.',
    '',
  ];

  if (skills.length === 0) {
    lines.push('No project skills are currently installed.');
    lines.push('');
    return lines.join('\n');
  }

  lines.push('## Available Skills');
  lines.push('');
  for (const skill of skills) {
    lines.push(`- \`${skill.name}\`: ${skill.summary}`);
  }
  lines.push('');
  return lines.join('\n');
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

const projectPaths = (projectDir) => {
  const praxisDir = path.join(projectDir, PRAXIS_DIRNAME);
  return {
    projectDir,
    praxisDir,
    manifestPath: path.join(praxisDir, PRAXIS_MANIFEST),
    praxisSkillsDir: path.join(praxisDir, 'skills'),
    praxisSkillsIndexMd: path.join(praxisDir, 'skills', PRAXIS_SKILLS_INDEX),
    praxisFrameworkRulesMd: path.join(praxisDir, PRAXIS_FRAMEWORK_RULES),
    praxisStackMd: path.join(praxisDir, 'stack.md'),
    praxisRulesMd: path.join(praxisDir, 'rules.md'),
    praxisAdaptersDir: path.join(praxisDir, 'adapters'),
    praxisCompiledRulesMd: path.join(praxisDir, 'adapters', PRAXIS_COMPILED_RULES),
    opencodeConfigPath: path.join(projectDir, 'opencode.json'),
    rootAgentsMd: path.join(projectDir, 'AGENTS.md'),
    rootClaudeMd: path.join(projectDir, 'CLAUDE.md'),
    openspecDir: path.join(projectDir, 'openspec'),
    legacyOpenCodeDir: path.join(projectDir, '.opencode'),
    legacyOpenCodeSkillsDir: path.join(projectDir, '.opencode', 'skills'),
    legacyOpenCodeStackMd: path.join(projectDir, '.opencode', 'stack.md'),
    legacyOpenCodeRulesMd: path.join(projectDir, '.opencode', 'stack-rules.md'),
  };
};

export const detectProjectStack = (projectDir) => {
  for (const [stackName, files] of Object.entries(STACK_SIGNATURES)) {
    if (files.some((fileName) => fs.existsSync(path.join(projectDir, fileName)))) {
      return stackName;
    }
  }
  return 'starter';
};

const resolveStackName = (projectDir, stackName) => stackName || detectProjectStack(projectDir);

const ensurePraxisManifest = ({ projectDir, stackName, agents, migratedFrom }) => {
  const paths = projectPaths(projectDir);
  const manifest = readJson(paths.manifestPath) || {};
  const nextAgents = [...new Set([...(manifest.agents || []), ...uniqueAgents(agents)])];
  const selectedStack = stackName || manifest.selectedStack || detectProjectStack(projectDir);

  const nextManifest = {
    schemaVersion: 1,
    framework: 'praxis-devos',
    frameworkVersion: getPackageVersion(),
    canonicalDir: '.praxis',
    selectedStack,
    agents: nextAgents,
    dependencies: {
      openspec: {
        required: true,
        type: 'cli',
      },
      superpowers: {
        required: true,
        type: 'agent-runtime',
        agents: Object.fromEntries(
          SUPPORTED_AGENTS.map((agent) => [agent, { required: true }]),
        ),
      },
    },
    migratedFrom: migratedFrom || manifest.migratedFrom || null,
    updatedAt: new Date().toISOString(),
  };

  writeJson(paths.manifestPath, nextManifest);
  return nextManifest;
};

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
  const frameworkFiles = [
    ['openspec/AGENTS.md', 'openspec/AGENTS.md'],
    ['openspec/project.md', 'openspec/project.md'],
    ['openspec/templates/PROPOSAL_TEMPLATE.md', 'openspec/templates/PROPOSAL_TEMPLATE.md'],
    ['openspec/templates/TASKS_TEMPLATE.md', 'openspec/templates/TASKS_TEMPLATE.md'],
  ];

  for (const [src, dst] of frameworkFiles) {
    const srcPath = path.join(PRAXIS_ROOT, src);
    const dstPath = path.join(projectDir, dst);
    if (fs.existsSync(srcPath) && !fs.existsSync(dstPath)) {
      copyFile(srcPath, dstPath);
    }
  }

  log('✓ Framework files copied to openspec/');
};

const ensureFrameworkRulesMirror = ({ projectDir, log }) => {
  const paths = projectPaths(projectDir);
  if (!fs.existsSync(paths.praxisFrameworkRulesMd)) {
    copyFile(FRAMEWORK_RULES_MD, paths.praxisFrameworkRulesMd);
    if (log) {
      log('✓ .praxis/framework-rules.md created');
    }
    return;
  }

  if (log) {
    log('⊘ .praxis/framework-rules.md already exists, skipped');
  }
};

const ensureCanonicalAssets = ({ projectDir, stackName, log }) => {
  const paths = projectPaths(projectDir);
  ensureDir(paths.praxisSkillsDir);
  ensureDir(paths.praxisAdaptersDir);
  ensureFrameworkRulesMirror({ projectDir, log });

  for (const skillName of USER_SKILLS) {
    const skillSrc = path.join(SKILLS_DIR, skillName);
    const skillDst = path.join(paths.praxisSkillsDir, skillName);
    if (fs.existsSync(skillSrc)) {
      if (fs.existsSync(skillDst)) {
        log(`⊘ .praxis/skills/${skillName}/ already exists, skipped`);
      } else {
        copyDirIfMissing(skillSrc, skillDst);
        log(`✓ .praxis/skills/${skillName}/ copied (customizable)`);
      }
    }
  }

  const stackSrc = path.join(STACKS_DIR, stackName);
  if (!fs.existsSync(stackSrc)) {
    const available = listDirs(STACKS_DIR).join(', ');
    throw new Error(`Stack "${stackName}" not found. Available: ${available}`);
  }

  const stackSkillsSrc = path.join(stackSrc, 'skills');
  if (fs.existsSync(stackSkillsSrc)) {
    for (const entry of fs.readdirSync(stackSkillsSrc, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillSrc = path.join(stackSkillsSrc, entry.name);
      const skillDst = path.join(paths.praxisSkillsDir, entry.name);
      if (fs.existsSync(skillDst)) {
        log(`⊘ .praxis/skills/${entry.name}/ already exists, skipped`);
      } else {
        copyDirIfMissing(skillSrc, skillDst);
        log(`✓ .praxis/skills/${entry.name}/ copied (from ${stackName})`);
      }
    }
  }

  const stackMdSrc = path.join(stackSrc, 'stack.md');
  if (fs.existsSync(stackMdSrc) && !fs.existsSync(paths.praxisStackMd)) {
    copyFile(stackMdSrc, paths.praxisStackMd);
    log('✓ .praxis/stack.md created');
  } else if (fs.existsSync(paths.praxisStackMd)) {
    log('⊘ .praxis/stack.md already exists, skipped');
  }

  const rulesMdSrc = path.join(stackSrc, 'rules.md');
  if (fs.existsSync(rulesMdSrc) && !fs.existsSync(paths.praxisRulesMd)) {
    copyFile(rulesMdSrc, paths.praxisRulesMd);
    log('✓ .praxis/rules.md created');
  } else if (fs.existsSync(paths.praxisRulesMd)) {
    log('⊘ .praxis/rules.md already exists, skipped');
  }
};

const renderProjectSkillsSection = (projectDir) => {
  const skills = listProjectSkillsDetailed(projectDir);
  if (skills.length === 0) {
    return '';
  }

  const lines = [
    '## 项目 Skills',
    '',
    '- canonical source: `.praxis/skills/`',
    '- 完整索引：`.praxis/skills/INDEX.md`',
    '',
    '当前已安装 skills：',
    ...skills.map((skill) => `- \`${skill.name}\`：${skill.summary}`),
  ];

  return lines.join('\n');
};

function renderDependencyGateSummary(projectDir, entryAgent = null) {
  const openspecRuntime = resolveOpenSpecRuntime(projectDir);
  const currentAgent = entryAgent && SUPPORTED_AGENTS.includes(entryAgent) ? entryAgent : null;
  const currentAgentDetection = currentAgent ? detectSuperpowersForAgent(projectDir, currentAgent) : null;

  const lines = [
    '## 全局硬门禁',
    '',
    openspecRuntime.status === 'ok'
      ? '- OpenSpec 已可用；所有 OpenSpec 命令统一通过 `npx praxis-devos openspec ...` 调用。'
      : '- OpenSpec 不可用；先执行 `npx praxis-devos bootstrap --openspec`，不要直接进入提案、校验或归档。',
  ];

  if (currentAgent && currentAgentDetection) {
    if (currentAgentDetection.status === 'ok') {
      lines.push(`- 当前入口按 \`${currentAgent}\` 处理；Superpowers 已可用。`);
    } else {
      lines.push(`- 当前入口按 \`${currentAgent}\` 处理；若要继续工作，先执行 \`npx praxis-devos bootstrap --agent ${currentAgent}\`\u3002`);
    }
  } else {
    lines.push('- 若当前运行环境缺少所需 Superpowers，先执行 `npx praxis-devos bootstrap --agent <current-agent>`，再继续工作。');
  }

  lines.push('- 缺少当前运行环境所需依赖时，先停止实现并完成 bootstrap。');
  lines.push('- 标记完成前，必须执行验证门控；若当前任务属于 OpenSpec change，还必须执行 `npx praxis-devos openspec validate <change-id> --strict --no-interactive`。');

  return lines.join('\n');
}

const renderManagedRulesBlock = (projectDir, entryAgent = null) => {
  const paths = projectPaths(projectDir);

  const sections = [
    '> AI 入口区块：以下内容由 Praxis DevOS 自动维护。',
    '> 先按本区块分流，再读取后续项目上下文；执行 `praxis-devos sync` 时，此区块会被刷新。',
    '',
    '## AI Dispatch',
    '',
    '- 你当前位于一个由 Praxis DevOS 管理的项目中。',
    '- canonical project state 只认 `.praxis/`；不要把 `.opencode/`、`.claude/` 等 agent 私有目录视为事实来源。',
    '- 先决定当前任务属于 proposal、implementation、review 中的哪一条流程，不要直接开始实现。',
    '',
    '## Flow Selection',
    '',
    '- proposal flow: 用户显式输入 `/change` 或 `/proposal`，或者任务属于新功能、API 变更、架构重构、破坏性变更。此时禁止直接实现。',
    '- implementation flow: 任务属于代码实现、测试、重构、调试、修缺陷。',
    '- review flow: 用户要求 review、审查、排查回归风险、检查测试缺口。',
    '- 如果任务意图不清晰，先澄清；不要在未分流前直接写代码。',
    '',
    '## Required Reads',
    '',
    '- proposal flow: 先读取 `openspec/AGENTS.md`，再按需读取 `openspec/project.md`；若需求仍不清晰，先进入 brainstorming，再决定 full / lite proposal。',
    '- implementation flow: 先读取 `.praxis/rules.md`；需要项目 skill 时，先读取 `.praxis/skills/INDEX.md`，再打开对应 `SKILL.md`。',
    '- review flow: 先读取 `.praxis/rules.md`；如涉及评审流程或提案关联，再读取对应 skill 与 OpenSpec 文件。',
    '',
    renderDependencyGateSummary(projectDir, entryAgent),
    '',
    renderProjectSkillsSection(projectDir),
    '',
    '## Canonical Sources',
    '',
    '- `.praxis/framework-rules.md`：完整框架门控规则',
    '- `.praxis/rules.md`：完整技术栈 / 项目规则',
    '- `.praxis/skills/INDEX.md`：当前项目可用 skills 摘要',
    '- `openspec/AGENTS.md`：OpenSpec 规范驱动工作流',
    '- `openspec/project.md`：项目规范上下文',
  ].filter(Boolean);

  return sections.join('\n');
};

const ensureProjectSkillsIndex = ({ projectDir, log }) => {
  const paths = projectPaths(projectDir);
  const nextContent = `${renderProjectSkillsIndex(projectDir)}`;
  const existing = readFile(paths.praxisSkillsIndexMd);

  if (existing !== nextContent) {
    writeText(paths.praxisSkillsIndexMd, nextContent);
    if (log) {
      log('✓ .praxis/skills/INDEX.md synced');
    }
    return;
  }

  if (log) {
    log('⊘ .praxis/skills/INDEX.md already up to date');
  }
};

const ensureCompiledRulesArtifact = ({ projectDir, log }) => {
  const paths = projectPaths(projectDir);
  const compiledRules = `${renderManagedRulesBlock(projectDir)}\n`;
  const existing = readFile(paths.praxisCompiledRulesMd);

  if (existing !== compiledRules) {
    writeText(paths.praxisCompiledRulesMd, compiledRules);
    if (log) {
      log('✓ .praxis/adapters/compiled-rules.md synced');
    }
    return;
  }

  if (log) {
    log('⊘ .praxis/adapters/compiled-rules.md already up to date');
  }
};

const syncCodexAdapter = ({ projectDir, log }) => {
  const paths = projectPaths(projectDir);
  const status = upsertManagedBlock(
    paths.rootAgentsMd,
    AGENTS_MANAGED_START,
    AGENTS_MANAGED_END,
    renderManagedRulesBlock(projectDir, 'codex'),
    AGENTS_MD_TEMPLATE,
  );

  log(`✓ Codex adapter synced via AGENTS.md (${status})`);
};

const syncClaudeAdapter = ({ projectDir, log }) => {
  const paths = projectPaths(projectDir);
  const status = upsertManagedBlock(
    paths.rootClaudeMd,
    CLAUDE_MANAGED_START,
    CLAUDE_MANAGED_END,
    renderManagedRulesBlock(projectDir, 'claude'),
    CLAUDE_MD_TEMPLATE,
  );

  log(`✓ Claude Code adapter synced via CLAUDE.md (${status})`);
};

const syncOpenCodeAdapter = ({ projectDir, log }) => {
  const paths = projectPaths(projectDir);

  ensureDir(paths.legacyOpenCodeDir);
  removePathIfExists(paths.legacyOpenCodeStackMd);
  removePathIfExists(paths.legacyOpenCodeRulesMd);

  writeText(path.join(paths.legacyOpenCodeDir, 'README.md'), `${OPENCODE_ADAPTER_README}\n`);
  log('✓ OpenCode adapter synced to .opencode/ (canonical assets remain in .praxis/)');
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
  ensureFrameworkRulesMirror({ projectDir });
  ensurePraxisManifest({ projectDir, agents: selectedAgents });
  ensureProjectSkillsIndex({ projectDir, log });
  ensureCompiledRulesArtifact({ projectDir, log });

  for (const agent of selectedAgents) {
    syncAgent({ projectDir, agent, log });
  }

  log(`✓ Synced adapters: ${selectedAgents.join(', ')}`);
  return logs.join('\n');
};

export const initProject = ({ projectDir, stackName, agents = SUPPORTED_AGENTS }) => {
  const logs = [];
  const log = (msg) => logs.push(msg);

  const resolvedStack = resolveStackName(projectDir, stackName);
  const selectedAgents = uniqueAgents(agents);

  log(`⟳ Selected stack: ${resolvedStack}`);

  ensureOpenSpecLayout({ projectDir, log });
  ensureFrameworkFiles({ projectDir, log });
  ensureCanonicalAssets({ projectDir, stackName: resolvedStack, log });
  ensurePraxisManifest({ projectDir, stackName: resolvedStack, agents: selectedAgents });

  const syncLogs = syncProject({ projectDir, agents: selectedAgents });
  if (syncLogs) {
    logs.push(syncLogs);
  }

  return logs.join('\n');
};

export const migrateProject = ({ projectDir, agents = SUPPORTED_AGENTS }) => {
  const logs = [];
  const log = (msg) => logs.push(msg);
  const paths = projectPaths(projectDir);

  ensureDir(paths.praxisSkillsDir);

  if (fs.existsSync(paths.legacyOpenCodeSkillsDir)) {
    for (const entry of fs.readdirSync(paths.legacyOpenCodeSkillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const src = path.join(paths.legacyOpenCodeSkillsDir, entry.name);
      const dst = path.join(paths.praxisSkillsDir, entry.name);
      if (fs.existsSync(dst)) {
        log(`⊘ .praxis/skills/${entry.name}/ already exists, skipped`);
      } else {
        copyDirIfMissing(src, dst);
        log(`✓ Migrated .opencode/skills/${entry.name}/ to .praxis/skills/`);
      }
    }
  }

  if (fs.existsSync(paths.legacyOpenCodeStackMd) && !fs.existsSync(paths.praxisStackMd)) {
    copyFile(paths.legacyOpenCodeStackMd, paths.praxisStackMd);
    log('✓ Migrated .opencode/stack.md to .praxis/stack.md');
  }

  if (fs.existsSync(paths.legacyOpenCodeRulesMd) && !fs.existsSync(paths.praxisRulesMd)) {
    copyFile(paths.legacyOpenCodeRulesMd, paths.praxisRulesMd);
    log('✓ Migrated .opencode/stack-rules.md to .praxis/rules.md');
  }

  const manifest = ensurePraxisManifest({
    projectDir,
    agents,
    migratedFrom: '.opencode',
    stackName: detectProjectStack(projectDir),
  });

  log(`✓ Migration manifest updated (stack: ${manifest.selectedStack})`);

  const syncLogs = syncProject({ projectDir, agents });
  if (syncLogs) {
    logs.push(syncLogs);
  }

  return logs.join('\n');
};

export const collectSkillsPaths = (projectDir) => {
  const paths = [];
  const project = projectPaths(projectDir);

  if (fs.existsSync(SKILLS_DIR)) {
    paths.push(SKILLS_DIR);
  }

  if (fs.existsSync(project.praxisSkillsDir)) {
    paths.push(project.praxisSkillsDir);
  }

  if (fs.existsSync(project.legacyOpenCodeSkillsDir)) {
    paths.push(project.legacyOpenCodeSkillsDir);
  }

  return paths;
};

export const buildSystemPrompt = (projectDir) => {
  const project = projectPaths(projectDir);
  const blocks = [];
  const frameworkRules = readFile(project.praxisFrameworkRulesMd) || readFile(FRAMEWORK_RULES_MD);
  const projectRules = readFile(project.praxisRulesMd);
  const compiledRules = readFile(project.praxisCompiledRulesMd);

  if (frameworkRules) {
    blocks.push(`<praxis-devos>\n${frameworkRules}\n</praxis-devos>`);
  }

  if (projectRules) {
    blocks.push(`<praxis-project-rules>\n${projectRules}\n</praxis-project-rules>`);
  }

  if (compiledRules) {
    blocks.push(`<praxis-compiled-rules>\n${compiledRules}\n</praxis-compiled-rules>`);
  }

  return blocks.length > 0 ? blocks.join('\n') : null;
};

export const listStacksDetailed = () => listDirs(STACKS_DIR).map((name) => {
  const stackMd = readFile(path.join(STACKS_DIR, name, 'stack.md'));
  const firstLine = stackMd ? stackMd.split('\n')[0].replace(/^#\s*/, '') : 'No description';
  return { name, description: firstLine };
});

export const statusProject = ({ projectDir, agents = SUPPORTED_AGENTS }) => {
  const paths = projectPaths(projectDir);
  const manifest = readJson(paths.manifestPath);
  const selectedAgents = uniqueAgents(agents);
  const activeChangesDir = path.join(paths.openspecDir, 'changes');
  const activeChanges = listDirs(activeChangesDir).filter((name) => !name.startsWith('.'));
  const projectSkills = listDirs(paths.praxisSkillsDir);
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
    `- initialized: ${fs.existsSync(paths.praxisDir) ? 'yes' : 'no'}`,
    `- canonical dir: ${fs.existsSync(paths.praxisDir) ? '.praxis/' : 'missing'}`,
    `- openspec workspace: ${fs.existsSync(paths.openspecDir) ? 'present' : 'missing'}`,
    `- manifest: ${manifest ? 'present' : 'missing'}`,
    `- skills index: ${fs.existsSync(paths.praxisSkillsIndexMd) ? 'present' : 'missing'}`,
  ];

  if (manifest) {
    lines.push(`- framework version: ${manifest.frameworkVersion || getPackageVersion()}`);
    lines.push(`- selected stack: ${manifest.selectedStack || 'unknown'}`);
    lines.push(`- configured agents: ${(manifest.agents || []).join(', ') || 'none'}`);
  }

  lines.push(`- project skills: ${projectSkills.length > 0 ? projectSkills.join(', ') : 'none'}`);
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
    throw new Error('OpenSpec workspace is missing. Run `praxis-devos init --stack <stack>` first.');
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
    `- run: praxis-devos openspec validate ${nextChangeId} --strict --no-interactive`,
    '- request approval before implementation',
    '- after approval, create the implementation branch and start coding',
  ];

  if (resolvedType === 'auto') {
    lines.splice(1, 0, '- type: auto -> full (safer default)');
  }

  return lines.join('\n');
};

export const runOpenSpecCommand = ({ projectDir, args }) => {
  const runtime = resolveOpenSpecRuntime(projectDir);
  if (runtime.status !== 'ok' || !runtime.command) {
    throw new Error(
      `OpenSpec is required for this command. ${runtime.detail}`,
    );
  }

  const result = runFile(runtime.command, args, {
    cwd: projectDir,
    timeout: 300_000,
  });

  if (!result.ok) {
    throw new Error(result.stderr || 'OpenSpec command failed');
  }

  return result.stdout || 'OpenSpec command completed with no output.';
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

const detectCodexSuperpowers = () => {
  const skillsPath = path.join(os.homedir(), '.agents', 'skills', 'superpowers');
  const clonePath = path.join(os.homedir(), '.codex', 'superpowers');

  if (fs.existsSync(skillsPath)) {
    return {
      status: 'ok',
      detail: `Detected Codex skills path at ${skillsPath}`,
    };
  }

  if (fs.existsSync(clonePath)) {
    return {
      status: 'warning',
      detail: `Found clone at ${clonePath}, but ~/.agents/skills/superpowers is missing`,
    };
  }

  return {
    status: 'missing',
    detail: 'Codex superpowers install not detected',
  };
};

const detectClaudeSuperpowers = () => ({
  status: 'unknown',
  detail: 'Claude marketplace installations are not portably detectable from the project workspace',
});

const detectSuperpowersForAgent = (projectDir, agent) => {
  if (agent === 'opencode') {
    return detectOpenCodeSuperpowers(projectDir);
  }

  if (agent === 'codex') {
    return detectCodexSuperpowers();
  }

  if (agent === 'claude') {
    return detectClaudeSuperpowers();
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
    return [
      'Follow the official Codex installation steps for Superpowers:',
      `- Reference: ${SUPERPOWERS_DOCS.codex}`,
      '- Clone the repo:',
      '  git clone https://github.com/obra/superpowers.git ~/.codex/superpowers',
      '- Create the skills symlink:',
      '  mkdir -p ~/.agents/skills',
      '  ln -s ~/.codex/superpowers/skills ~/.agents/skills/superpowers',
      '- Restart Codex',
      '- Optional: enable multi-agent in Codex config if you want subagent skills',
    ].join('\n');
  }

  if (agent === 'claude') {
    return [
      'Superpowers installation for Claude Code uses the plugin marketplace.',
      `- Reference: ${SUPERPOWERS_DOCS.main}`,
      '- Official marketplace:',
      '  /plugin install superpowers@claude-plugins-official',
      '- Marketplace registration flow:',
      '  /plugin marketplace add obra/superpowers-marketplace',
      '  /plugin install superpowers@superpowers-marketplace',
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
      '- Use the unified wrapper command from the same installation context:',
      '  npx praxis-devos openspec list --specs',
      '- If `praxis-devos` is installed on PATH, you can also run:',
      '  praxis-devos openspec list --specs',
    ].join('\n');
  }

  return [
    '== openspec ==',
    'OpenSpec is a hard dependency of Praxis DevOS.',
    'Preferred install (project-local):',
    `- npm install -D ${OPENSPEC_PACKAGE}`,
    'Then use the unified wrapper command:',
    '  npx praxis-devos openspec list --specs',
    '- If `praxis-devos` is installed on PATH, you can also run:',
    '  praxis-devos openspec list --specs',
    'Fallback install (global):',
    `- npm install -g ${OPENSPEC_PACKAGE}`,
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

  const lines = ['Dependency doctor:'];
  for (const result of results) {
    lines.push(`- [${formatStatus(result.status)}] ${result.name} — ${result.detail}`);
  }

  lines.push('');
  lines.push('Bootstrap commands:');
  lines.push('- praxis-devos bootstrap --openspec');
  lines.push(`- praxis-devos bootstrap --agents ${selectedAgents.join(',')}`);

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
    stack: null,
    agents: [],
    projectDir: process.cwd(),
    strict: false,
    withOpenSpec: false,
  };

  while (args.length > 0) {
    const token = args.shift();

    if (token === '--stack') {
      parsed.stack = args.shift() || null;
      continue;
    }

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

    if (token === '--strict') {
      parsed.strict = true;
      continue;
    }

    if (token === '--openspec') {
      parsed.withOpenSpec = true;
      continue;
    }
  }

  return parsed;
};

const parseOpenSpecCliArgs = (argv) => {
  const args = [...argv];
  const parsed = {
    projectDir: process.cwd(),
    args: [],
  };

  while (args.length > 0) {
    const token = args.shift();
    if (token === '--project-dir') {
      parsed.projectDir = path.resolve(args.shift() || parsed.projectDir);
      continue;
    }

    parsed.args.push(token);
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
  init           Initialize a project with canonical .praxis assets
  sync           Refresh agent adapters from canonical .praxis assets
  migrate        Move legacy .opencode project assets into .praxis
  change         Create an OpenSpec change scaffold from the explicit proposal path
  proposal       Compatibility alias of \`change\`
  status         Show current project initialization and dependency state
  doctor         Check required openspec/superpowers dependencies
  bootstrap      Print or apply dependency bootstrap steps for each agent
  openspec       Run OpenSpec through the Praxis wrapper
  list-stacks    List available technology stacks
  help           Show this help

Options:
  --stack <name>         Select a technology stack for init
  --agent <name>         Sync one agent adapter (repeatable)
  --agents a,b,c         Sync multiple agent adapters
  --project-dir <path>   Project directory (defaults to cwd)
  --title <text>         Change title for \`change\` / \`proposal\`
  --capability <name>    OpenSpec capability directory for \`change\`
  --change-id <id>       Explicit change-id for \`change\`
  --type <mode>          Scaffold type: auto, full, or lite
  --summary <text>       One-line summary for proposal scaffolding
  --strict               Fail doctor if required dependencies are missing
  --openspec             Include or target OpenSpec bootstrap

Supported agents:
  ${SUPPORTED_AGENTS.join(', ')}
`;

export const runCli = (argv) => {
  if (argv[0] === 'openspec') {
    const parsedOpenSpec = parseOpenSpecCliArgs(argv.slice(1));
    return runOpenSpecCommand({
      projectDir: parsedOpenSpec.projectDir,
      args: parsedOpenSpec.args,
    });
  }

  if (argv[0] === 'change' || argv[0] === 'proposal') {
    const parsedChange = parseChangeCliArgs(argv.slice(1));
    return createChangeScaffold(parsedChange);
  }

  const parsed = parseCliArgs(argv);
  const agents = parsed.agents.length > 0 ? parsed.agents : SUPPORTED_AGENTS;

  if (parsed.command === 'help' || parsed.command === '--help' || parsed.command === '-h') {
    return renderHelp();
  }

  if (parsed.command === 'list-stacks') {
    const stacks = listStacksDetailed();
    return `Available stacks:\n${stacks.map((stack) => `  ${stack.name} — ${stack.description}`).join('\n')}`;
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

    if (parsed.withOpenSpec) {
      outputs.push(bootstrapOpenSpec({
        projectDir: parsed.projectDir,
      }));
    }

    if (!parsed.withOpenSpec || parsed.agents.length > 0) {
      outputs.push(bootstrapProject({
        projectDir: parsed.projectDir,
        agents,
      }));
    }

    return outputs.join('\n\n');
  }

  if (parsed.command === 'init') {
    return initProject({
      projectDir: parsed.projectDir,
      stackName: parsed.stack,
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
