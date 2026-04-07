# Error Reference

## Source Of Truth

- `contracts/errors/errors.yaml`

## Rules

- Clients should rely on stable error codes, not raw message text.
- Retry decisions should use explicit retryability and status semantics.

## Error Codes

### `AUTH_UNAUTHORIZED`

- HTTP status: `401`
- Retryable: no
- Meaning: caller is not authenticated

### `VALIDATION_FAILED`

- HTTP status: `400`
- Retryable: no
- Meaning: request payload is invalid

