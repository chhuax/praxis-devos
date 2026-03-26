import fs from 'fs';
import path from 'path';

const PROJECTION_MARKER_PREFIX = '<!-- PRAXIS_PROJECTION';
const PROJECTION_MARKER_SUFFIX = '-->';

export const buildMarker = ({ source, version }) =>
  `${PROJECTION_MARKER_PREFIX} source=${source} version=${version} ${PROJECTION_MARKER_SUFFIX}`;

export const parseMarker = (content) => {
  const firstLine = content.split('\n')[0];
  if (!firstLine.startsWith(PROJECTION_MARKER_PREFIX)) {
    return null;
  }
  const sourceMatch = firstLine.match(/source=(\S+)/);
  const versionMatch = firstLine.match(/version=(\S+)/);
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
  return content.startsWith(PROJECTION_MARKER_PREFIX);
};

export const projectionVersion = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = parseMarker(content);
  return parsed ? parsed.version : null;
};
