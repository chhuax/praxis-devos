#!/usr/bin/env node

import { renderHelp, runCli } from '../src/core/praxis-devos.js';

try {
  const output = runCli(process.argv.slice(2));
  if (output) {
    process.stdout.write(`${output}\n`);
  }
} catch (err) {
  process.stderr.write(`${err?.message || String(err)}\n\n`);
  process.stderr.write(`${renderHelp()}\n`);
  process.exitCode = 1;
}
