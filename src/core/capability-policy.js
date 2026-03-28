export const CAPABILITY_POLICY = {
  explore: [
    { id: 'brainstorming', kind: 'conditional', when: ['ambiguity', 'multiple_options', 'behavior_change'] },
  ],
  propose: [
    { id: 'brainstorming', kind: 'conditional', when: ['ambiguity', 'multiple_options'] },
  ],
  apply: [
    { id: 'using-git-worktrees', kind: 'conditional', when: ['dirty_workspace', 'parallel_work', 'high_risk'] },
    { id: 'writing-plans', kind: 'conditional', when: ['multi_step', 'cross_module', 'task_count_gt_1'] },
    { id: 'test-driven-development', kind: 'mandatory', when: ['behavior_change'] },
    { id: 'systematic-debugging', kind: 'conditional', when: ['failing_test', 'bug', 'regression'] },
    { id: 'subagent-driven-development', kind: 'conditional', when: ['parallelizable', 'plan_ready'] },
    { id: 'requesting-code-review', kind: 'conditional', when: ['task_boundary', 'high_risk', 'batch_complete'] },
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
