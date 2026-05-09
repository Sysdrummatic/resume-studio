# OpenCV YAML Public Contract Policy

This guide operationalizes [ADR 0002](../adr/0002-opencv-yaml-public-contract.md).

## Versioning Rules

- `open_cv_yaml_contract_version` uses major-first compatibility.
- Current supported major is `1`.
- Resolver/runtime accepts:
  - `1`
  - `1.x`
- Any other major is treated as unsupported and must not be rendered publicly.

## Schema Compatibility

- `schema_version` is required on Published CV snapshots.
- Minimum supported snapshot schema version is `1`.
- Publish-time validation must reject invalid YAML before snapshot creation.

## Evolution And Deprecation

- Minor changes (`1.x`) must be backward compatible.
- Major changes require a new ADR and migration plan.
- Unsupported majors are non-renderable until migration support is added.

## Historical Snapshot Migration Policy

- Historical Published CV snapshots are immutable by default.
- If migration is required:
  - use explicit migration scripts/RPCs,
  - preserve auditability,
  - never silently rewrite snapshot content in-place during read.

## Regression Contract

Before merge, run:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
```

Contract tests must verify:

- publish-time YAML validation is enforced,
- contract version is stamped on publish,
- public resolvers reject unsupported contract major versions.
