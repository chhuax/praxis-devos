export const CAPABILITY_POLICY = {
  explore: [
    { id: 'brainstorming', kind: 'conditional', when: ['ambiguity', 'multiple_options', 'behavior_change'] },
  ],
  propose: [
    { id: 'using-git-worktrees', kind: 'conditional', when: ['on_main', 'on_master', 'dirty_workspace'] },
    { id: 'brainstorming', kind: 'conditional', when: ['ambiguity', 'multiple_options'] },
    { id: 'requesting-code-review', kind: 'mandatory', when: ['artifacts_complete'] },
  ],
  apply: [
    { id: 'writing-plans', kind: 'conditional', when: ['multi_step', 'cross_module', 'task_ambiguous'] },
    { id: 'test-driven-development', kind: 'mandatory', when: ['code_task'] },
    { id: 'systematic-debugging', kind: 'conditional', when: ['failing_test', 'bug', 'regression'] },
    { id: 'subagent-driven-development', kind: 'conditional', when: ['context_isolation_needed', 'parallelizable'] },
    { id: 'requesting-code-review', kind: 'mandatory', when: ['all_tasks_done'] },
    { id: 'verification-before-completion', kind: 'mandatory', when: ['completion_claim'] },
    { id: 'finishing-a-development-branch', kind: 'terminal', when: ['all_tasks_done', 'verification_passed'] },
  ],
  archive: [
    { id: 'verification-before-completion', kind: 'mandatory', when: ['archive_claim'] },
  ],
};

const normalizeSignals = (signals) => {
  if (Array.isArray(signals)) {
    return new Set(signals.filter(Boolean));
  }

  if (!signals || typeof signals !== 'object') {
    return new Set();
  }

  return new Set(
    Object.entries(signals)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([signal]) => signal),
  );
};

export const selectCapabilities = ({ stage, signals }) => {
  const policy = CAPABILITY_POLICY[stage];
  if (!policy) {
    throw new Error(`Unsupported capability stage: ${stage}`);
  }

  const signalSet = normalizeSignals(signals);
  const selected = [];
  const skipped = [];

  for (const capability of policy) {
    const reasons = capability.when.filter((signal) => signalSet.has(signal));
    if (reasons.length > 0) {
      selected.push({
        id: capability.id,
        kind: capability.kind,
        reasons,
      });
      continue;
    }

    skipped.push({
      id: capability.id,
      kind: capability.kind,
      reasons: capability.when,
    });
  }

  return {
    stage,
    signals: [...signalSet],
    selected,
    skipped,
  };
};
