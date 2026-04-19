import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowSourceRoot = () => path.resolve(__dirname, '../../assets/openspec/workflows');

const generatedWorkflowDefinitions = [
  {
    name: 'openspec-explore',
    sourceSkillDirName: 'openspec-explore',
    commandTitle: '/opsx:explore',
    claudeCommandRelativePath: path.join('opsx', 'explore.md'),
    opencodeCommandFileName: 'opsx-explore.md',
    githubPromptFileName: 'opsx-explore.prompt.md',
  },
  {
    name: 'openspec-propose',
    sourceSkillDirName: 'openspec-propose',
    commandTitle: '/opsx:propose',
    claudeCommandRelativePath: path.join('opsx', 'propose.md'),
    opencodeCommandFileName: 'opsx-propose.md',
    githubPromptFileName: 'opsx-propose.prompt.md',
  },
  {
    name: 'openspec-apply-change',
    sourceSkillDirName: 'openspec-apply-change',
    commandTitle: '/opsx:apply',
    claudeCommandRelativePath: path.join('opsx', 'apply.md'),
    opencodeCommandFileName: 'opsx-apply.md',
    githubPromptFileName: 'opsx-apply.prompt.md',
  },
  {
    name: 'openspec-archive-change',
    sourceSkillDirName: 'openspec-archive-change',
    commandTitle: '/opsx:archive',
    claudeCommandRelativePath: path.join('opsx', 'archive.md'),
    opencodeCommandFileName: 'opsx-archive.md',
    githubPromptFileName: 'opsx-archive.prompt.md',
  },
  {
    name: 'openspec-new-change',
    sourceSkillDirName: 'openspec-new-change',
    commandTitle: '/opsx:new',
    claudeCommandRelativePath: path.join('opsx', 'new.md'),
    opencodeCommandFileName: 'opsx-new.md',
    githubPromptFileName: 'opsx-new.prompt.md',
  },
  {
    name: 'openspec-continue-change',
    sourceSkillDirName: 'openspec-continue-change',
    commandTitle: '/opsx:continue',
    claudeCommandRelativePath: path.join('opsx', 'continue.md'),
    opencodeCommandFileName: 'opsx-continue.md',
    githubPromptFileName: 'opsx-continue.prompt.md',
  },
  {
    name: 'openspec-ff-change',
    sourceSkillDirName: 'openspec-ff-change',
    commandTitle: '/opsx:ff',
    claudeCommandRelativePath: path.join('opsx', 'ff.md'),
    opencodeCommandFileName: 'opsx-ff.md',
    githubPromptFileName: 'opsx-ff.prompt.md',
  },
];

const supportedAgents = new Set(['codex', 'claude', 'opencode', 'copilot']);

const projectSurfaceByAgent = (agent) => {
  if (agent === 'claude') {
    return {
      targetRelativePath: (workflow) => workflow.claudeCommandRelativePath,
    };
  }

  if (agent === 'opencode') {
    return {
      targetRelativePath: (workflow) => workflow.opencodeCommandFileName,
    };
  }

  if (agent === 'copilot') {
    return null;
  }

  return null;
};

const buildThinCommandBody = ({ skillName, commandTitle }) => [
  `# ${commandTitle}`,
  '',
  `Use the \`${skillName}\` skill as the entrypoint for this workflow command.`,
  '',
  'Pass the user request through to that skill and follow it exactly.',
  'Keep all workflow logic inside the skill itself instead of duplicating it here.',
  '',
].join('\n');

export const collectGeneratedWorkflowSkillSources = ({ agent }) => {
  if (!supportedAgents.has(agent)) {
    return [];
  }

  return generatedWorkflowDefinitions
    .map((workflow) => {
      const sourceDir = path.join(workflowSourceRoot(), workflow.sourceSkillDirName);
      const sourceSkillPath = path.join(sourceDir, 'SKILL.md');
      if (!fs.existsSync(sourceSkillPath)) {
        return null;
      }

      return {
        name: workflow.name,
        sourceDir,
        sourceType: 'openspec-workflow',
      };
    })
    .filter(Boolean);
};

export const collectGeneratedWorkflowCommandSources = ({ agent }) => {
  const surface = projectSurfaceByAgent(agent);
  if (!surface) {
    return [];
  }

  return generatedWorkflowDefinitions.map((workflow) => ({
    name: workflow.name,
    sourceType: 'openspec-workflow',
    targetRelativePath: surface.targetRelativePath(workflow),
    content: buildThinCommandBody({
      skillName: workflow.name,
      commandTitle: workflow.commandTitle,
    }),
  }));
};
