import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowSourceRoot = () => path.resolve(__dirname, '../../assets/openspec/workflows');

const generatedWorkflowDefinitions = [
  {
    name: 'openspec-explore',
    sourceSkillDirName: 'openspec-explore',
  },
  {
    name: 'openspec-propose',
    sourceSkillDirName: 'openspec-propose',
  },
  {
    name: 'openspec-apply-change',
    sourceSkillDirName: 'openspec-apply-change',
  },
  {
    name: 'openspec-archive-change',
    sourceSkillDirName: 'openspec-archive-change',
  },
  {
    name: 'openspec-new-change',
    sourceSkillDirName: 'openspec-new-change',
  },
  {
    name: 'openspec-continue-change',
    sourceSkillDirName: 'openspec-continue-change',
  },
  {
    name: 'openspec-ff-change',
    sourceSkillDirName: 'openspec-ff-change',
  },
];

const supportedAgents = new Set(['codex', 'claude', 'opencode', 'copilot']);

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
