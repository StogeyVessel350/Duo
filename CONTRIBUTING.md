# Contributing to DUO

## Branching

- `main` is always deployable.
- Feature branches: `feat/<short-name>`
- Bug fixes: `fix/<short-name>`
- Cross-cutting refactors: `refactor/<short-name>`

## Commits

Conventional commits:
```
feat(mobile): add rep-count chart
fix(backend): atomic occupancy claim under contention
docs(phase-6): initial draft
chore(infra): bump terraform aws provider
```

## PRs

- Must pass CI (lint, typecheck, tests).
- At least one review from outside the area you're changing (prevents silos).
- Include a note on docs updates if applicable. Phase docs in `/docs` are authoritative — if a PR changes a decision captured there, update the doc in the same PR.

## Phase gate changes

The Phase 1–7 documents in `/docs` capture sign-off decisions. A PR that contradicts one of these must:
1. Update the relevant phase doc with the reason for the change.
2. Tag the CEO/Orchestrator for explicit approval (even if the human maintainer is the same person).

## Local dev

Run `./scripts/bootstrap.sh` from the repo root.
