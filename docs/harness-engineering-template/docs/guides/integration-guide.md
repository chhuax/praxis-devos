# Integration Guide

## Audience

Teams integrating with the project API.

## Preconditions

- Valid credentials
- Network access to the target environment
- Required permissions enabled

## Steps

1. Obtain credentials.
2. Call the health endpoint.
3. Call the first business endpoint.
4. Handle standard error responses.
5. Validate timeout and retry behavior.

## Common Mistakes

- Using undocumented fields
- Depending on message text instead of stable error codes
- Skipping permission setup

## Related References

- `docs/reference/api.md`
- `docs/reference/errors.md`
- `docs/reference/permissions.md`

