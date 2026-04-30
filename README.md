# AI Instruction Logger

AI Instruction Logger records user instructions submitted to AI coding tools into a project evidence file.

Default output in the target project:

```text
docs/copyright-evidence/instructions.md
```

Override the output path with:

```sh
export INSTRUCTION_LOG_FILE=".chat/instruction.md"
```

## Usage

Record a message manually:

```sh
node bin/ai-instruction-logger.mjs --source manual --project-root /path/to/project --message "开发一个功能"
```

Read a hook payload from stdin:

```sh
printf '{"prompt":"用户输入"}' | node bin/ai-instruction-logger.mjs --source claude-code --project-root /path/to/project
```

## Integrations

Claude Code:

Copy `integrations/claude-code/settings.example.json` into the target project's `.claude/settings.json`, then replace `/ABSOLUTE/PATH/TO/ai-instruction-logger` with this repository path.

opencode:

Use `integrations/opencode/opencode.example.json` as the target project's opencode plugin configuration, then replace `/ABSOLUTE/PATH/TO/ai-instruction-logger`.

Codex:

Use `bin/codex-with-instruction-log.sh` for command-line prompts. Codex CLI does not currently provide a prompt-submit hook that can capture every interactive user input.

Kimi CLI:

Reserved under `integrations/kimi-cli/` for the next integration.

## Development

```sh
npm test
npm run check
```
