/**
 * Praxis DevOS plugin for OpenCode.ai
 *
 * Responsibilities:
 * 1. Register skills paths (plugin + user-project) via config hook
 * 2. Inject RULES.md content into system prompt via transform hook
 * 3. Provide `praxis-init` custom tool for project initialization
 * 4. Auto-install OpenSpec CLI and initialize openspec/ structure
 */

import path from 'path';
import fs from 'fs';
import { execSync, execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PRAXIS_ROOT = path.resolve(__dirname, '../..');
const SKILLS_DIR = path.join(PRAXIS_ROOT, 'skills');
const STACKS_DIR = path.join(PRAXIS_ROOT, 'stacks');
const RULES_MD = path.join(PRAXIS_ROOT, 'RULES.md');

const USER_SKILLS = ['git-workflow', 'code-review'];

const readFile = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
};

const listDirs = (dirPath) => {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
};

const collectSkillsPaths = (projectDir) => {
  const paths = [];

  if (fs.existsSync(SKILLS_DIR)) {
    paths.push(SKILLS_DIR);
  }

  const userSkillsDir = path.join(projectDir, '.opencode', 'skills');
  if (fs.existsSync(userSkillsDir)) {
    paths.push(userSkillsDir);
  }

  return paths;
};

const buildSystemPrompt = () => {
  const rulesMd = readFile(RULES_MD);
  if (!rulesMd) return null;
  return `<praxis-devos>\n${rulesMd}\n</praxis-devos>`;
};

const copyFile = (src, dst) => {
  const dir = path.dirname(dst);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(src, dst);
};

const copyDirRecursive = (src, dst) => {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
};

const commandExists = (cmd) => {
  try {
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(whichCmd, [cmd], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
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

const STACK_SIGNATURES = {
  'java-spring': ['pom.xml', 'build.gradle', 'build.gradle.kts'],
};

const detectProjectStack = (projectDir) => {
  for (const [stackName, files] of Object.entries(STACK_SIGNATURES)) {
    if (files.some((f) => fs.existsSync(path.join(projectDir, f)))) {
      return stackName;
    }
  }
  return 'starter';
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

<!-- 列出常用命令，或参考 .opencode/stack.md 中的 toolchain 定义 -->

\`\`\`bash
\`\`\`

## 分支策略

<!-- 描述 Git 分支模型 -->

## 额外约定

<!-- 列出本项目特有的编码约定（通用规范见 .opencode/stack-rules.md） -->
`;

const praxisInit = async (projectDir, stackName) => {
  const logs = [];
  const log = (msg) => logs.push(msg);

  if (!stackName) {
    stackName = detectProjectStack(projectDir);
    log(`⟳ Auto-detected stack: ${stackName}`);
  }

  // ── Step 1: OpenSpec CLI ──────────────────────────────────────────────
  if (!commandExists('openspec')) {
    log('⏳ OpenSpec CLI not found, installing @fission-ai/openspec...');
    const install = run('npm install -g @fission-ai/openspec');
    if (install.ok) {
      log('✓ OpenSpec CLI installed globally');
    } else {
      log(`✗ Failed to install OpenSpec CLI: ${install.stderr}`);
      log('  You can install manually: npm install -g @fission-ai/openspec');
    }
  } else {
    log('⊘ OpenSpec CLI already installed');
  }

  if (commandExists('openspec')) {
    const initResult = runFile('openspec', ['init', projectDir, '--tools', 'opencode', '--force']);
    if (initResult.ok) {
      log('✓ openspec init completed');
    } else {
      log(`⚠ openspec init warning: ${initResult.stderr}`);
    }
  } else {
    for (const dir of ['specs', 'changes', 'archive', 'templates']) {
      fs.mkdirSync(path.join(projectDir, 'openspec', dir), { recursive: true });
    }
    log('✓ openspec/ directories created (manual fallback)');
  }

  // ── Step 2: Framework files ───────────────────────────────────────────
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

  // ── Step 2.5: AGENTS.md skeleton ──────────────────────────────────────
  const agentsMdPath = path.join(projectDir, 'AGENTS.md');
  if (!fs.existsSync(agentsMdPath)) {
    fs.writeFileSync(agentsMdPath, AGENTS_MD_TEMPLATE, 'utf8');
    log('✓ AGENTS.md skeleton created (please fill in your project context)');
  } else {
    log('⊘ AGENTS.md already exists, skipped');
  }

  // ── Step 3: User-customizable skills ──────────────────────────────────
  const userSkillsDst = path.join(projectDir, '.opencode', 'skills');
  for (const skillName of USER_SKILLS) {
    const skillSrc = path.join(SKILLS_DIR, skillName);
    const skillDst = path.join(userSkillsDst, skillName);
    if (fs.existsSync(skillSrc)) {
      if (fs.existsSync(skillDst)) {
        log(`⊘ .opencode/skills/${skillName}/ already exists, skipped`);
      } else {
        copyDirRecursive(skillSrc, skillDst);
        log(`✓ .opencode/skills/${skillName}/ copied (customizable)`);
      }
    }
  }

  // ── Step 4: Stack → .opencode/ ────────────────────────────────────────
  if (stackName) {
    const stackSrc = path.join(STACKS_DIR, stackName);
    if (!fs.existsSync(stackSrc)) {
      const available = listDirs(STACKS_DIR).join(', ');
      log(`✗ Stack "${stackName}" not found. Available: ${available}`);
    } else {
      // 4a: Copy stack skills → .opencode/skills/
      const stackSkillsSrc = path.join(stackSrc, 'skills');
      if (fs.existsSync(stackSkillsSrc)) {
        for (const entry of fs.readdirSync(stackSkillsSrc, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          const skillSrc = path.join(stackSkillsSrc, entry.name);
          const skillDst = path.join(userSkillsDst, entry.name);
          if (fs.existsSync(skillDst)) {
            log(`⊘ .opencode/skills/${entry.name}/ already exists, skipped`);
          } else {
            copyDirRecursive(skillSrc, skillDst);
            log(`✓ .opencode/skills/${entry.name}/ copied (from ${stackName})`);
          }
        }
      }

      // 4b: Copy stack.md → .opencode/stack.md (toolchain reference)
      const stackMdSrc = path.join(stackSrc, 'stack.md');
      const stackMdDst = path.join(projectDir, '.opencode', 'stack.md');
      if (fs.existsSync(stackMdSrc)) {
        copyFile(stackMdSrc, stackMdDst);
        log(`✓ .opencode/stack.md copied (toolchain reference)`);
      }

      // 4c: Copy rules.md → .opencode/stack-rules.md (coding standards)
      const rulesMdSrc = path.join(stackSrc, 'rules.md');
      const rulesMdDst = path.join(projectDir, '.opencode', 'stack-rules.md');
      if (fs.existsSync(rulesMdSrc)) {
        copyFile(rulesMdSrc, rulesMdDst);
        log(`✓ .opencode/stack-rules.md copied (coding standards from ${stackName})`);
      }

      log(`✓ Stack "${stackName}" installed to .opencode/`);
    }
  }

  // ── Step 5: SuperPowers in opencode.json ──────────────────────────────
  const spPlugin = 'superpowers@git+https://github.com/obra/superpowers.git';
  const ocConfigPath = path.join(projectDir, 'opencode.json');
  try {
    let config = {};
    if (fs.existsSync(ocConfigPath)) {
      config = JSON.parse(fs.readFileSync(ocConfigPath, 'utf8'));
    }
    config.plugin = config.plugin || [];
    if (!config.plugin.includes(spPlugin)) {
      config.plugin.push(spPlugin);
      fs.writeFileSync(ocConfigPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
      log('✓ SuperPowers added to opencode.json');
    } else {
      log('⊘ SuperPowers already in opencode.json');
    }
  } catch (err) {
    log(`⚠ Could not update opencode.json: ${err.message}`);
  }

  return logs.join('\n');
};

const PraxisDevOSPlugin = async ({ client, directory }) => {
  return {
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];

      const skillsPaths = collectSkillsPaths(directory);
      for (const p of skillsPaths) {
        if (!config.skills.paths.includes(p)) {
          config.skills.paths.push(p);
        }
      }
    },

    'experimental.chat.system.transform': async (_input, output) => {
      const prompt = buildSystemPrompt();
      if (prompt) {
        (output.system ||= []).push(prompt);
      }
    },

    tool: {
      'praxis-init': {
        description: 'Initialize the current project with praxis-devos. ' +
          'Auto-installs OpenSpec CLI, runs openspec init, copies framework templates, ' +
          'copies customizable skills (git-workflow, code-review) to .opencode/skills/, ' +
          'copies stack skills to .opencode/skills/, and configures SuperPowers in opencode.json.',
        parameters: {
          type: 'object',
          properties: {
            stack: {
              type: 'string',
              description: 'Tech stack to install (e.g., "java-spring", "starter"). ' +
                'Stack skills will be copied to .opencode/skills/. ' +
                `Available stacks: ${listDirs(STACKS_DIR).join(', ')}`,
            },
          },
        },
        execute: async (args) => {
          const result = await praxisInit(directory, args.stack || null);
          return {
            content: [{ type: 'text', text: `praxis-init completed:\n\n${result}` }],
          };
        },
      },

      'praxis-list-stacks': {
        description: 'List all available technology stacks in praxis-devos.',
        parameters: { type: 'object', properties: {} },
        execute: async () => {
          const stacks = listDirs(STACKS_DIR);
          const details = stacks.map((name) => {
            const stackMd = readFile(path.join(STACKS_DIR, name, 'stack.md'));
            const firstLine = stackMd ? stackMd.split('\n')[0].replace(/^#\s*/, '') : 'No description';
            return `  ${name} — ${firstLine}`;
          });
          return {
            content: [{
              type: 'text',
              text: `Available stacks:\n${details.join('\n')}`,
            }],
          };
        },
      },
    },
  };
};

export default PraxisDevOSPlugin;
export { PraxisDevOSPlugin };
