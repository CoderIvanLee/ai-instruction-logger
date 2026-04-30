#!/usr/bin/env sh
set -eu

LOGGER_ROOT=${AI_INSTRUCTION_LOGGER_ROOT:-$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)}
PROJECT_ROOT=${PROJECT_ROOT:-$(pwd)}

if [ "$#" -gt 0 ]; then
  node "$LOGGER_ROOT/bin/ai-instruction-logger.mjs" \
    --source codex \
    --project-root "$PROJECT_ROOT" \
    --message "$*"
fi

exec codex "$@"
