import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowSourceRoot = () => path.resolve(__dirname, '../../assets/openspec/workflows');
const overlayOpenSpecSkillsRoot = () => path.resolve(__dirname, '../../assets/overlays/openspec/skills');

const generatedWorkflowDefinitions = [
  {
    name: 'openspec-explore',
    sourceSkillDirName: 'openspec-explore',
    commandTitle: '/opsx:explore',
    claudeCommandRelativePath: path.join('opsx', 'explore.md'),
    opencodeCommandFileName: 'opsx-explore.md',
    githubPromptFileName: 'opsx-explore.prompt.md',
    overlayFileName: 'opsx-explore.overlay.md',
  },
  {
    name: 'openspec-propose',
    sourceSkillDirName: 'openspec-propose',
    commandTitle: '/opsx:propose',
    claudeCommandRelativePath: path.join('opsx', 'propose.md'),
    opencodeCommandFileName: 'opsx-propose.md',
    githubPromptFileName: 'opsx-propose.prompt.md',
    overlayFileName: 'opsx-propose.overlay.md',
  },
  {
    name: 'openspec-apply-change',
    sourceSkillDirName: 'openspec-apply-change',
    commandTitle: '/opsx:apply',
    claudeCommandRelativePath: path.join('opsx', 'apply.md'),
    opencodeCommandFileName: 'opsx-apply.md',
    githubPromptFileName: 'opsx-apply.prompt.md',
    overlayFileName: 'opsx-apply.overlay.md',
  },
  {
    name: 'openspec-archive-change',
    sourceSkillDirName: 'openspec-archive-change',
    commandTitle: '/opsx:archive',
    claudeCommandRelativePath: path.join('opsx', 'archive.md'),
    opencodeCommandFileName: 'opsx-archive.md',
    githubPromptFileName: 'opsx-archive.prompt.md',
    overlayFileName: 'opsx-archive.overlay.md',
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

export const generatedWorkflowSkillNames = generatedWorkflowDefinitions.map((workflow) => workflow.name);

const projectSurfaceByAgent = (agent) => {
  if (agent === 'codex') {
    return {
      commandRelativeKey: null,
    };
  }

  if (agent === 'claude') {
    return {
      commandRelativeKey: 'claudeCommandRelativePath',
      targetRelativePath: (workflow) => workflow.claudeCommandRelativePath,
    };
  }

  if (agent === 'opencode') {
    return {
      commandRelativeKey: 'opencodeCommandFileName',
      targetRelativePath: (workflow) => workflow.opencodeCommandFileName,
    };
  }

  if (agent === 'copilot') {
    return {
      commandRelativeKey: 'githubPromptFileName',
      targetRelativePath: (workflow) => workflow.githubPromptFileName.replace(/\.prompt\.md$/, '.md'),
    };
  }

  return null;
};

const resolveWorkflowCommandSourcePath = ({ workflow, agent }) => {
  const workflowDir = path.join(workflowSourceRoot(), workflow.sourceSkillDirName);
  const agentSpecificPath = path.join(workflowDir, `COMMAND.${agent}.md`);
  if (fs.existsSync(agentSpecificPath)) {
    return agentSpecificPath;
  }

  const sharedPath = path.join(workflowDir, 'COMMAND.shared.md');
  if (fs.existsSync(sharedPath)) {
    return sharedPath;
  }

  return null;
};

export const collectGeneratedWorkflowSkillSources = ({ agent }) => {
  const surface = projectSurfaceByAgent(agent);
  if (!surface) {
    return [];
  }

  return generatedWorkflowDefinitions
    .map((workflow) => {
      const sourceDir = path.join(workflowSourceRoot(), workflow.sourceSkillDirName);
      const sourceSkillPath = path.join(sourceDir, 'SKILL.md');
      if (!fs.existsSync(sourceSkillPath)) {
        return null;
      }

      const overlayPath = workflow.overlayFileName
        ? path.join(overlayOpenSpecSkillsRoot(), workflow.overlayFileName)
        : null;

      return {
        name: workflow.name,
        sourceDir,
        sourceType: 'openspec-workflow',
        overlayPath: overlayPath && fs.existsSync(overlayPath) ? overlayPath : null,
        overlayAssetsDir: null,
      };
    })
    .filter(Boolean);
};

export const collectGeneratedWorkflowCommandSources = ({ agent }) => {
  const surface = projectSurfaceByAgent(agent);
  if (!surface?.commandRelativeKey) {
    return [];
  }

  return generatedWorkflowDefinitions
    .map((workflow) => {
      const sourcePath = resolveWorkflowCommandSourcePath({ workflow, agent });
      if (!sourcePath) {
        return null;
      }

      const overlayPath = workflow.overlayFileName
        ? path.join(overlayOpenSpecSkillsRoot(), workflow.overlayFileName)
        : null;

      return {
        name: workflow.name,
        sourcePath,
        sourceType: 'openspec-workflow',
        targetRelativePath: surface.targetRelativePath(workflow),
        commandTitle: workflow.commandTitle,
        overlayPath: overlayPath && fs.existsSync(overlayPath) ? overlayPath : null,
        overlayAssetsDir: null,
      };
    })
    .filter(Boolean);
};

export const cleanupAdoptedGeneratedAssets = () => {};
