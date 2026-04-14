import fs from 'fs';
import path from 'path';

const PROJECTION_MARKER_PREFIX = '<!-- PRAXIS_PROJECTION';
const PROJECTION_MARKER_SUFFIX = '-->';
const FRONTMATTER_PATTERN = /^(---\n[\s\S]*?\n---\n?)/;
const normalizeLineEndings = (content) => content.replace(/\r\n/g, '\n');

export const buildMarker = ({ source, version }) =>
  `${PROJECTION_MARKER_PREFIX} source=${source} version=${version} ${PROJECTION_MARKER_SUFFIX}`;

export const injectMarker = (content, marker) => {
  const normalizedContent = normalizeLineEndings(content);
  const frontmatterMatch = normalizedContent.match(FRONTMATTER_PATTERN);
  if (!frontmatterMatch) {
    return `${marker}\n${normalizedContent}`;
  }

  return `${frontmatterMatch[1]}${marker}\n${normalizedContent.slice(frontmatterMatch[1].length)}`;
};

export const parseMarker = (content) => {
  const normalizedContent = normalizeLineEndings(content);
  const frontmatterMatch = normalizedContent.match(FRONTMATTER_PATTERN);
  const markerLine = (frontmatterMatch ? normalizedContent.slice(frontmatterMatch[1].length) : normalizedContent)
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

export const canWriteProjection = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return true;
  }

  return isProjection(filePath);
};

export const projectionVersion = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = parseMarker(content);
  return parsed ? parsed.version : null;
};
