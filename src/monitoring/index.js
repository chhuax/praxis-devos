export {
  analyzeChangeEvidence,
  createCapabilityEvidenceStub,
  getCapabilityEvidencePath,
  initializeCapabilityEvidence,
  readCapabilityEvidence,
  recordCapabilityEvidence,
  recordCapabilitySelection,
  resolvePraxisStateDir,
  updateCapabilityEvidenceStage,
  validateChangeEvidence,
  writeCapabilityEvidence,
} from './state-store.js';

export {
  disableInstrumentation,
  enableInstrumentation,
  instrumentationStatus,
  isInstrumentedProjection,
} from './overlay.js';

export {
  handleInstrumentationCommand,
  handleRecordCapabilityCommand,
  handleRecordSelectionCommand,
  handleValidateChangeCommand,
} from './commands.js';
