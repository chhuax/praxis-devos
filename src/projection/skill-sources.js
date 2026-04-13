import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const directSkillsRoot = () => path.resolve(__dirname, '../../assets/skills');
const upstreamOpenSpecSkillsRoot = () => path.resolve(__dirname, '../../assets/upstream/openspec/skills');
const overlayOpenSpecSkillsRoot = () => path.resolve(__dirname, '../../assets/overlays/openspec/skills');

const openSpecWorkflowSkills = [
  {
    name: 'opsx-explore',
    upstreamDirName: 'openspec-explore',
    overlayFileName: 'opsx-explore.overlay.md',
  },
  {
    name: 'opsx-propose',
    upstreamDirName: 'openspec-propose',
    overlayFileName: 'opsx-propose.overlay.md',
  },
  {
    name: 'opsx-apply',
    upstreamDirName: 'openspec-apply-change',
    overlayFileName: 'opsx-apply.overlay.md',
  },
  {
    name: 'opsx-archive',
    upstreamDirName: 'openspec-archive-change',
    overlayFileName: 'opsx-archive.overlay.md',
  },
];

const FRONTMATTER_PATTERN = /^(---\n[\s\S]*?\n---\n?)([\s\S]*)$/;

const collectDirectSkillSources = () =>
  (fs.existsSync(directSkillsRoot())
    ? fs.readdirSync(directSkillsRoot(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        sourceDir: path.join(directSkillsRoot(), entry.name),
      }))
      .filter(({ sourceDir }) => fs.existsSync(path.join(sourceDir, 'SKILL.md')))
    : []);

const collectManagedOpenSpecSkillSources = () => openSpecWorkflowSkills
  .map(({ name, upstreamDirName, overlayFileName }) => {
    const sourceDir = path.join(upstreamOpenSpecSkillsRoot(), upstreamDirName);
    if (!fs.existsSync(path.join(sourceDir, 'SKILL.md'))) {
      return null;
    }

    const overlayPath = overlayFileName
      ? path.join(overlayOpenSpecSkillsRoot(), overlayFileName)
      : null;
    const overlayAssetsDir = path.join(overlayOpenSpecSkillsRoot(), name);

    return {
      name,
      sourceDir,
      overlayPath: overlayPath && fs.existsSync(overlayPath) ? overlayPath : null,
      overlayAssetsDir: fs.existsSync(overlayAssetsDir) ? overlayAssetsDir : null,
      sourceType: 'openspec-upstream',
    };
  })
  .filter(Boolean);

const replaceProjectedName = (frontmatter, projectedName) => frontmatter.replace(
  /^name:\s*[^\n]+$/m,
  `name: ${projectedName}`,
);

const injectOverlay = (body, overlayContent) => {
  const trimmedOverlay = overlayContent.trim();
  if (!trimmedOverlay) {
    return body;
  }

  const separator = '\n---\n';
  const separatorIndex = body.indexOf(separator);
  if (separatorIndex === -1) {
    return `${body.trimEnd()}\n\n${trimmedOverlay}\n`;
  }

  return `${body.slice(0, separatorIndex).trimEnd()}\n\n${trimmedOverlay}\n${body.slice(separatorIndex)}`;
};

export const composeProjectedSkill = ({ projectedName, upstreamContent, overlayPath = null }) => {
  const frontmatterMatch = upstreamContent.match(FRONTMATTER_PATTERN);
  if (!frontmatterMatch) {
    return upstreamContent;
  }

  const frontmatter = replaceProjectedName(frontmatterMatch[1], projectedName);
  const body = overlayPath
    ? injectOverlay(frontmatterMatch[2], fs.readFileSync(overlayPath, 'utf8'))
    : frontmatterMatch[2];

  return `${frontmatter}${body}`;
};

export const collectBundledSkillSources = () => [
  ...collectDirectSkillSources(),
  ...collectManagedOpenSpecSkillSources(),
].sort((a, b) => a.name.localeCompare(b.name));
