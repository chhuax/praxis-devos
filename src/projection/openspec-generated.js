import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const overlayOpenSpecSkillsRoot = () => path.resolve(__dirname, '../../assets/overlays/openspec/skills');

const generatedWorkflowDefinitions = [
  {
    name: 'openspec-explore',
    sourceSkillDirName: 'openspec-explore',
    claudeCommandRelativePath: path.join('opsx', 'explore.md'),
    opencodeCommandFileName: 'opsx-explore.md',
    githubPromptFileName: 'opsx-explore.prompt.md',
    overlayFileName: 'opsx-explore.overlay.md',
  },
  {
    name: 'openspec-propose',
    sourceSkillDirName: 'openspec-propose',
    claudeCommandRelativePath: path.join('opsx', 'propose.md'),
    opencodeCommandFileName: 'opsx-propose.md',
    githubPromptFileName: 'opsx-propose.prompt.md',
    overlayFileName: 'opsx-propose.overlay.md',
  },
  {
    name: 'openspec-apply-change',
    sourceSkillDirName: 'openspec-apply-change',
    claudeCommandRelativePath: path.join('opsx', 'apply.md'),
    opencodeCommandFileName: 'opsx-apply.md',
    githubPromptFileName: 'opsx-apply.prompt.md',
    overlayFileName: 'opsx-apply.overlay.md',
    overlayAssetsDirName: 'opsx-apply',
  },
  {
    name: 'openspec-archive-change',
    sourceSkillDirName: 'openspec-archive-change',
    claudeCommandRelativePath: path.join('opsx', 'archive.md'),
    opencodeCommandFileName: 'opsx-archive.md',
    githubPromptFileName: 'opsx-archive.prompt.md',
    overlayFileName: 'opsx-archive.overlay.md',
  },
  {
    name: 'openspec-new-change',
    sourceSkillDirName: 'openspec-new-change',
    claudeCommandRelativePath: path.join('opsx', 'new.md'),
    opencodeCommandFileName: 'opsx-new.md',
    githubPromptFileName: 'opsx-new.prompt.md',
  },
  {
    name: 'openspec-continue-change',
    sourceSkillDirName: 'openspec-continue-change',
    claudeCommandRelativePath: path.join('opsx', 'continue.md'),
    opencodeCommandFileName: 'opsx-continue.md',
    githubPromptFileName: 'opsx-continue.prompt.md',
  },
  {
    name: 'openspec-ff-change',
    sourceSkillDirName: 'openspec-ff-change',
    claudeCommandRelativePath: path.join('opsx', 'ff.md'),
    opencodeCommandFileName: 'opsx-ff.md',
    githubPromptFileName: 'opsx-ff.prompt.md',
  },
];

const projectSurfaceByAgent = (projectDir, agent) => {
  if (agent === 'codex') {
    return {
      skillsRoot: path.join(projectDir, '.codex', 'skills'),
    };
  }

  if (agent === 'claude') {
    return {
      skillsRoot: path.join(projectDir, '.claude', 'skills'),
      commandsRoot: path.join(projectDir, '.claude', 'commands'),
      commandRelativeKey: 'claudeCommandRelativePath',
      targetRelativePath: (workflow) => workflow.claudeCommandRelativePath,
    };
  }

  if (agent === 'opencode') {
    return {
      skillsRoot: path.join(projectDir, '.opencode', 'skills'),
      commandsRoot: path.join(projectDir, '.opencode', 'commands'),
      commandRelativeKey: 'opencodeCommandFileName',
      targetRelativePath: (workflow) => workflow.opencodeCommandFileName,
    };
  }

  if (agent === 'copilot') {
    return {
      skillsRoot: path.join(projectDir, '.github', 'skills'),
      commandsRoot: path.join(projectDir, '.github', 'prompts'),
      commandRelativeKey: 'githubPromptFileName',
      targetRelativePath: (workflow) => workflow.githubPromptFileName.replace(/\.prompt\.md$/, '.md'),
    };
  }

  return null;
};

const pruneEmptyAncestors = (startPath, stopPath) => {
  let current = path.resolve(startPath);
  const normalizedStop = path.resolve(stopPath);

  while (current.startsWith(normalizedStop) && current !== normalizedStop) {
    if (!fs.existsSync(current)) {
      current = path.dirname(current);
      continue;
    }

    const stat = fs.statSync(current);
    if (!stat.isDirectory() || fs.readdirSync(current).length > 0) {
      return;
    }

    fs.rmSync(current, { recursive: true, force: true });
    current = path.dirname(current);
  }
};

export const collectGeneratedWorkflowSkillSources = ({ projectDir, agent }) => {
  const surface = projectSurfaceByAgent(projectDir, agent);
  if (!surface) {
    return [];
  }

  return generatedWorkflowDefinitions
    .map((workflow) => {
      const sourceDir = path.join(surface.skillsRoot, workflow.sourceSkillDirName);
      const sourceSkillPath = path.join(sourceDir, 'SKILL.md');
      if (!fs.existsSync(sourceSkillPath)) {
        return null;
      }

      const overlayPath = workflow.overlayFileName
        ? path.join(overlayOpenSpecSkillsRoot(), workflow.overlayFileName)
        : null;
      const overlayAssetsDir = workflow.overlayAssetsDirName
        ? path.join(overlayOpenSpecSkillsRoot(), workflow.overlayAssetsDirName)
        : null;

      return {
        name: workflow.name,
        sourceDir,
        sourceType: 'openspec-generated',
        overlayPath: overlayPath && fs.existsSync(overlayPath) ? overlayPath : null,
        overlayAssetsDir: overlayAssetsDir && fs.existsSync(overlayAssetsDir) ? overlayAssetsDir : null,
      };
    })
    .filter(Boolean);
};

export const collectGeneratedWorkflowCommandSources = ({ projectDir, agent }) => {
  const surface = projectSurfaceByAgent(projectDir, agent);
  if (!surface?.commandsRoot) {
    return [];
  }

  return generatedWorkflowDefinitions
    .map((workflow) => {
      const sourceRelativePath = workflow[surface.commandRelativeKey];
      if (!sourceRelativePath) {
        return null;
      }

      const sourcePath = path.join(surface.commandsRoot, sourceRelativePath);
      if (!fs.existsSync(sourcePath)) {
        return null;
      }

      return {
        name: workflow.name,
        sourcePath,
        sourceType: 'openspec-generated',
        targetRelativePath: surface.targetRelativePath(workflow),
        overlayPath: workflow.overlayFileName
          ? path.join(overlayOpenSpecSkillsRoot(), workflow.overlayFileName)
          : null,
        overlayAssetsDir: workflow.overlayAssetsDirName
          ? path.join(overlayOpenSpecSkillsRoot(), workflow.overlayAssetsDirName)
          : null,
      };
    })
    .map((entry) => {
      if (!entry) {
        return entry;
      }

      return {
        ...entry,
        overlayPath: entry.overlayPath && fs.existsSync(entry.overlayPath) ? entry.overlayPath : null,
        overlayAssetsDir: entry.overlayAssetsDir && fs.existsSync(entry.overlayAssetsDir) ? entry.overlayAssetsDir : null,
      };
    })
    .filter(Boolean);
};

export const cleanupAdoptedGeneratedAssets = ({
  skillSources = [],
  commandSources = [],
  log,
}) => {
  for (const source of skillSources) {
    if (!fs.existsSync(source.sourceDir)) {
      continue;
    }

    fs.rmSync(source.sourceDir, { recursive: true, force: true });
    pruneEmptyAncestors(path.dirname(source.sourceDir), path.resolve(source.sourceDir, '..', '..'));
    log(`✓ Cleaned project-local OpenSpec workflow skill source ${source.sourceDir}`);
  }

  for (const source of commandSources) {
    if (!fs.existsSync(source.sourcePath)) {
      continue;
    }

    const sourceDir = path.dirname(source.sourcePath);
    const stopDir = path.resolve(sourceDir, '..');
    fs.rmSync(source.sourcePath, { force: true });
    pruneEmptyAncestors(sourceDir, stopDir);
    log(`✓ Cleaned project-local OpenSpec workflow command source ${source.sourcePath}`);
  }
};
