# Runbook: API Failure

## Trigger

Use this runbook when a public API endpoint returns unexpected 4xx or 5xx, latency spikes, or schema mismatch.

## Inputs

- Endpoint path
- Request ID
- Timestamp
- Environment
- Caller identity

## Checks

1. Confirm the endpoint contract in `contracts/openapi/public.yaml`.
2. Confirm whether the request shape matches contract.
3. Check auth and permission mapping.
4. Check recent contract or deployment changes.
5. Check downstream dependency health.

## Recovery

- Fix bad config if config drift exists.
- Roll back the latest incompatible deployment if needed.
- If contract changed, publish migration guidance.

## Verification

- Reproduce with a known-good request
- Confirm response shape matches contract
- Confirm no new authorization regressions

