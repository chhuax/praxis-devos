import fs from 'fs';
import path from 'path';

const PROJECTION_MARKER_PREFIX = '<!-- PRAXIS_PROJECTION';
const PROJECTION_MARKER_SUFFIX = '-->';
const FRONTMATTER_PATTERN = /^(---\n[\s\S]*?\n---\n?)/;

export const buildMarker = ({ source, version }) =>
  `${PROJECTION_MARKER_PREFIX} source=${source} version=${version} ${PROJECTION_MARKER_SUFFIX}`;

export const injectMarker = (content, marker) => {
  const frontmatterMatch = content.match(FRONTMATTER_PATTERN);
  if (!frontmatterMatch) {
    return `${marker}\n${content}`;
  }

  return `${frontmatterMatch[1]}${marker}\n${content.slice(frontmatterMatch[1].length)}`;
};

export const parseMarker = (content) => {
  const frontmatterMatch = content.match(FRONTMATTER_PATTERN);
  const markerLine = (frontmatterMatch ? content.slice(frontmatterMatch[1].length) : content)
    .split('\n')[0];
  if (!markerLine.startsWith(PROJECTION_MARKER_PREFIX)) {
    return null;
  }
  const sourceMatch = markerLine.match(/source=(\S+)/);
  const versionMatch = markerLine.match(/version=(\S+)/);
  return {
    source: sourceMatch ? sourceMatch[1] : null,
    version: versionMatch ? versionMatch[1] : null,
  };
};

export const isProjection = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return parseMarker(content) !== null;
};

export const projectionVersion = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = parseMarker(content);
  return parsed ? parsed.version : null;
};
