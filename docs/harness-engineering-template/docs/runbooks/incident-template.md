# Runbook: <Incident Name>

## Trigger

Symptoms that indicate this runbook applies.

## Scope

Systems, environments, and user impact.

## Checks

1. Check service health endpoint.
2. Check recent deployment history.
3. Check logs for error code patterns.
4. Check dependency status.
5. Check config drift.

## Decision Points

- If auth failures dominate, go to the auth troubleshooting section.
- If timeout failures dominate, check downstream dependencies.
- If only one environment is affected, check config rollout.

## Recovery Actions

1. <Safe action>
2. <Escalation action>
3. <Rollback action if needed>

## Verification

- Health endpoint returns expected result
- Error rate drops
- Core workflow succeeds

## Evidence To Capture

- Error messages or codes
- Time window
- Affected versions
- Relevant logs and commands

