import * as claude from './claude.js';
import * as copilot from './copilot.js';
import * as codex from './codex.js';
import * as opencode from './opencode.js';

const adapters = { claude, copilot, codex, opencode };

export const resolveProjectionAdapter = (agent) => adapters[agent] || null;
