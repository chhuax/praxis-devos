import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectForAgent, projectToAgent } from '../projection/index.js';
import { isProjection, parseMarker } from '../projection/markers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRAXIS_ROOT = path.resolve(__dirname, '../..');
const PACKAGE_JSON = path.join(PRAXIS_ROOT, 'package.json');
const MONITORING_MARKER = '<!-- PRAXIS_MONITORING mode=instrumented -->';

const OVERLAY_BLOCKS = {
  'opsx-propose': [
    '## Praxis Monitoring Overlay',
    '',
    '- Optional runtime monitoring is enabled for this projected skill.',
    '- If you want to record proposal-stage capability selection, run:',
    '  `npx praxis-devos record-selection --project-dir <project-dir> --change-id "<name>" --stage propose --signals "<comma-separated-signals>"`',
    '- If you want to record a capability result, run:',
    '  `npx praxis-devos record-capability --project-dir <project-dir> --change-id "<name>" --stage propose --capability brainstorming --selected --reasons "ambiguity" --evidence-json \'{\"open_questions\":[\"...\"],\"compared_approaches\":[\"...\"],\"chosen_decision\":\"...\"}\'`',
    '',
  ].join('\n'),
  'opsx-explore': [
    '## Praxis Monitoring Overlay',
    '',
    '- Optional runtime monitoring is enabled for this projected skill.',
    '- Record explore-stage capability selection with:',
    '  `npx praxis-devos record-selection --project-dir <project-dir> --change-id "<name>" --stage explore --signals "<comma-separated-signals>"`',
    '',
  ].join('\n'),
  'opsx-apply': [
    '## Praxis Monitoring Overlay',
    '',
    '- Optional runtime monitoring is enabled for this projected skill.',
    '- Record apply-stage capability selection once at entry:',
    '  `npx praxis-devos record-selection --project-dir <project-dir> --change-id "<name>" --stage apply --signals "<comma-separated-signals>"`',
    '- Record capability evidence after embedded methods produce concrete output:',
    '  `npx praxis-devos record-capability --project-dir <project-dir> --change-id "<name>" --stage apply --capability writing-plans --selected --reasons "multi_step" --evidence-json \'{\"task_count\":3,\"files\":[\"src/core/praxis-devos.js\"],\"verification_steps\":[\"npm test\"]}\'`',
    '',
  ].join('\n'),
  'opsx-archive': [
    '## Praxis Monitoring Overlay',
    '',
    '- Optional runtime monitoring is enabled for this projected skill.',
    '- Record archive-stage capability selection with:',
    '  `npx praxis-devos record-selection --project-dir <project-dir> --change-id "<name>" --stage archive --signals "<comma-separated-signals>"`',
    '',
  ].join('\n'),
};

const getPraxisVersion = () => {
  try {
    return JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8')).version || '0.0.0';
  } catch {
    return '0.0.0';
  }
};

const insertOverlay = (content, overlayBlock) => {
  if (content.includes(MONITORING_MARKER)) {
    return content;
  }

  const lines = content.split('\n');
  const markerIndex = lines.findIndex((line) => line.startsWith('<!-- PRAXIS_PROJECTION'));
  if (markerIndex === -1) {
    return content;
  }

  const insertion = [MONITORING_MARKER, '', ...overlayBlock.split('\n')];
  return [
    ...lines.slice(0, markerIndex + 1),
    ...insertion,
    ...lines.slice(markerIndex + 1),
  ].join('\n');
};

const assertProjectionWritable = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return true;
  }

  return isProjection(filePath);
};

export const isInstrumentedProjection = (filePath) => (
  fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8').includes(MONITORING_MARKER)
);

export const enableInstrumentation = ({ agents, log }) => {
  const version = getPraxisVersion();
  for (const agent of agents) {
    projectToAgent({ agent, version, log });
    const projections = detectForAgent(agent);

    for (const projection of projections) {
      const overlayBlock = OVERLAY_BLOCKS[projection.name];
      if (!overlayBlock) {
        continue;
      }
      if (!assertProjectionWritable(projection.path)) {
        log(`⊘ Monitoring: skipped ${projection.path} because it is not a Praxis projection`);
        continue;
      }

      const content = fs.readFileSync(projection.path, 'utf8');
      if (!parseMarker(content)) {
        log(`⊘ Monitoring: skipped ${projection.path} because projection marker is missing`);
        continue;
      }

      fs.writeFileSync(projection.path, insertOverlay(content, overlayBlock), 'utf8');
      log(`✓ Monitoring: instrumented ${projection.name} for ${agent}`);
    }
  }
};

export const disableInstrumentation = ({ agents, log }) => {
  const version = getPraxisVersion();
  for (const agent of agents) {
    projectToAgent({ agent, version, log });
    log(`✓ Monitoring: restored clean projections for ${agent}`);
  }
};

export const instrumentationStatus = ({ agents }) => {
  const lines = [];

  for (const agent of agents) {
    const projections = detectForAgent(agent);
    const instrumented = projections.filter((entry) => isInstrumentedProjection(entry.path));
    const status = instrumented.length > 0 ? 'enabled' : 'clean';
    lines.push(`${agent}: ${status}`);
    for (const projection of projections) {
      lines.push(`- ${projection.name}: ${isInstrumentedProjection(projection.path) ? 'instrumented' : 'clean'}`);
    }
  }

  return lines.join('\n');
};
