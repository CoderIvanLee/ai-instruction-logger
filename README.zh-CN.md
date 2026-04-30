# AI Instruction Logger

AI Instruction Logger 用于记录用户在 AI 编程工具中输入的需求和指令，并写入项目目录中的证据文件，用于优化指令和软件著作权申请提供资料。

默认记录文件：

```text
docs/copyright-evidence/instructions.md
```

## 快速安装

进入需要记录指令的项目根目录：

```sh
cd /path/to/your-project
npx github:CoderIvanLee/ai-instruction-logger install all
```

也可以只安装某一个工具：

```sh
npx github:CoderIvanLee/ai-instruction-logger install claude-code
npx github:CoderIvanLee/ai-instruction-logger install opencode
npx github:CoderIvanLee/ai-instruction-logger install codex
npx github:CoderIvanLee/ai-instruction-logger install kimi-cli
```

如果不想进入项目目录，可以指定项目路径：

```sh
npx github:CoderIvanLee/ai-instruction-logger install all --project-root /path/to/your-project
```

## 支持的工具

### Claude Code

安装命令：

```sh
npx github:CoderIvanLee/ai-instruction-logger install claude-code
```

安装器会在当前项目写入：

```text
.claude/settings.json
```

通过 Claude Code 的 `UserPromptSubmit` hook 记录用户输入。

安装后需要重启 Claude Code 会话。

### opencode

安装命令：

```sh
npx github:CoderIvanLee/ai-instruction-logger install opencode
```

安装器会在当前项目写入或合并：

```text
opencode.json
```

通过 opencode 插件记录用户消息。

安装后需要重启 opencode。

### Codex

安装命令：

```sh
npx github:CoderIvanLee/ai-instruction-logger install codex
```

安装器会在当前项目写入：

```text
.codex/hooks.json
.codex/config.toml
```

通过 Codex 的 `UserPromptSubmit` hook 记录 Codex 内部对话中的用户输入。

安装后需要重启 Codex 会话。

### Kimi CLI

安装命令：

```sh
npx github:CoderIvanLee/ai-instruction-logger install kimi-cli
```

安装器会写入：

```text
~/.kimi/config.toml
```

通过 Kimi CLI 的 `UserPromptSubmit` hook 记录用户输入。Kimi CLI 会在 hook payload 中提供 `cwd`，所以记录会写入启动 `kimi` 或 `kimi-cli` 时所在的项目目录。

安装后需要重启 Kimi CLI 会话。

## 自定义记录路径

默认记录到：

```text
docs/copyright-evidence/instructions.md
```

如果希望改成其他文件，可以设置环境变量：

```sh
export INSTRUCTION_LOG_FILE=".chat/instruction.md"
```

Windows PowerShell：

```powershell
$env:INSTRUCTION_LOG_FILE=".chat/instruction.md"
```

## 安装后如何验证

以 Codex 为例：

```sh
cd /path/to/your-project
npx github:CoderIvanLee/ai-instruction-logger install codex
```

重启 Codex 后，在 Codex 内部输入一条指令。然后查看：

```sh
cat docs/copyright-evidence/instructions.md
```

你应该能看到类似内容：

```text
2026-04-30 12:00:00 [codex] 用户输入的指令
```

## 是否需要重启

安装后通常需要重启对应工具：

| 工具 | 是否需要重启 | 原因 |
| --- | --- | --- |
| Claude Code | 需要 | 重新读取 `.claude/settings.json` |
| opencode | 需要 | 重新加载 `opencode.json` 插件 |
| Codex | 需要 | 重新读取 `.codex/hooks.json` 和 `.codex/config.toml` |
| Kimi CLI | 需要 | 重新读取 `~/.kimi/config.toml` |

## 覆盖策略

安装器会直接更新原配置文件，不额外生成 `.bak` 备份。它会尽量保留已有配置，只追加或更新本工具需要的 hook 配置。

## 注意事项

- 这个工具只记录用户输入的指令，不记录 AI 回复。
- 记录文件会保存在目标项目中，请根据项目隐私要求决定是否提交到 Git。
- 通过 GitHub `npx` 使用时，不需要 npm 发布，也不需要登录 GitHub；前提是仓库保持 public。
- 当前工具需要 Node.js 20 或更高版本。

## 开发

```sh
npm test
npm run check
```
