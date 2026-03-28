import { disableInstrumentation, enableInstrumentation, instrumentationStatus } from './overlay.js';
import {
  recordCapabilityEvidence,
  recordCapabilitySelection,
  validateChangeEvidence,
} from './state-store.js';

const csv = (value) => String(value || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

export const handleInstrumentationCommand = ({ action, agents, log }) => {
  if (action === 'enable') {
    enableInstrumentation({ agents, log });
    return ['Instrumentation enabled'];
  }

  if (action === 'disable') {
    disableInstrumentation({ agents, log });
    return ['Instrumentation disabled'];
  }

  if (action === 'status') {
    return [instrumentationStatus({ agents })];
  }

  throw new Error(`Unknown instrumentation action: ${action}`);
};

export const handleValidateChangeCommand = ({ projectDir, changeId, stage, strict }) => (
  validateChangeEvidence({ projectDir, changeId, stage, strict })
);

export const handleRecordSelectionCommand = ({ projectDir, changeId, stage, signals }) => {
  if (!changeId) {
    throw new Error('Missing change id. Use `npx praxis-devos record-selection --change-id <name>`.');
  }
  if (!stage) {
    throw new Error('Missing stage. Use `npx praxis-devos record-selection --stage <name>`.');
  }

  const selection = recordCapabilitySelection({
    projectDir,
    changeId,
    stage,
    signals: csv(signals),
  });

  return [
    `recorded selection for ${stage}`,
    `change: ${changeId}`,
    `selected: ${selection.selected.map((entry) => entry.id).join(', ') || 'none'}`,
    `skipped: ${selection.skipped.map((entry) => entry.id).join(', ') || 'none'}`,
  ].join('\n');
};

export const handleRecordCapabilityCommand = ({
  projectDir,
  changeId,
  stage,
  capability,
  selected,
  reasons,
  evidenceJson,
  signals,
}) => {
  if (!changeId) {
    throw new Error('Missing change id. Use `npx praxis-devos record-capability --change-id <name>`.');
  }
  if (!stage) {
    throw new Error('Missing stage. Use `npx praxis-devos record-capability --stage <name>`.');
  }
  if (!capability) {
    throw new Error('Missing capability. Use `npx praxis-devos record-capability --capability <name>`.');
  }

  const evidence = evidenceJson ? JSON.parse(evidenceJson) : {};

  recordCapabilityEvidence({
    projectDir,
    changeId,
    stage,
    capability,
    selected: selected ? true : null,
    reasons: csv(reasons),
    evidence,
    signals: csv(signals),
  });

  return [
    `recorded ${capability} evidence`,
    `change: ${changeId}`,
    `stage: ${stage}`,
  ].join('\n');
};
