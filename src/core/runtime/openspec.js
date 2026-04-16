import fs from 'fs';
import path from 'path';
import { resolveUserHomeDir } from '../../support/home.js';
import { PRAXIS_CLI_COMMAND } from '../constants/cli.js';
import {
  bundledOpenSpecSchemaManifestPath,
  bundledOpenSpecSchemaRoot,
  ensureDir,
  readFile,
  readJson,
  writeText,
} from '../project/state.js';
import { commandExists, isGlobalOpenSpecRuntime, resolveCommandForExecution, resolveOpenSpecRuntime, runFile } from './commands.js';

// OpenSpec has distinct lifecycle rules from agent-specific dependencies, so
// keep its detection/bootstrap/install logic isolated here.
export const OPENSPEC_PACKAGE = '@fission-ai/openspec';
const OPEN_SPEC_SCHEMA_NAME = 'spec-super';
const OPEN_SPEC_REQUIRED_WORKFLOWS = ['propose', 'explore', 'new', 'continue', 'apply', 'ff', 'archive'];
const OPEN_SPEC_REQUIRED_DELIVERY = 'both';

const OPENSPEC_INSTALL_DOC = 'https://github.com/Fission-AI/OpenSpec';

const resolveOpenSpecDataHome = () => {
  if (process.platform === 'win32') {
    return process.env.LOCALAPPDATA || path.join(resolveUserHomeDir(), 'AppData', 'Local');
  }

  return process.env.XDG_DATA_HOME || path.join(resolveUserHomeDir(), '.local', 'share');
};

const openSpecUserSchemaDir = (schemaName = OPEN_SPEC_SCHEMA_NAME) =>
  path.join(resolveOpenSpecDataHome(), 'openspec', 'schemas', schemaName);

const openSpecUserConfigPath = () =>
  path.join(resolveUserHomeDir(), '.config', 'openspec', 'config.json');

const backupFile = (filePath) => {
  const backupPath = `${filePath}.bak-${Date.now()}`;
  ensureDir(path.dirname(backupPath));
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
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

const isPlainObject = (value) => value != null && typeof value === 'object' && !Array.isArray(value);

const validateOpenSpecUserConfigShape = (configPath, config) => {
  if (!isPlainObject(config)) {
    throw new Error(`Cannot safely merge OpenSpec config at ${configPath}: expected a JSON object at the top level.`);
  }
};

const mergeOpenSpecUserConfig = (config) => ({
  ...config,
  profile: 'custom',
  delivery: OPEN_SPEC_REQUIRED_DELIVERY,
  workflows: [...OPEN_SPEC_REQUIRED_WORKFLOWS],
});

export const detectBundledOpenSpecSchemaInstallation = (schemaName = OPEN_SPEC_SCHEMA_NAME) => {
  const manifest = readJson(bundledOpenSpecSchemaManifestPath(schemaName));
  const targetDir = openSpecUserSchemaDir(schemaName);
  const installedManifestPath = path.join(targetDir, 'manifest.json');
  const installedSchemaPath = path.join(targetDir, 'schema.yaml');

  if (!fs.existsSync(installedSchemaPath) || !fs.existsSync(installedManifestPath)) {
    return {
      status: 'missing',
      detail: `Missing installed ${schemaName} schema at ${targetDir}`,
    };
  }

  const installedManifest = readJson(installedManifestPath);
  const bundledVersion = manifest?.version || 'unknown';
  const installedVersion = installedManifest?.version || 'unknown';

  if (bundledVersion !== installedVersion) {
    return {
      status: 'warning',
      detail: `Installed ${schemaName} schema version ${installedVersion} differs from bundled version ${bundledVersion}`,
    };
  }

  return {
    status: 'ok',
    detail: `Installed ${schemaName} schema version ${installedVersion} at ${targetDir}`,
  };
};

export const detectOpenSpecUserConfig = () => {
  const configPath = openSpecUserConfigPath();
  const config = readJson(configPath);

  if (!config) {
    return {
      status: 'missing',
      detail: `Missing OpenSpec user config at ${configPath}`,
    };
  }

  const workflows = Array.isArray(config.workflows) ? config.workflows : [];
  const delivery = typeof config.delivery === 'string' ? config.delivery : null;
  const matchesProfile = config.profile === 'custom';
  const matchesDelivery = delivery === OPEN_SPEC_REQUIRED_DELIVERY;
  const matchesWorkflows = JSON.stringify(workflows) === JSON.stringify(OPEN_SPEC_REQUIRED_WORKFLOWS);

  if (!matchesProfile || !matchesDelivery || !matchesWorkflows) {
    return {
      status: 'warning',
      detail: `OpenSpec user config drift detected at ${configPath}; expected profile custom, delivery ${OPEN_SPEC_REQUIRED_DELIVERY}, and workflows ${OPEN_SPEC_REQUIRED_WORKFLOWS.join(', ')}`,
    };
  }

  return {
    status: 'ok',
    detail: `OpenSpec user config matches profile custom, delivery ${OPEN_SPEC_REQUIRED_DELIVERY}, and workflows ${OPEN_SPEC_REQUIRED_WORKFLOWS.join(', ')}`,
  };
};

export const detectProjectSchemaBinding = (projectDir, schemaName = OPEN_SPEC_SCHEMA_NAME) => {
  const configPath = path.join(projectDir, 'openspec', 'config.yaml');
  const content = readFile(configPath);

  if (!content) {
    return {
      status: 'missing',
      detail: `Missing project OpenSpec config at ${configPath}`,
    };
  }

  const match = content.match(/^schema:\s*(\S+)\s*$/m);
  if (!match) {
    return {
      status: 'warning',
      detail: `Project OpenSpec config at ${configPath} does not declare a default schema`,
    };
  }

  if (match[1] !== schemaName) {
    return {
      status: 'warning',
      detail: `Project binds schema ${match[1]} instead of ${schemaName} at ${configPath}`,
    };
  }

  return {
    status: 'ok',
    detail: `Project binds schema ${schemaName} at ${configPath}`,
  };
};

const detectSchemaOverrideFile = (filePath, schemaName) => {
  const content = readFile(filePath);
  if (!content) {
    return null;
  }

  const match = content.match(/^schema:\s*(\S+)\s*$/m);
  if (!match) {
    return null;
  }

  return {
    path: filePath,
    schema: match[1],
    conflicts: match[1] !== schemaName,
  };
};

export const detectOpenSpecSchemaPrecedence = (projectDir, schemaName = OPEN_SPEC_SCHEMA_NAME) => {
  const projectConfigPath = path.join(projectDir, 'openspec', 'config.yaml');
  const rootOverride = detectSchemaOverrideFile(path.join(projectDir, '.openspec.yaml'), schemaName);
  const activeChangesDir = path.join(projectDir, 'openspec', 'changes');
  const changeOverrides = fs.existsSync(activeChangesDir)
    ? fs.readdirSync(activeChangesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== 'archive' && !entry.name.startsWith('.'))
      .map((entry) => detectSchemaOverrideFile(
        path.join(activeChangesDir, entry.name, '.openspec.yaml'),
        schemaName,
      ))
      .filter(Boolean)
    : [];

  const overrides = [rootOverride, ...changeOverrides].filter(Boolean);
  const conflicting = overrides.filter((entry) => entry.conflicts);
  const relativePath = (filePath) => path.relative(projectDir, filePath) || path.basename(filePath);

  if (!fs.existsSync(projectConfigPath)) {
    return {
      status: 'warning',
      detail: `Project default schema file is missing at ${projectConfigPath}; higher-precedence .openspec.yaml files and CLI --schema can still override schema selection`,
    };
  }

  if (conflicting.length > 0) {
    const details = conflicting
      .map((entry) => `${entry.schema} via ${relativePath(entry.path)}`)
      .join(', ');
    return {
      status: 'warning',
      detail: `Project default schema is ${schemaName}, but higher-precedence overrides are active (${details}). CLI --schema would override these as well`,
    };
  }

  if (overrides.length > 0) {
    const details = overrides
      .map((entry) => relativePath(entry.path))
      .join(', ');
    return {
      status: 'ok',
      detail: `Project default schema is ${schemaName}; detected .openspec.yaml overrides align with it (${details}). CLI --schema can still override at runtime`,
    };
  }

  return {
    status: 'ok',
    detail: `Project default schema is ${schemaName}; no conflicting .openspec.yaml overrides detected. CLI --schema can still override at runtime`,
  };
};

// OpenSpec is a hard dependency for the scaffold. This function is the only
// place that may install it automatically.
export const ensureOpenSpecRuntime = (projectDir) => {
  const logs = [];
  const current = resolveOpenSpecRuntime(projectDir);

  if (current.status === 'ok' || current.status === 'warning') {
    logs.push('== openspec ==');
    logs.push(`⊘ OpenSpec already available (${current.source})`);
    logs.push(`- ${current.detail}`);
    if (current.status === 'warning') {
      logs.push('- Note: project-local install detected; a global install is recommended for consistent CLI access.');
    }
    return logs.join('\n');
  }

  if (!commandExists('npm')) {
    throw new Error(`npm is required to install OpenSpec automatically. Install npm, then rerun \`${PRAXIS_CLI_COMMAND} setup --agent <name>\`.`);
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

export const ensureBundledOpenSpecSchemaInstalled = (schemaName = OPEN_SPEC_SCHEMA_NAME) => {
  const sourceDir = bundledOpenSpecSchemaRoot(schemaName);
  const manifestPath = bundledOpenSpecSchemaManifestPath(schemaName);

  if (!fs.existsSync(sourceDir) || !fs.existsSync(manifestPath)) {
    throw new Error(`Bundled OpenSpec schema asset is missing: ${sourceDir}`);
  }

  const manifest = readJson(manifestPath);
  const targetDir = openSpecUserSchemaDir(schemaName);
  const currentManifest = readJson(path.join(targetDir, 'manifest.json'));
  const previousVersion = currentManifest?.version || null;
  const nextVersion = manifest?.version || 'unknown';

  ensureDir(path.dirname(targetDir));
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true });

  if (previousVersion === nextVersion) {
    return `Refreshed bundled OpenSpec schema ${schemaName} at ${targetDir}`;
  }

  return `Installed bundled OpenSpec schema ${schemaName} at ${targetDir} (version ${nextVersion})`;
};

export const ensureOpenSpecUserConfig = () => {
  const configPath = openSpecUserConfigPath();
  ensureDir(path.dirname(configPath));

  const current = readJsonFileWithRaw(configPath);
  if (!current.ok) {
    let backupPath = null;
    try {
      backupPath = backupFile(configPath);
    } catch (backupError) {
      throw new Error(`Cannot safely merge OpenSpec config at ${configPath}. Failed to back up the original file: ${backupError.message}. Left the config unchanged.`);
    }
    throw new Error(`Cannot safely merge OpenSpec config at ${configPath}. Backed up the original file to ${backupPath} and left the config unchanged.`);
  }

  const config = current.value ?? {};
  validateOpenSpecUserConfigShape(configPath, config);
  const next = mergeOpenSpecUserConfig(config);
  const nextText = `${JSON.stringify(next, null, 2)}\n`;

  if (current.raw === nextText) {
    return `OpenSpec user profile already configured in ${configPath}`;
  }

  const backupPath = current.exists ? backupFile(configPath) : null;
  const tempPath = `${configPath}.tmp-${process.pid}-${Date.now()}`;

  try {
    writeText(tempPath, nextText);
    fs.renameSync(tempPath, configPath);
  } catch (error) {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    const backupNote = backupPath ? ` Backed up the original file to ${backupPath}.` : '';
    throw new Error(`Cannot safely merge OpenSpec config at ${configPath}: ${error.message}.${backupNote} Left the config unchanged.`);
  }

  const backupNote = backupPath ? ` (backup: ${backupPath})` : '';
  return `Configured OpenSpec user profile in ${configPath}${backupNote}`;
};

export const bootstrapOpenSpec = ({ projectDir }) => {
  const runtime = resolveOpenSpecRuntime(projectDir);
  if (runtime.status === 'ok' || runtime.status === 'warning') {
    return [
      '== openspec ==',
      `OpenSpec already available (${runtime.source})`,
      `- ${runtime.detail}`,
      `- ${ensureBundledOpenSpecSchemaInstalled()}`,
      `- ${ensureOpenSpecUserConfig()}`,
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
