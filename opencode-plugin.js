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
  bootstrapOpenSpec,
  doctorProject,
  initProject,
  statusProject,
  syncProject,
  SUPPORTED_AGENTS,
} from './src/core/praxis-devos.js';

const PraxisDevOSPlugin = async ({ directory }) => ({
  tool: {
    'praxis-init': {
      description: 'Initialize the current project with OpenSpec layout and sync agent adapters.',
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
          const result = initProject({
            projectDir: directory,
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
      description: 'Refresh agent adapters and managed blocks.',
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

    'praxis-status': {
      description: 'Show current project initialization state, active changes, adapters, and dependency summary.',
      parameters: {
        type: 'object',
        properties: {
          agents: {
            type: 'array',
            items: { type: 'string' },
            description: `Agents to include in the dependency summary. Defaults to: ${SUPPORTED_AGENTS.join(', ')}`,
          },
        },
      },
      execute: async (args) => {
        try {
          const result = statusProject({
            projectDir: directory,
            agents: args.agents || SUPPORTED_AGENTS,
          });
          return {
            content: [{ type: 'text', text: String(result || 'praxis-status completed (no output)') }],
          };
        } catch (err) {
          return {
            content: [{ type: 'text', text: `praxis-status failed: ${err?.message || String(err)}` }],
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
          openspec: {
            type: 'boolean',
            description: 'Include OpenSpec bootstrap instructions.',
          },
        },
      },
      execute: async (args) => {
        try {
          const outputs = [];

          if (args.openspec) {
            outputs.push(bootstrapOpenSpec({
              projectDir: directory,
            }));
          }

          if (!args.openspec || args.agents) {
            outputs.push(bootstrapProject({
              projectDir: directory,
              agents: args.agents || SUPPORTED_AGENTS,
            }));
          }

          const result = outputs.join('\n\n');
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
