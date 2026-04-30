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

Install project-level integrations:

```sh
npx ai-instruction-logger install all
npx ai-instruction-logger install claude-code
npx ai-instruction-logger install opencode
npx ai-instruction-logger install codex
```

Without npm publishing, run from this repository:

```sh
node /ABSOLUTE/PATH/TO/ai-instruction-logger/bin/ai-instruction-logger.mjs install all --project-root /path/to/project
```

The installer is cross-platform. It writes JSON configs with Node.js and creates both `.ai-instruction-logger/codex` for macOS/Linux and `.ai-instruction-logger/codex.cmd` for Windows.

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
