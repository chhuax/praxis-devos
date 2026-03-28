import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { CAPABILITY_POLICY, selectCapabilities } from '../core/capability-policy.js';
import { resolveUserHomeDir } from '../support/home.js';

const sanitizeSegment = (value) => String(value || 'project')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-')
  .replace(/^-+|-+$/g, '')
  || 'project';

const projectStateKey = (projectDir) => {
  const resolved = path.resolve(projectDir);
  const hash = crypto.createHash('sha256').update(resolved).digest('hex').slice(0, 8);
  return `${sanitizeSegment(path.basename(resolved))}-${hash}`;
};

export const resolvePraxisStateDir = () => {
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, 'PraxisDevOS', 'state');
  }

  return path.join(resolveUserHomeDir(), '.praxis-devos', 'state');
};

const REQUIRED_EVIDENCE_FIELDS = {
  brainstorming: ['open_questions', 'compared_approaches', 'chosen_decision'],
  'using-git-worktrees': ['path', 'branch', 'baseline'],
  'writing-plans': ['task_count', 'files', 'verification_steps'],
  'test-driven-development': ['failing_test', 'passing_test'],
  'systematic-debugging': ['repro', 'hypotheses', 'root_cause'],
  'subagent-driven-development': ['task_ownership', 'integration_summary'],
  'requesting-code-review': ['severity', 'blocking_issues', 'disposition'],
  'verification-before-completion': ['command', 'exit_code', 'summary'],
  'finishing-a-development-branch': ['chosen_option', 'branch_outcome'],
};

export const createCapabilityEvidenceStub = ({ changeId }) => ({
  version: 1,
  changeId,
  stages: {},
});

export const getCapabilityEvidencePath = ({ projectDir, changeId }) => (
  path.join(resolvePraxisStateDir(), projectStateKey(projectDir), changeId, 'evidence.json')
);

const uniqueList = (values = []) => [...new Set(values.filter(Boolean))];

const mergeObjects = (base, patch) => {
  const next = { ...(base || {}) };

  for (const [key, value] of Object.entries(patch || {})) {
    if (Array.isArray(value)) {
      next[key] = value.slice();
      continue;
    }

    if (value && typeof value === 'object') {
      next[key] = mergeObjects(next[key], value);
      continue;
    }

    next[key] = value;
  }

  return next;
};

export const initializeCapabilityEvidence = ({ projectDir, changeId }) => {
  const evidencePath = getCapabilityEvidencePath({ projectDir, changeId });
  const initial = createCapabilityEvidenceStub({ changeId });

  if (!fs.existsSync(evidencePath)) {
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, `${JSON.stringify(initial, null, 2)}\n`, 'utf8');
    return { evidencePath, value: initial };
  }

  return readCapabilityEvidence({ projectDir, changeId });
};

export const readCapabilityEvidence = ({ projectDir, changeId }) => {
  const evidencePath = getCapabilityEvidencePath({ projectDir, changeId });
  try {
    return {
      evidencePath,
      value: JSON.parse(fs.readFileSync(evidencePath, 'utf8')),
    };
  } catch {
    throw new Error(`Capability evidence file not found or invalid JSON: ${evidencePath}`);
  }
};

export const writeCapabilityEvidence = ({ projectDir, changeId, value }) => {
  const evidencePath = getCapabilityEvidencePath({ projectDir, changeId });
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.writeFileSync(evidencePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return { evidencePath, value };
};

export const updateCapabilityEvidenceStage = ({
  projectDir,
  changeId,
  stage,
  signals = [],
  capabilities = {},
  metadata = {},
}) => {
  if (!CAPABILITY_POLICY[stage]) {
    throw new Error(`Unsupported capability stage: ${stage}`);
  }

  const current = initializeCapabilityEvidence({ projectDir, changeId }).value;
  const currentStage = current.stages?.[stage] || {};
  const mergedCapabilities = { ...(currentStage.capabilities || {}) };

  for (const [capabilityId, entryPatch] of Object.entries(capabilities)) {
    mergedCapabilities[capabilityId] = mergeObjects(mergedCapabilities[capabilityId], entryPatch);
  }

  const next = {
    ...current,
    stages: {
      ...(current.stages || {}),
      [stage]: {
        ...currentStage,
        ...mergeObjects(currentStage, metadata),
        signals: uniqueList([...(currentStage.signals || []), ...signals]),
        capabilities: mergedCapabilities,
      },
    },
  };

  return writeCapabilityEvidence({ projectDir, changeId, value: next });
};

export const recordCapabilitySelection = ({ projectDir, changeId, stage, signals }) => {
  const selection = selectCapabilities({ stage, signals });
  const selectedCapabilities = Object.fromEntries(
    selection.selected.map((entry) => [
      entry.id,
      {
        selected: true,
        kind: entry.kind,
        reasons: entry.reasons,
        evidence: {},
      },
    ]),
  );

  updateCapabilityEvidenceStage({
    projectDir,
    changeId,
    stage,
    signals: selection.signals,
    capabilities: selectedCapabilities,
    metadata: {
      selection: {
        selected: selection.selected.map((entry) => entry.id),
        skipped: selection.skipped.map((entry) => entry.id),
      },
    },
  });

  return selection;
};

export const recordCapabilityEvidence = ({
  projectDir,
  changeId,
  stage,
  capability,
  selected = null,
  reasons = [],
  evidence = {},
  signals = [],
}) => {
  const capabilityPatch = {
    [capability]: {
      ...(selected == null ? {} : { selected }),
      ...(reasons.length > 0 ? { reasons } : {}),
      ...(Object.keys(evidence).length > 0 ? { evidence } : {}),
    },
  };

  return updateCapabilityEvidenceStage({
    projectDir,
    changeId,
    stage,
    signals,
    capabilities: capabilityPatch,
  });
};

const validateEvidenceFields = ({ capabilityId, evidence, findings }) => {
  const requiredFields = REQUIRED_EVIDENCE_FIELDS[capabilityId] || [];
  for (const field of requiredFields) {
    if (evidence?.[field] == null) {
      findings.push(`Missing evidence field "${field}" for ${capabilityId}`);
    }
  }
};

const validateStageEvidence = ({ stage, stageEvidence, findings }) => {
  const selection = selectCapabilities({
    stage,
    signals: stageEvidence?.signals || [],
  });

  const capabilityMap = stageEvidence?.capabilities || {};

  for (const expected of selection.selected) {
    const entry = capabilityMap[expected.id];
    if (!entry || entry.selected !== true) {
      findings.push(`Missing selected capability evidence for ${expected.id} in ${stage}`);
      continue;
    }

    validateEvidenceFields({
      capabilityId: expected.id,
      evidence: entry.evidence,
      findings,
    });
  }

  return {
    stage,
    selected: selection.selected,
    skipped: selection.skipped,
  };
};

export const analyzeChangeEvidence = ({ projectDir, changeId, stage = null }) => {
  const { value, evidencePath } = readCapabilityEvidence({ projectDir, changeId });
  const requestedStages = stage ? [stage] : Object.keys(value.stages || {});
  const findings = [];
  const stages = [];

  if (requestedStages.length === 0) {
    findings.push('No stage evidence recorded');
  }

  for (const stageName of requestedStages) {
    if (!CAPABILITY_POLICY[stageName]) {
      findings.push(`Unsupported capability stage: ${stageName}`);
      continue;
    }

    const stageEvidence = value.stages?.[stageName];
    if (!stageEvidence) {
      findings.push(`Missing stage evidence for ${stageName}`);
      continue;
    }

    stages.push(validateStageEvidence({
      stage: stageName,
      stageEvidence,
      findings,
    }));
  }

  return {
    status: findings.length === 0 ? 'pass' : 'needs-attention',
    changeId,
    evidencePath,
    stages,
    findings,
  };
};

export const validateChangeEvidence = ({ projectDir, changeId, stage = null, strict = false }) => {
  if (!changeId) {
    throw new Error('Missing change id. Use `npx praxis-devos validate-change --change-id <name>`.');
  }

  const result = analyzeChangeEvidence({ projectDir, changeId, stage });
  const lines = [
    'Change evidence validation',
    `change: ${changeId}`,
    `evidence: ${result.evidencePath}`,
    `status: ${result.status}`,
  ];

  if (result.stages.length === 0) {
    lines.push('stages: none');
  } else {
    lines.push('stages:');
    for (const stageResult of result.stages) {
      lines.push(`- ${stageResult.stage}`);
      lines.push(`  - selected: ${stageResult.selected.map((entry) => entry.id).join(', ') || 'none'}`);
      lines.push(`  - skipped: ${stageResult.skipped.map((entry) => entry.id).join(', ') || 'none'}`);
    }
  }

  if (result.findings.length === 0) {
    lines.push('findings: none');
  } else {
    lines.push('findings:');
    for (const finding of result.findings) {
      lines.push(`- ${finding}`);
    }
  }

  const report = lines.join('\n');
  if (strict && result.findings.length > 0) {
    throw new Error(report);
  }

  return report;
};
