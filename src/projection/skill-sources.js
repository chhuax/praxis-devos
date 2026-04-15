import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const directSkillsRoot = () => path.resolve(__dirname, '../../assets/skills');

const FRONTMATTER_PATTERN = /^(---\n[\s\S]*?\n---\n?)([\s\S]*)$/;
const normalizeLineEndings = (content) => content.replace(/\r\n/g, '\n');

export const collectDirectSkillSources = () =>
  (fs.existsSync(directSkillsRoot())
    ? fs.readdirSync(directSkillsRoot(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        sourceDir: path.join(directSkillsRoot(), entry.name),
      }))
      .filter(({ sourceDir }) => fs.existsSync(path.join(sourceDir, 'SKILL.md')))
    : []);

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

const applyOverlayToMarkdown = ({ upstreamContent, overlayPath = null, projectedName = null }) => {
  const normalizedUpstreamContent = normalizeLineEndings(upstreamContent);
  const frontmatterMatch = normalizedUpstreamContent.match(FRONTMATTER_PATTERN);
  if (!frontmatterMatch) {
    if (!overlayPath) {
      return normalizedUpstreamContent;
    }

    return injectOverlay(normalizedUpstreamContent, fs.readFileSync(overlayPath, 'utf8'));
  }

  const frontmatter = projectedName
    ? replaceProjectedName(frontmatterMatch[1], projectedName)
    : frontmatterMatch[1];
  const body = overlayPath
    ? injectOverlay(frontmatterMatch[2], fs.readFileSync(overlayPath, 'utf8'))
    : frontmatterMatch[2];

  return `${frontmatter}${body}`;
};

export const composeProjectedSkill = ({ projectedName, upstreamContent, overlayPath = null }) => {
  return applyOverlayToMarkdown({ upstreamContent, overlayPath, projectedName });
};

export const composeProjectedCommand = ({ upstreamContent, overlayPath = null }) =>
  applyOverlayToMarkdown({ upstreamContent, overlayPath });

export const collectBundledSkillSources = () =>
  collectDirectSkillSources().sort((a, b) => a.name.localeCompare(b.name));
