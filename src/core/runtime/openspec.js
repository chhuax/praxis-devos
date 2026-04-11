import { commandExists, isGlobalOpenSpecRuntime, resolveCommandForExecution, resolveOpenSpecRuntime, runFile } from './commands.js';

// OpenSpec has distinct lifecycle rules from agent-specific dependencies, so
// keep its detection/bootstrap/install logic isolated here.
export const OPENSPEC_PACKAGE = '@fission-ai/openspec';

const OPENSPEC_INSTALL_DOC = 'https://github.com/Fission-AI/OpenSpec';

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
