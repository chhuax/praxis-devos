import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Shared repo/project state for the scaffold layer. Keep this file mechanical:
// paths, small filesystem helpers, and agent normalization.
export const PRAXIS_ROOT = path.resolve(__dirname, '../..', '..');
export const PACKAGE_JSON = path.join(PRAXIS_ROOT, 'package.json');
export const MANAGED_ENTRY_TEMPLATE = path.join(PRAXIS_ROOT, 'src', 'templates', 'managed-entry.md');
export const SUPPORTED_AGENTS = ['opencode', 'codex', 'claude', 'copilot'];

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

export const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

export const writeText = (filePath, content) => {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
};

export const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
};

export const getPackageVersion = () => readJson(PACKAGE_JSON)?.version || '0.0.0';

// Centralize scaffold-owned project paths so the rest of the core uses one
// shared view of the workspace layout.
export const projectPaths = (projectDir) => ({
  projectDir,
  opencodeConfigPath: path.join(projectDir, 'opencode.json'),
  rootAgentsMd: path.join(projectDir, 'AGENTS.md'),
  rootClaudeMd: path.join(projectDir, 'CLAUDE.md'),
  openspecDir: path.join(projectDir, 'openspec'),
  legacyOpenCodeDir: path.join(projectDir, '.opencode'),
  legacyOpenCodeSkillsDir: path.join(projectDir, '.opencode', 'skills'),
});

export const uniqueAgents = (agents = []) => {
  const normalized = agents
    .flatMap((agent) => String(agent || '').split(','))
    .map((agent) => agent.trim().toLowerCase())
    .filter(Boolean);

  const values = normalized.length > 0 ? normalized : [...SUPPORTED_AGENTS];
  const deduped = [...new Set(values)];
  const supported = deduped.filter((agent) => SUPPORTED_AGENTS.includes(agent));

  if (normalized.length > 0 && supported.length === 0) {
    const invalid = deduped.filter((agent) => !SUPPORTED_AGENTS.includes(agent));
    throw new Error(
      `Unknown agent(s): ${invalid.join(', ')}. Supported agents: ${SUPPORTED_AGENTS.join(', ')}.`,
    );
  }

  return supported;
};

export const isProjectInitialized = (projectDir) => {
  const paths = projectPaths(projectDir);
  return fs.existsSync(paths.openspecDir);
};
