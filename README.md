# AI Instruction Logger

[中文文档](./README.zh-CN.md)

AI Instruction Logger records user instructions submitted to AI coding tools into a project evidence file for prompt optimization and software copyright application materials.

Default output in the target project:

```text
docs/copyright-evidence/instructions.md
```

Override the output path with:

```sh
export INSTRUCTION_LOG_FILE=".chat/instruction.md"
```

## Usage

Run the installer from the project you want to record:

```sh
cd /path/to/your-project
npx github:CoderIvanLee/ai-instruction-logger install all
```

Install one tool at a time:

```sh
npx github:CoderIvanLee/ai-instruction-logger install claude-code
npx github:CoderIvanLee/ai-instruction-logger install opencode
npx github:CoderIvanLee/ai-instruction-logger install codex
npx github:CoderIvanLee/ai-instruction-logger install kimi-cli
```

The installer is cross-platform. It writes JSON/TOML configs with Node.js and uses project-level hooks where each tool supports them.

If an existing config file changes, the installer creates a `.bak` backup first and prints every backup path in the install output. If the content is unchanged, no duplicate backup is created.

You can also install into another project without changing directories:

```sh
npx github:CoderIvanLee/ai-instruction-logger install all --project-root /path/to/your-project
```

After npm publishing, the shorter form will also work:

```sh
npx ai-instruction-logger install all
```

Record a message manually:

```sh
npx github:CoderIvanLee/ai-instruction-logger --source manual --project-root /path/to/project --message "开发一个功能"
```

Read a hook payload from stdin:

```sh
printf '{"prompt":"用户输入"}' | npx github:CoderIvanLee/ai-instruction-logger --source claude-code --project-root /path/to/project
```

## Integrations

Claude Code:

`install claude-code` writes `.claude/settings.json` in the target project and registers a `UserPromptSubmit` hook.

opencode:

`install opencode` writes or merges `opencode.json` in the target project and registers the opencode plugin.

Codex:

`install codex` writes `.codex/hooks.json` and enables `codex_hooks` in `.codex/config.toml`. Codex records user prompts from inside the interactive Codex conversation after the next Codex restart.

Kimi CLI:

`install kimi-cli` writes a `UserPromptSubmit` hook into `~/.kimi/config.toml`. Kimi CLI records user prompts from inside the interactive Kimi conversation after the next Kimi restart. The hook uses Kimi's `cwd` payload field, so prompts are recorded into the project where `kimi` or `kimi-cli` was started.

## Development

```sh
npm test
npm run check
```
