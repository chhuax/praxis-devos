import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PRAXIS_ROOT = path.resolve(__dirname, '../..');
export const SKILLS_DIR = path.join(PRAXIS_ROOT, 'skills');
export const STACKS_DIR = path.join(PRAXIS_ROOT, 'stacks');
export const FOUNDATIONS_DIR = path.join(PRAXIS_ROOT, 'foundations');
export const PROFILES_DIR = path.join(PRAXIS_ROOT, 'profiles');
export const OVERLAYS_DIR = path.join(PRAXIS_ROOT, 'overlays');
export const FRAMEWORK_RULES_MD = path.join(PRAXIS_ROOT, 'RULES.md');
export const PACKAGE_JSON = path.join(PRAXIS_ROOT, 'package.json');
export const MANAGED_ENTRY_TEMPLATE = path.join(PRAXIS_ROOT, 'src', 'templates', 'managed-entry.md');

export const PRAXIS_DIRNAME = '.praxis';
export const PRAXIS_MANIFEST = 'manifest.json';
export const SUPPORTED_AGENTS = ['opencode', 'codex', 'claude'];
export const USER_SKILLS = ['git-workflow', 'code-review'];
export const PRAXIS_FRAMEWORK_RULES = 'framework-rules.md';
export const PRAXIS_COMPILED_RULES = 'compiled-rules.md';
export const PRAXIS_SKILLS_INDEX = 'INDEX.md';
export const SUPERPOWERS_OPENCODE_PLUGIN = 'superpowers@git+https://github.com/obra/superpowers.git';
export const PRAXIS_OPENCODE_PLUGIN = 'praxis-devos@git+https://github.com/chhuax/praxis-devos.git';
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
- Edit built-in runtime base assets in \`.praxis/foundation/\`
- Edit runtime overlays in \`.praxis/overlays/\`
- Edit stack metadata in \`.praxis/stack.md\`
- Edit framework gates in \`.praxis/framework-rules.md\`
- Compiled cross-agent rules live in \`.praxis/adapters/compiled-rules.md\`
- Edit stack rules in \`.praxis/rules.md\`
- \`.opencode/\` no longer mirrors canonical skills, stack, or rules files by default
- If you add OpenCode-only supplemental skills, place them in \`.opencode/skills/\`
- The plugin prioritizes \`.praxis/skills/\` and treats \`.opencode/skills/\` as a supplemental layer
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
    detail: 'OpenSpec CLI is missing. Praxis can install it automatically during `npx praxis-devos init` or `npx praxis-devos setup --agent <name>`.',
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
  skillsPath: path.join(os.homedir(), '.agents', 'skills', 'superpowers'),
  skillsParent: path.join(os.homedir(), '.agents', 'skills'),
  clonePath: path.join(os.homedir(), '.codex', 'superpowers'),
  cloneParent: path.join(os.homedir(), '.codex'),
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

const seedDirPreservingExisting = (src, dst) => {
  if (!fs.existsSync(dst)) {
    syncDirRecursive(src, dst);
    return 'created';
  }

  syncMissingFilesRecursive(src, dst);
  return 'merged';
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
    praxisFoundationDir: path.join(praxisDir, 'foundation'),
    praxisFoundationReadme: path.join(praxisDir, 'foundation', 'README.md'),
    praxisFoundationProfileDir: path.join(praxisDir, 'foundation', 'profile'),
    praxisFoundationManifestPath: path.join(praxisDir, 'foundation', 'manifest.json'),
    praxisOverlaysDir: path.join(praxisDir, 'overlays'),
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
  return null;
};

const resolveStackName = (projectDir, stackName) => stackName || detectProjectStack(projectDir);
const DEFAULT_FOUNDATION_NAME = 'ecc-foundation';
const DEFAULT_RUNTIME_BASE_LABEL = 'built-in Praxis runtime base';

const describeRuntimeBaseSelection = (foundationName) => foundationName === DEFAULT_FOUNDATION_NAME
  ? DEFAULT_RUNTIME_BASE_LABEL
  : `runtime base preset: ${foundationName}`;

const NO_STACK_MARKER = '<!-- PRAXIS_NO_STACK -->';

const renderNoStackStackMd = () => `${NO_STACK_MARKER}
# No Stack Selected

This project has the Praxis DevOS framework initialized, but no technology stack has been applied yet.

Next step:

\`\`\`bash
npx praxis-devos use-stack <stack-name>
\`\`\`
`;

const renderNoStackRulesMd = () => `${NO_STACK_MARKER}
# No Stack Rules Installed

No stack-specific rules are installed yet.

Select a stack before relying on project-level stack guidance:

\`\`\`bash
npx praxis-devos use-stack <stack-name>
\`\`\`
`;

const isNoStackPlaceholder = (content) => typeof content === 'string' && content.includes(NO_STACK_MARKER);

const ensurePraxisManifest = ({ projectDir, stackName, agents, migratedFrom }) => {
  const paths = projectPaths(projectDir);
  const manifest = readJson(paths.manifestPath) || {};
  const nextAgents = [...new Set([...(manifest.agents || []), ...uniqueAgents(agents)])];
  const selectedStack = stackName ?? manifest.selectedStack ?? detectProjectStack(projectDir) ?? null;
  const selectedFoundation = manifest.selectedFoundation ?? null;
  const foundationProfile = manifest.foundationProfile ?? null;
  const foundationOverlays = Array.isArray(manifest.foundationOverlays) ? manifest.foundationOverlays : [];

  const nextManifest = {
    schemaVersion: 1,
    framework: 'praxis-devos',
    frameworkVersion: getPackageVersion(),
    canonicalDir: '.praxis',
    selectedStack,
    selectedFoundation,
    foundationProfile,
    foundationOverlays,
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

const updatePraxisManifestFoundation = ({ projectDir, foundationName, profileName, overlayNames }) => {
  const paths = projectPaths(projectDir);
  const manifest = readJson(paths.manifestPath) || {};

  const nextManifest = {
    ...manifest,
    schemaVersion: manifest.schemaVersion || 1,
    framework: manifest.framework || 'praxis-devos',
    frameworkVersion: manifest.frameworkVersion || getPackageVersion(),
    canonicalDir: manifest.canonicalDir || '.praxis',
    selectedStack: manifest.selectedStack ?? detectProjectStack(projectDir) ?? null,
    selectedFoundation: foundationName,
    foundationProfile: profileName,
    foundationOverlays: overlayNames,
    agents: manifest.agents || [],
    dependencies: manifest.dependencies || {
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
    migratedFrom: manifest.migratedFrom || null,
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

const ensureBaseCanonicalAssets = ({ projectDir, log }) => {
  const paths = projectPaths(projectDir);
  ensureDir(paths.praxisSkillsDir);
  ensureDir(paths.praxisAdaptersDir);
  ensureFrameworkRulesMirror({ projectDir, log });

  for (const skillName of USER_SKILLS) {
    const skillSrc = path.join(SKILLS_DIR, skillName);
    const skillDst = path.join(paths.praxisSkillsDir, skillName);
    if (fs.existsSync(skillSrc)) {
      const status = ensureDirSeeded(skillSrc, skillDst);
      if (status === 'created') {
        log(`✓ .praxis/skills/${skillName}/ copied (customizable)`);
      } else if (status === 'repaired') {
        log(`✓ .praxis/skills/${skillName}/ repaired from framework defaults`);
      } else {
        log(`⊘ .praxis/skills/${skillName}/ already exists, skipped`);
      }
    }
  }
};

const applyStackAssets = ({ projectDir, stackName, log }) => {
  const paths = projectPaths(projectDir);
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
      const status = ensureDirSeeded(skillSrc, skillDst);
      if (status === 'created') {
        log(`✓ .praxis/skills/${entry.name}/ copied (from ${stackName})`);
      } else if (status === 'repaired') {
        log(`✓ .praxis/skills/${entry.name}/ repaired from ${stackName}`);
      } else {
        log(`⊘ .praxis/skills/${entry.name}/ already exists, skipped`);
      }
    }
  }

  const stackMdSrc = path.join(stackSrc, 'stack.md');
  const existingStackMd = readFile(paths.praxisStackMd);
  if (fs.existsSync(stackMdSrc) && (!fs.existsSync(paths.praxisStackMd) || isNoStackPlaceholder(existingStackMd))) {
    copyFile(stackMdSrc, paths.praxisStackMd);
    log(fs.existsSync(paths.praxisStackMd) && isNoStackPlaceholder(existingStackMd)
      ? '✓ .praxis/stack.md applied from selected stack'
      : '✓ .praxis/stack.md created');
  } else if (fs.existsSync(paths.praxisStackMd)) {
    log('⊘ .praxis/stack.md already exists, skipped');
  }

  const rulesMdSrc = path.join(stackSrc, 'rules.md');
  const existingRulesMd = readFile(paths.praxisRulesMd);
  if (fs.existsSync(rulesMdSrc) && (!fs.existsSync(paths.praxisRulesMd) || isNoStackPlaceholder(existingRulesMd))) {
    copyFile(rulesMdSrc, paths.praxisRulesMd);
    log(fs.existsSync(paths.praxisRulesMd) && isNoStackPlaceholder(existingRulesMd)
      ? '✓ .praxis/rules.md applied from selected stack'
      : '✓ .praxis/rules.md created');
  } else if (fs.existsSync(paths.praxisRulesMd)) {
    log('⊘ .praxis/rules.md already exists, skipped');
  }
};

const ensureNoStackPlaceholders = ({ projectDir, log }) => {
  const paths = projectPaths(projectDir);

  if (!fs.existsSync(paths.praxisStackMd)) {
    writeText(paths.praxisStackMd, renderNoStackStackMd());
    log('✓ .praxis/stack.md placeholder created');
  }

  if (!fs.existsSync(paths.praxisRulesMd)) {
    writeText(paths.praxisRulesMd, renderNoStackRulesMd());
    log('✓ .praxis/rules.md placeholder created');
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
    '- `.opencode/skills/` 可作为 OpenCode supplemental layer，但不属于 canonical project state',
    '- 完整索引：`.praxis/skills/INDEX.md`',
    '',
    '当前已安装 skills：',
    ...skills.map((skill) => `- \`${skill.name}\`：${skill.summary}`),
  ];

  return lines.join('\n');
};

function renderDependencyGateSummary(projectDir) {
  const openspecRuntime = resolveOpenSpecRuntime(projectDir);

  const lines = [
    '## 全局硬门禁',
    '',
    openspecRuntime.status === 'ok'
      ? '- OpenSpec 已可用；治理 / proposal 场景统一通过 `npx praxis-devos openspec ...` 调用。'
      : '- OpenSpec 当前不可用；日常实现可继续沿用 runtime base + stack 基线，但 proposal / validate / archive 流程必须先执行 `npx praxis-devos setup --agent <name>`。',
  ];

  lines.push('- 如果当前 agent 缺少所需 Superpowers，先停止实现并完成对应 bootstrap。');
  lines.push('- Codex：`npx praxis-devos bootstrap --agent codex`');
  lines.push('- Claude Code：`npx praxis-devos bootstrap --agent claude`');
  lines.push('- OpenCode：`npx praxis-devos bootstrap --agent opencode`');
  lines.push('- 框架管控中，`openspec`、`git-workflow`、`verification-before-completion` 是硬门禁；`brainstorming`、`writing-plans`、`systematic-debugging`、`subagent-driven-development` 则由 Proposal Intake、实现复杂度、故障信号和并行拆分信号触发。');
  lines.push('- 标记完成前，必须执行验证门控；若当前任务属于受治理的 OpenSpec change，还必须执行 `npx praxis-devos openspec validate <change-id> --strict --no-interactive`。');

  return lines.join('\n');
}

const renderManagedEntryTemplate = (projectDir) => {
  const template = readFile(MANAGED_ENTRY_TEMPLATE);
  if (!template) {
    throw new Error(`Managed entry template is missing: ${MANAGED_ENTRY_TEMPLATE}`);
  }

  return template
    .replace('{{dependency_gate_summary}}', renderDependencyGateSummary(projectDir))
    .replace('{{foundation_section}}', renderFoundationSection(projectDir))
    .replace('{{project_skills_section}}', renderProjectSkillsSection(projectDir));
};

const renderManagedRulesBlock = (projectDir) => {
  return renderManagedEntryTemplate(projectDir);
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
    renderManagedRulesBlock(projectDir),
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
    renderManagedRulesBlock(projectDir),
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

export const initProject = ({
  projectDir,
  stackName,
  foundationName = null,
  agents = SUPPORTED_AGENTS,
  applyDefaultFoundation = true,
  ensureOpenSpecRuntimeInstalled = true,
}) => {
  const logs = [];
  const log = (msg) => logs.push(msg);

  const resolvedStack = resolveStackName(projectDir, stackName);
  const selectedAgents = uniqueAgents(agents);
  const existingManifest = readJson(projectPaths(projectDir).manifestPath) || {};
  const resolvedFoundation = foundationName
    ?? existingManifest.selectedFoundation
    ?? (applyDefaultFoundation ? DEFAULT_FOUNDATION_NAME : null);

  if (ensureOpenSpecRuntimeInstalled) {
    logs.push(ensureOpenSpecRuntime(projectDir));
  }

  ensureOpenSpecLayout({ projectDir, log });
  ensureFrameworkFiles({ projectDir, log });
  ensureBaseCanonicalAssets({ projectDir, log });

  if (resolvedStack) {
    log(`⟳ Selected stack: ${resolvedStack}`);
    applyStackAssets({ projectDir, stackName: resolvedStack, log });
  } else {
    log('⟳ No stack selected during init');
    ensureNoStackPlaceholders({ projectDir, log });
  }

  ensurePraxisManifest({ projectDir, stackName: resolvedStack, agents: selectedAgents });

  if (resolvedFoundation) {
    log(`⟳ Applying ${describeRuntimeBaseSelection(resolvedFoundation)}`);
    const foundationLogs = useFoundationProject({
      projectDir,
      foundationName: resolvedFoundation,
      agents: selectedAgents,
    });
    if (foundationLogs) {
      logs.push(foundationLogs);
    }
    return logs.join('\n');
  }

  const syncLogs = syncProject({ projectDir, agents: selectedAgents });
  if (syncLogs) {
    logs.push(syncLogs);
  }

  return logs.join('\n');
};

export const useStackProject = ({ projectDir, stackName, agents = SUPPORTED_AGENTS }) => {
  const logs = [];
  const log = (msg) => logs.push(msg);
  const paths = projectPaths(projectDir);
  const manifest = readJson(paths.manifestPath);
  const resolvedStack = resolveStackName(projectDir, stackName);

  if (!fs.existsSync(paths.praxisDir) || !fs.existsSync(paths.openspecDir)) {
    throw new Error('Praxis project is not initialized. Run `npx praxis-devos setup --agent <name>` first.');
  }

  if (!resolvedStack) {
    throw new Error(`Stack name is required. Use one of: ${listDirs(STACKS_DIR).join(', ')}`);
  }

  if (manifest?.selectedStack && manifest.selectedStack !== resolvedStack) {
    throw new Error(
      `Switching stacks from "${manifest.selectedStack}" to "${resolvedStack}" is not automatic yet. ` +
      'Review and clean existing stack assets before applying a different stack.',
    );
  }

  log(`⟳ Applying stack: ${resolvedStack}`);
  applyStackAssets({ projectDir, stackName: resolvedStack, log });
  ensurePraxisManifest({ projectDir, stackName: resolvedStack, agents: uniqueAgents(agents) });

  const syncLogs = syncProject({ projectDir, agents });
  if (syncLogs) {
    logs.push(syncLogs);
  }

  return logs.join('\n');
};

const isProjectInitialized = (projectDir) => {
  const paths = projectPaths(projectDir);
  return fs.existsSync(paths.praxisDir) && fs.existsSync(paths.openspecDir);
};

export const setupProject = ({
  projectDir,
  stackName = null,
  foundationName = null,
  agents = SUPPORTED_AGENTS,
  strict = false,
  applyDefaultFoundation = true,
}) => {
  const selectedAgents = uniqueAgents(agents);
  const outputs = [];
  const wasInitialized = isProjectInitialized(projectDir);

  outputs.push(ensureOpenSpecRuntime(projectDir));
  outputs.push('');
  outputs.push(ensureRuntimeDependencies({ projectDir, agents: selectedAgents }));
  outputs.push('');

  if (!wasInitialized) {
    outputs.push('== setup ==');
    outputs.push(initProject({
      projectDir,
      stackName,
      foundationName,
      agents: selectedAgents,
      applyDefaultFoundation,
      ensureOpenSpecRuntimeInstalled: false,
    }));
  } else {
    outputs.push('== setup ==');
    outputs.push('Project already initialized; refreshing selected agents and managed adapters.');
    outputs.push(syncProject({ projectDir, agents: selectedAgents }));
  }

  const manifest = readJson(projectPaths(projectDir).manifestPath) || {};
  const resolvedFoundation = foundationName
    ?? (manifest.selectedFoundation ? null : (applyDefaultFoundation ? DEFAULT_FOUNDATION_NAME : null));

  if (resolvedFoundation && wasInitialized) {
    outputs.push('');
    outputs.push(`⟳ Applying ${describeRuntimeBaseSelection(resolvedFoundation)}`);
    outputs.push(useFoundationProject({
      projectDir,
      foundationName: resolvedFoundation,
      agents: selectedAgents,
    }));
  }

  if (stackName && wasInitialized) {
    outputs.push('');
    outputs.push(useStackProject({ projectDir, stackName, agents: selectedAgents }));
  }

  outputs.push('');
  outputs.push(doctorProject({ projectDir, agents: selectedAgents, strict }));

  return outputs.filter(Boolean).join('\n');
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

const readFoundationDefinition = (foundationName) => {
  const definitionPath = path.join(FOUNDATIONS_DIR, foundationName, 'foundation.json');
  const definition = readJson(definitionPath);
  if (!definition) {
    return null;
  }

  return {
    name: foundationName,
    ...definition,
  };
};

export const listFoundationsDetailed = () => listDirs(FOUNDATIONS_DIR).map((name) => {
  const definition = readFoundationDefinition(name);
  return {
    name,
    description: definition?.description || 'No description',
    runtimeBase: definition?.runtimeBase || 'unknown',
    profile: definition?.profile || 'unknown',
    overlays: Array.isArray(definition?.overlays) ? definition.overlays : [],
    openspecMode: definition?.openspec?.mode || 'unknown',
  };
});

const renderFoundationReadme = (definition) => {
  const overlayList = Array.isArray(definition.overlays) && definition.overlays.length > 0
    ? definition.overlays.map((name) => `- \`${name}\``).join('\n')
    : '- none';

  return `# Praxis Runtime Base

This project is provisioned with the ${DEFAULT_RUNTIME_BASE_LABEL}.

## Summary

- runtime preset: \`${definition.name}\`
- runtime engine: \`${definition.runtimeBase || 'unknown'}\`
- runtime profile: \`${definition.profile || 'unknown'}\`
- OpenSpec mode: \`${definition.openspec?.mode || 'unknown'}\`

## Applied overlays

${overlayList}

## Operating model

- Treat this runtime base as the default baseline for day-to-day AI engineering workflows.
- Keep \`.praxis/foundation/profile/\` as the local, editable profile baseline.
- Keep \`.praxis/overlays/\` as extension seams for future internal MCP, docs, commands, hooks, rules, and skills.
- Use OpenSpec when the work needs governance, proposal review, or controlled change records. It is available, but it is not the required front door for every daily task.
`;
};

export const useFoundationProject = ({ projectDir, foundationName, agents = SUPPORTED_AGENTS }) => {
  const paths = projectPaths(projectDir);
  const manifest = readJson(paths.manifestPath);
  const logs = [];
  const log = (msg) => logs.push(msg);

  if (!fs.existsSync(paths.praxisDir)) {
    throw new Error('Praxis project is not initialized. Run `npx praxis-devos setup --agent <name>` first.');
  }

  if (!foundationName) {
    throw new Error(`Runtime base preset name is required. Available: ${listDirs(FOUNDATIONS_DIR).join(', ')}`);
  }

  const definition = readFoundationDefinition(foundationName);
  if (!definition) {
    throw new Error(`Foundation "${foundationName}" not found. Available: ${listDirs(FOUNDATIONS_DIR).join(', ')}`);
  }

  if (manifest?.selectedFoundation && manifest.selectedFoundation !== foundationName) {
    throw new Error(
      `Switching runtime base presets from "${manifest.selectedFoundation}" to "${foundationName}" is not automatic yet. ` +
      'Review and clean existing runtime base assets before applying a different preset.',
    );
  }

  const profileSrc = path.join(PROFILES_DIR, definition.profile);
  if (!fs.existsSync(profileSrc)) {
    throw new Error(`Foundation profile "${definition.profile}" is missing from ${PROFILES_DIR}`);
  }

  ensureDir(paths.praxisFoundationDir);
  ensureDir(paths.praxisOverlaysDir);

  const profileStatus = seedDirPreservingExisting(profileSrc, paths.praxisFoundationProfileDir);
  if (profileStatus === 'created') {
    log(`✓ .praxis/foundation/profile/ created from ${definition.profile}`);
  } else {
    log(`✓ .praxis/foundation/profile/ merged from ${definition.profile}`);
  }

  const overlayNames = Array.isArray(definition.overlays) ? definition.overlays : [];
  for (const overlayName of overlayNames) {
    const overlaySrc = path.join(OVERLAYS_DIR, overlayName);
    if (!fs.existsSync(overlaySrc)) {
      throw new Error(`Foundation overlay "${overlayName}" is missing from ${OVERLAYS_DIR}`);
    }

    const overlayDst = path.join(paths.praxisOverlaysDir, overlayName);
    const overlayStatus = seedDirPreservingExisting(overlaySrc, overlayDst);
    if (overlayStatus === 'created') {
      log(`✓ .praxis/overlays/${overlayName}/ created`);
    } else {
      log(`✓ .praxis/overlays/${overlayName}/ merged`);
    }
  }

  writeJson(paths.praxisFoundationManifestPath, {
    foundation: definition.name,
    runtimeBase: definition.runtimeBase || null,
    profile: definition.profile || null,
    overlays: overlayNames,
    openspec: definition.openspec || null,
    appliedAt: new Date().toISOString(),
  });
  writeText(paths.praxisFoundationReadme, `${renderFoundationReadme(definition)}\n`);
  updatePraxisManifestFoundation({
    projectDir,
    foundationName: definition.name,
    profileName: definition.profile || null,
    overlayNames,
  });

  const syncLogs = syncProject({ projectDir, agents });
  if (syncLogs) {
    logs.push(syncLogs);
  }

  return logs.join('\n');
};

const renderFoundationSection = (projectDir) => {
  const paths = projectPaths(projectDir);
  const foundationManifest = readJson(paths.praxisFoundationManifestPath);

  const lines = [
    '## Praxis Runtime Base',
    '',
  ];

  if (!foundationManifest) {
    lines.push('- runtime base: not applied');
    lines.push('- daily workflows can still run on stack defaults, but the built-in runtime base assets have not been synced yet.');
    return lines.join('\n');
  }

  lines.push(`- runtime base: ${DEFAULT_RUNTIME_BASE_LABEL}`);
  lines.push(`- runtime preset: \`${foundationManifest.foundation || 'unknown'}\``);
  lines.push(`- runtime engine: \`${foundationManifest.runtimeBase || 'unknown'}\``);
  lines.push(`- runtime profile: \`${foundationManifest.profile || 'unknown'}\``);
  lines.push(`- applied runtime overlays: ${(foundationManifest.overlays || []).map((name) => `\`${name}\``).join(', ') || 'none'}`);
  lines.push('- daily implementation should read `.praxis/foundation/README.md` before reaching for governance docs.');
  lines.push('- OpenSpec remains available for proposal and governance work, but it is not the mandatory front door for daily execution.');
  return lines.join('\n');
};

export const statusProject = ({ projectDir, agents = SUPPORTED_AGENTS }) => {
  const paths = projectPaths(projectDir);
  const manifest = readJson(paths.manifestPath);
  const selectedAgents = uniqueAgents(agents);
  const activeChangesDir = path.join(paths.openspecDir, 'changes');
  const activeChanges = listDirs(activeChangesDir).filter((name) => !name.startsWith('.'));
  const projectSkills = listDirs(paths.praxisSkillsDir);
  const appliedOverlays = listDirs(paths.praxisOverlaysDir);
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
    lines.push(`- runtime base preset: ${manifest.selectedFoundation || 'none'}`);
    lines.push(`- runtime profile: ${manifest.foundationProfile || 'none'}`);
    lines.push(`- runtime overlays: ${(manifest.foundationOverlays || []).join(', ') || 'none'}`);
    lines.push(`- configured agents: ${(manifest.agents || []).join(', ') || 'none'}`);
  }

  lines.push(`- project skills: ${projectSkills.length > 0 ? projectSkills.join(', ') : 'none'}`);
  lines.push(`- overlay directories: ${appliedOverlays.length > 0 ? appliedOverlays.join(', ') : 'none'}`);
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
系统 MUST 支持“${title}”对应的目标能力，并提供可验证的主流程结果。
系统 SHALL 在输入不满足前置条件、权限不足或命中边界约束时，返回明确且可验证的处理结果。

#### Scenario: 主流程待细化
- **WHEN** 触发“${title}”对应的主流程
- **THEN** 系统返回与该能力一致的预期结果
- **AND** 响应或副作用可被验证

#### Scenario: 边界条件待细化
- **WHEN** 输入不满足前置条件、权限要求或边界约束
- **THEN** 系统返回明确的失败或降级结果
- **AND** 不产生未声明的副作用
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
    throw new Error('OpenSpec workspace is missing. Run `npx praxis-devos setup --agent <name> --stack <stack>` first.');
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
    `- run: npx praxis-devos openspec validate ${nextChangeId} --strict --no-interactive`,
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
    throw new Error('npm is required to install OpenSpec automatically. Install npm, then rerun `npx praxis-devos init` or `npx praxis-devos setup --agent <name>`.');
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
      detail: `Found clone at ${clonePath}, but ~/.agents/skills/superpowers is missing`,
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

const detectClaudeSuperpowers = () => ({
  status: 'unknown',
  detail: 'Claude marketplace installations are not portably detectable from the project workspace',
});

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
      logs.push('Manual action required: Claude Code SuperPowers cannot be installed automatically from Praxis.');
      logs.push(renderBootstrapInstructions({ projectDir, agent }));
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
    if (process.platform === 'win32') {
      return [
        'Follow the official Codex installation steps for Superpowers (PowerShell):',
        `- Reference: ${SUPERPOWERS_DOCS.codex}`,
        '- Clone the repo:',
        '  git clone https://github.com/obra/superpowers.git "$HOME/.codex/superpowers"',
        '- Create the skills directory:',
        '  New-Item -ItemType Directory -Force "$HOME/.agents/skills" | Out-Null',
        '- Link the skills directory (junction avoids Windows symlink privilege issues):',
        '  New-Item -ItemType Junction -Path "$HOME/.agents/skills/superpowers" -Target "$HOME/.codex/superpowers/skills"',
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
    stack: null,
    foundation: null,
    agents: [],
    file: null,
    positional: [],
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

    if (token === '--foundation') {
      parsed.foundation = args.shift() || null;
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

    if (token === '--file') {
      parsed.file = path.resolve(args.shift() || parsed.projectDir);
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

  if (parsed.command === 'use-stack' && !parsed.stack && parsed.positional.length > 0) {
    parsed.stack = parsed.positional[0];
  }

  if (parsed.command === 'use-foundation' && !parsed.foundation && parsed.positional.length > 0) {
    parsed.foundation = parsed.positional[0];
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

const normalizeTranscriptText = (input) => input
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n');

const matchAny = (text, patterns) => patterns.some((pattern) => pattern.test(text));

const SESSION_EVENT_RULES = [
  {
    id: 'proposal-flow',
    label: 'proposal flow',
    signal: [
      /\/change\b/i,
      /\/proposal\b/i,
      /proposal flow/i,
      /提案通道/,
      /proposal\.md/i,
      /spec delta/i,
    ],
    requirements: [
      {
        id: 'proposal-intake',
        label: 'Proposal Intake',
        patterns: [
          /Proposal Intake/i,
          /change target/i,
          /intended behavior/i,
          /scope\/risk/i,
          /open questions/i,
          /变更对象/,
          /预期变化/,
          /范围.*风险/,
          /开放问题/,
        ],
      },
      {
        id: 'openspec',
        label: 'openspec',
        patterns: [
          /openspec\/AGENTS\.md/i,
          /praxis-devos openspec/i,
          /\bopenspec\b/i,
          /spec delta/i,
        ],
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
          /writing-plans/i,
          /实施计划/,
          /执行计划/,
          /分步计划/,
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

export const renderHelp = () => `praxis-devos <command> [options]

Commands:
  setup          Bootstrap dependencies, initialize framework files, apply the built-in Praxis runtime base, and optionally apply a stack
  init           Initialize the framework skeleton and apply the built-in Praxis runtime base in the current project
  use-stack      Apply a technology stack to an initialized project
  use-foundation Advanced: re-apply internal runtime-base assets
  sync           Refresh agent adapters from canonical .praxis assets
  migrate        Move legacy .opencode project assets into .praxis
  change         Create an OpenSpec change scaffold from the explicit proposal path
  proposal       Compatibility alias of \`change\`
  status         Show current project initialization and dependency state
  doctor         Check required openspec/superpowers dependencies
  bootstrap      Print or apply dependency bootstrap steps for each agent
  openspec       Run OpenSpec through the Praxis wrapper
  validate-session  Validate a transcript against Praxis evidence hooks
  list-stacks    List available technology stacks
  list-foundations Advanced: list internal runtime-base presets
  help           Show this help

Options:
  --stack <name>         Select a technology stack for setup/init, or pass it positionally to use-stack
  --agent <name>         Sync one agent adapter (repeatable)
  --agents a,b,c         Sync multiple agent adapters
  --project-dir <path>   Project directory (defaults to cwd)
  --file <path>          Transcript file for \`validate-session\`
  --title <text>         Change title for \`change\` / \`proposal\`
  --capability <name>    OpenSpec capability directory for \`change\`
  --change-id <id>       Explicit change-id for \`change\`
  --type <mode>          Scaffold type: auto, full, or lite
  --summary <text>       One-line summary for proposal scaffolding
  --strict               Fail doctor if required dependencies are missing

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

  if (parsed.command === 'list-foundations') {
    const foundations = listFoundationsDetailed();
    return `Available runtime base presets:\n${foundations.map((foundation) => `  ${foundation.name} — ${foundation.description}`).join('\n')}`;
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
      stackName: parsed.stack,
      foundationName: parsed.foundation,
      agents,
      strict: parsed.strict,
    });
  }

  if (parsed.command === 'use-stack') {
    if (!parsed.stack) {
      throw new Error('Stack name is required. Use `npx praxis-devos use-stack <name>` or `--stack <name>`.');
    }

    return useStackProject({
      projectDir: parsed.projectDir,
      stackName: parsed.stack,
      agents,
    });
  }

  if (parsed.command === 'validate-session') {
    return validateSessionTranscript({
      filePath: parsed.file,
      strict: parsed.strict,
    });
  }

  if (parsed.command === 'use-foundation') {
    if (!parsed.foundation) {
      throw new Error('Runtime base preset name is required. Use the advanced command `npx praxis-devos use-foundation <name>`.');
    }

    return useFoundationProject({
      projectDir: parsed.projectDir,
      foundationName: parsed.foundation,
      agents,
    });
  }

  if (parsed.command === 'init') {
    return initProject({
      projectDir: parsed.projectDir,
      stackName: parsed.stack,
      foundationName: parsed.foundation,
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
