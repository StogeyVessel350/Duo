#!/usr/bin/env bash
# DUO — initial dev environment bootstrap.
# Safe to run multiple times.

set -euo pipefail

echo "→ checking prerequisites"
command -v go >/dev/null       || { echo "install Go 1.22+"; exit 1; }
command -v node >/dev/null     || { echo "install Node 20+"; exit 1; }
command -v pnpm >/dev/null     || { echo "install pnpm 9+"; exit 1; }
command -v python3 >/dev/null  || { echo "install Python 3.11+"; exit 1; }
command -v docker >/dev/null   || { echo "install Docker"; exit 1; }

echo "→ installing mobile deps"
( cd mobile && pnpm install )

echo "→ installing web deps"
( cd web && pnpm install )

echo "→ installing ai-inference deps"
( cd ai-inference && pip install -e ".[dev]" )

echo "→ starting backend infra (postgres, redis, kafka, localstack)"
( cd backend && docker compose up -d )

echo "→ done. Next steps:"
echo "    backend:  cd backend && go run ./api/cmd"
echo "    mobile:   cd mobile && pnpm ios     # or: pnpm android"
echo "    web:      cd web && pnpm dev"
