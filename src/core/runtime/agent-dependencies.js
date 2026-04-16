import fs from 'fs';
import path from 'path';
import { resolveUserHomeDir } from '../../support/home.js';
import {
  CLAUDE_SUPERPOWERS_PLUGIN,
  SUPERPOWERS_DOCS,
  SUPERPOWERS_GIT_URL,
  SUPERPOWERS_OPENCODE_PLUGIN,
} from '../constants/agent-dependencies.js';
import { PRAXIS_CLI_COMMAND } from '../constants/cli.js';
import {
  ensureDir,
  readFile,
  uniqueAgents,
  writeText,
} from '../project/state.js';
import {
  commandExists,
  resolveCommandForExecution,
  runFile,
} from './commands.js';

// Agent dependency management is the per-agent counterpart to OpenSpec runtime
// handling: detect/install plugins and surface repair/bootstrap guidance.

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

// OpenCode uses a JSON plugin config, so its dependency path is config-merge
// and validation rather than repo clone/link management.
const globalOpencodeConfigPath = () => path.join(resolveUserHomeDir(), '.config', 'opencode', 'config.json');

const readProjectJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
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
const isLegacyPraxisOpenCodePlugin = (entry) => typeof entry === 'string' && (
  entry.startsWith('praxis-devos@') || entry.includes('github.com/chhuax/praxis-devos')
);

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
    ...(Array.isArray(config.plugin) ? config.plugin : []).filter((entry) => !isLegacyPraxisOpenCodePlugin(entry)),
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
    const hadLegacyPraxisPlugin = Array.isArray(config.plugin)
      && config.plugin.some((entry) => isLegacyPraxisOpenCodePlugin(entry));

    if (current.raw === nextText) {
      return {
        changed: false,
        configPath,
        backupPath: null,
        removedLegacyPraxisPlugin: false,
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
      removedLegacyPraxisPlugin: hadLegacyPraxisPlugin,
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

const ensureOpenCodeSuperpowers = () => {
  const result = ensureOpenCodePluginsConfigured();
  const lines = [`Configured OpenCode plugin config in ${result.configPath}`];

  if (result.backupPath) {
    lines.push(`Backed up existing OpenCode config to ${result.backupPath}`);
  }

  if (result.removedLegacyPraxisPlugin) {
    lines.push('Removed legacy Praxis OpenCode plugin entry to avoid startup issues');
  }

  if (!result.changed) {
    lines.push('OpenCode plugin config already contained the required runtime plugins');
  }

  return lines.join('\n');
};

// Codex uses the upstream SuperPowers repo plus a linked `skills/` directory,
// so its install path is clone + filesystem validation + link repair.
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
    throw new Error(`Git is required to install Codex SuperPowers automatically. Install Git, then rerun \`${PRAXIS_CLI_COMMAND} setup --agent codex\`.`);
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

// Claude uses plugin-install commands and settings-file detection, so its
// dependency path is CLI/plugin oriented rather than config merge or clone.
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
    throw new Error(`Claude Code CLI is required to install Claude SuperPowers automatically. Install Claude Code, then rerun \`${PRAXIS_CLI_COMMAND} setup --agent claude\`.`);
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

const detectCopilotSuperpowers = () => ({
  status: 'ok',
  detail: 'GitHub Copilot uses the shared ~/.claude skills/commands discovery surface; no separate SuperPowers install is required.',
});

const ensureCopilotSuperpowers = () => '⊘ GitHub Copilot uses the shared ~/.claude skills/commands discovery surface; no separate runtime dependency to install.';

// Ensure per-agent runtime dependencies. Keep this mechanical: detect/install
// tools and plugins, but do not generate project content.
export const ensureRuntimeDependencies = ({ projectDir, agents }) => {
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

    if (agent === 'copilot') {
      logs.push(`== ${agent} ==`);
      logs.push(ensureCopilotSuperpowers());
    }
  }

  return logs.join('\n');
};

export const detectSuperpowersForAgent = (projectDir, agent) => {
  if (agent === 'opencode') {
    return detectOpenCodeSuperpowers();
  }

  if (agent === 'codex') {
    return detectCodexSuperpowers();
  }

  if (agent === 'claude') {
    return detectClaudeSuperpowers(projectDir);
  }

  if (agent === 'copilot') {
    return detectCopilotSuperpowers();
  }

  return {
    status: 'unknown',
    detail: `Unsupported agent: ${agent}`,
  };
};

export const formatStatus = (status) => {
  if (status === 'ok') return 'OK';
  if (status === 'warning') return 'WARN';
  if (status === 'missing') return 'MISSING';
  return 'UNKNOWN';
};

const renderBootstrapInstructions = ({ agent }) => {
  if (agent === 'opencode') {
    const result = ensureOpenCodePluginsConfigured();
    const lines = [
      `Updated ${result.configPath}`,
      'Ensured OpenCode runtime plugins:',
      `- ${SUPERPOWERS_OPENCODE_PLUGIN}`,
    ];

    if (result.backupPath) {
      lines.push(`Backed up existing OpenCode config to ${result.backupPath}`);
    }

    if (result.removedLegacyPraxisPlugin) {
      lines.push('Removed legacy Praxis OpenCode plugin entry.');
    }

    if (!result.changed) {
      lines.push('OpenCode plugin config already contained the required runtime plugins.');
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

  if (agent === 'copilot') {
    return [
      'No separate GitHub Copilot runtime dependency is required.',
      'Praxis projects Copilot-compatible skills and commands to the shared Claude discovery surface:',
      '- `~/.claude/skills/<name>/SKILL.md`',
      '- `~/.claude/commands/*.md`',
      '- Restart GitHub Copilot or start a new session after projection',
    ].join('\n');
  }

  throw new Error(`Unsupported agent for bootstrap: ${agent}`);
};

export const bootstrapProject = ({ projectDir, agents }) => {
  const selectedAgents = uniqueAgents(agents);
  const outputs = [];

  for (const agent of selectedAgents) {
    outputs.push(`== ${agent} ==`);
    outputs.push(renderBootstrapInstructions({ projectDir, agent }));
    outputs.push('');
  }

  return outputs.join('\n').trim();
};
