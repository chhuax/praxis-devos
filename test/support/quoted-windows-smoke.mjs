const escapeForSingleQuotedJs = (value) => value
  .replace(/\\/g, '\\\\')
  .replace(/'/g, "\\'");

const buildQuotedWindowsOpenSpecShim = () => `const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
if (args[0] === 'init' && args[1]) {
  const target = args[1];
  fs.mkdirSync(path.join(target, 'openspec', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(target, 'openspec', 'changes', 'archive'), { recursive: true });
  fs.writeFileSync(path.join(target, 'openspec', 'config.yaml'), '# context:\\n');
  process.exit(0);
}
process.stderr.write('unsupported openspec invocation: ' + args.join(' ') + '\\n');
process.exit(1);
`;

export const buildQuotedWindowsNodeCmdWrapper = (shimFileName) => `@echo off\r
node "%~dp0\\${shimFileName}" %*\r
`;

export const buildQuotedWindowsNpmShim = ({
  invocationLogPath,
  diagnosticLogPath = null,
  openspecCmdPath,
  openspecShimPath,
}) => {
  const diagnosticLine = diagnosticLogPath
    ? `fs.appendFileSync('${escapeForSingleQuotedJs(diagnosticLogPath)}', JSON.stringify({ command: 'npm.cmd', shimPath: __filename, cwd: process.cwd(), argv: args }) + '\\n');\n`
    : '';

  return `const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
fs.appendFileSync('${escapeForSingleQuotedJs(invocationLogPath)}', 'npm.cmd ' + args.join(' ') + '\\n');
${diagnosticLine}if (args.length === 3 && args[0] === 'install' && args[1] === '-D' && args[2] === '@fission-ai/openspec') {
  fs.mkdirSync(path.dirname('${escapeForSingleQuotedJs(openspecCmdPath)}'), { recursive: true });
  fs.writeFileSync('${escapeForSingleQuotedJs(openspecShimPath)}', ${JSON.stringify(buildQuotedWindowsOpenSpecShim())});
  fs.writeFileSync('${escapeForSingleQuotedJs(openspecCmdPath)}', ${JSON.stringify(buildQuotedWindowsNodeCmdWrapper('openspec-shim.cjs'))});
  process.exit(0);
}
process.stderr.write('unsupported npm invocation: ' + args.join(' ') + '\\n');
process.exit(1);
`;
};

export const buildQuotedWindowsClaudeShim = ({
  fakeHome,
  invocationLogPath,
  diagnosticLogPath = null,
}) => {
  const diagnosticLine = diagnosticLogPath
    ? `fs.appendFileSync('${escapeForSingleQuotedJs(diagnosticLogPath)}', JSON.stringify({ command: 'claude.cmd', shimPath: __filename, cwd: process.cwd(), argv: args }) + '\\n');\n`
    : '';

  return `const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
fs.appendFileSync('${escapeForSingleQuotedJs(invocationLogPath)}', 'claude.cmd ' + args.join(' ') + '\\n');
${diagnosticLine}if (args[0] === 'plugin' && args[1] === 'install' && args[2] === 'superpowers@claude-plugins-official' && args[3] === '--scope' && args[4] === 'user') {
  const settingsPath = path.join('${escapeForSingleQuotedJs(fakeHome)}', '.claude', 'settings.json');
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify({ enabledPlugins: ['superpowers@claude-plugins-official'] }, null, 2));
  process.stdout.write('installed\\n');
  process.exit(0);
}
process.stderr.write('unsupported claude invocation: ' + args.join(' ') + '\\n');
process.exit(1);
`;
};
