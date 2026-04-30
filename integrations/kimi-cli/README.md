# Kimi CLI

Kimi CLI support is reserved for the next integration.

The expected implementation shape is:

1. Identify whether Kimi CLI exposes a prompt-submit hook, plugin API, or wrapper-friendly command mode.
2. If a hook/plugin exists, call `bin/ai-instruction-logger.mjs` with `--source kimi-cli`.
3. If only command wrapping is possible, add a wrapper under `bin/` and document the limitation.
