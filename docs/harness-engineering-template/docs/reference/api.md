# API Reference

## Source Of Truth

- `contracts/openapi/public.yaml`

## Scope

This document summarizes the public API surface. The OpenAPI contract is authoritative.

## Endpoints

### `GET /health`

- Purpose: check service health
- Auth: none
- Success response: `HealthResponse`
- Contract: see `contracts/openapi/public.yaml`

## Notes

- Do not document fields here that are not present in the contract.
- Breaking changes must be recorded in a migration guide.

