/**
 * Praxis DevOS plugin for OpenCode.ai
 *
 * Responsibilities:
 * 1. Register framework and project skill paths
 * 2. Inject framework and project rules into the system prompt
 * 3. Expose thin wrappers around the shared praxis-devos CLI core
 */

import {
  bootstrapProject,
  buildSystemPrompt,
  collectSkillsPaths,
  doctorProject,
  initProject,
  listStacksDetailed,
  migrateProject,
  syncProject,
  SUPPORTED_AGENTS,
} from '../../src/core/praxis-devos.js';

const PraxisDevOSPlugin = async ({ directory }) => ({
  config: async (config) => {
    config.skills = config.skills || {};
    config.skills.paths = config.skills.paths || [];

    const skillsPaths = collectSkillsPaths(directory);
    for (const skillsPath of skillsPaths) {
      if (!config.skills.paths.includes(skillsPath)) {
        config.skills.paths.push(skillsPath);
      }
    }
  },

  'experimental.chat.system.transform': async (_input, output) => {
    const prompt = buildSystemPrompt(directory);
    if (prompt) {
      (output.system ||= []).push(prompt);
    }
  },

  tool: {
    'praxis-init': {
      description: 'Initialize the current project with canonical .praxis assets and sync agent adapters.',
      parameters: {
        type: 'object',
        properties: {
          stack: {
            type: 'string',
            description: 'Tech stack to install (e.g., "java-spring", "starter").',
          },
          agents: {
            type: 'array',
            items: { type: 'string' },
            description: `Adapters to sync. Defaults to: ${SUPPORTED_AGENTS.join(', ')}`,
          },
        },
      },
      execute: async (args) => {
        try {
          const result = initProject({
            projectDir: directory,
            stackName: args.stack || null,
            agents: args.agents || SUPPORTED_AGENTS,
          });
          return {
            content: [{ type: 'text', text: String(result || 'praxis-init completed (no output)') }],
          };
        } catch (err) {
          return {
            content: [{ type: 'text', text: `praxis-init failed: ${err?.message || String(err)}` }],
          };
        }
      },
    },

    'praxis-sync': {
      description: 'Refresh agent adapters from canonical .praxis assets.',
      parameters: {
        type: 'object',
        properties: {
          agents: {
            type: 'array',
            items: { type: 'string' },
            description: `Adapters to sync. Defaults to: ${SUPPORTED_AGENTS.join(', ')}`,
          },
        },
      },
      execute: async (args) => {
        try {
          const result = syncProject({
            projectDir: directory,
            agents: args.agents || SUPPORTED_AGENTS,
          });
          return {
            content: [{ type: 'text', text: String(result || 'praxis-sync completed (no output)') }],
          };
        } catch (err) {
          return {
            content: [{ type: 'text', text: `praxis-sync failed: ${err?.message || String(err)}` }],
          };
        }
      },
    },

    'praxis-migrate': {
      description: 'Migrate legacy .opencode project assets into canonical .praxis assets, then sync adapters.',
      parameters: {
        type: 'object',
        properties: {
          agents: {
            type: 'array',
            items: { type: 'string' },
            description: `Adapters to sync after migration. Defaults to: ${SUPPORTED_AGENTS.join(', ')}`,
          },
        },
      },
      execute: async (args) => {
        try {
          const result = migrateProject({
            projectDir: directory,
            agents: args.agents || SUPPORTED_AGENTS,
          });
          return {
            content: [{ type: 'text', text: String(result || 'praxis-migrate completed (no output)') }],
          };
        } catch (err) {
          return {
            content: [{ type: 'text', text: `praxis-migrate failed: ${err?.message || String(err)}` }],
          };
        }
      },
    },

    'praxis-list-stacks': {
      description: 'List all available technology stacks in praxis-devos.',
      parameters: { type: 'object', properties: {} },
      execute: async () => {
        try {
          const stacks = listStacksDetailed();
          return {
            content: [{
              type: 'text',
              text: `Available stacks:\n${stacks.map((stack) => `  ${stack.name} — ${stack.description}`).join('\n')}`,
            }],
          };
        } catch (err) {
          return {
            content: [{
              type: 'text',
              text: `Failed to list stacks: ${err?.message || String(err)}`,
            }],
          };
        }
      },
    },

    'praxis-doctor': {
      description: 'Check required openspec and superpowers dependencies for the current project and agents.',
      parameters: {
        type: 'object',
        properties: {
          agents: {
            type: 'array',
            items: { type: 'string' },
            description: `Agents to check. Defaults to: ${SUPPORTED_AGENTS.join(', ')}`,
          },
          strict: {
            type: 'boolean',
            description: 'Fail if required dependencies are missing. Unknown Claude marketplace installs also fail in strict mode.',
          },
        },
      },
      execute: async (args) => {
        try {
          const result = doctorProject({
            projectDir: directory,
            agents: args.agents || SUPPORTED_AGENTS,
            strict: Boolean(args.strict),
          });
          return {
            content: [{ type: 'text', text: String(result || 'praxis-doctor completed (no output)') }],
          };
        } catch (err) {
          return {
            content: [{ type: 'text', text: `praxis-doctor failed: ${err?.message || String(err)}` }],
          };
        }
      },
    },

    'praxis-bootstrap': {
      description: 'Print or apply superpowers bootstrap steps for the selected agents.',
      parameters: {
        type: 'object',
        properties: {
          agents: {
            type: 'array',
            items: { type: 'string' },
            description: `Agents to bootstrap. Defaults to: ${SUPPORTED_AGENTS.join(', ')}`,
          },
        },
      },
      execute: async (args) => {
        try {
          const result = bootstrapProject({
            projectDir: directory,
            agents: args.agents || SUPPORTED_AGENTS,
          });
          return {
            content: [{ type: 'text', text: String(result || 'praxis-bootstrap completed (no output)') }],
          };
        } catch (err) {
          return {
            content: [{ type: 'text', text: `praxis-bootstrap failed: ${err?.message || String(err)}` }],
          };
        }
      },
    },
  },
});

export default PraxisDevOSPlugin;
export { PraxisDevOSPlugin };
