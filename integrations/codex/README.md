# Codex

Codex CLI currently does not expose a project-level user prompt submission hook suitable for recording every interactive user message.

Use the wrapper command to record the initial prompt passed on the command line:

```sh
/ABSOLUTE/PATH/TO/ai-instruction-logger/bin/codex-with-instruction-log.sh "开发一个新功能"
```

The wrapper writes to the current project's default evidence file unless `INSTRUCTION_LOG_FILE` is set.
