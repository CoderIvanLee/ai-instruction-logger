import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import { promisify } from "node:util"

import {
  defaultInstructionFile,
  extractInstruction,
  recordInstruction,
} from "../src/instruction-logger.mjs"

const execFileAsync = promisify(execFile)

test("records instructions to the default copyright evidence file", async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "instruction-log-"))

  try {
    const written = await recordInstruction({
      projectRoot,
      source: "test",
      instruction: "开发一个记录用户输入的 hook",
      now: new Date("2026-04-30T08:09:10"),
    })

    assert.equal(written, path.join(projectRoot, "docs", "copyright-evidence", "instructions.md"))
    assert.equal(defaultInstructionFile(projectRoot), written)

    const content = await readFile(written, "utf8")
    assert.equal(
      content,
      "2026-04-30 08:09:10 [test] 开发一个记录用户输入的 hook\n",
    )
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})

test("allows users to override the instruction log file", async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "instruction-log-"))
  const customFile = path.join(projectRoot, ".chat", "instruction.md")

  try {
    const written = await recordInstruction({
      projectRoot,
      source: "claude-code",
      instruction: "默认路径支持修改",
      outputFile: customFile,
      now: new Date("2026-04-30T08:09:10"),
    })

    assert.equal(written, customFile)
    const content = await readFile(customFile, "utf8")
    assert.equal(content, "2026-04-30 08:09:10 [claude-code] 默认路径支持修改\n")
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})

test("extracts instructions from common hook payload shapes", () => {
  assert.equal(extractInstruction({ prompt: "Claude prompt" }), "Claude prompt")
  assert.equal(extractInstruction({ message: "Codex wrapper prompt" }), "Codex wrapper prompt")
  assert.equal(
    extractInstruction({
      parts: [
        { type: "text", text: "first" },
        { type: "image", url: "ignored" },
        { type: "text", text: "second" },
      ],
    }),
    "first\nsecond",
  )
})

test("cli records direct message arguments", async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "instruction-log-"))

  try {
    await execFileAsync("node", [
      "bin/ai-instruction-logger.mjs",
      "--source",
      "cli",
      "--project-root",
      projectRoot,
      "--message",
      "验证默认记录",
    ])

    const content = await readFile(
      path.join(projectRoot, "docs", "copyright-evidence", "instructions.md"),
      "utf8",
    )

    assert.match(content, /\[cli\] 验证默认记录\n$/)
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})

test("cli uses hook payload cwd when project root is not specified", async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "instruction-log-"))

  try {
    await execFileAsync("sh", [
      "-c",
      `printf %s ${JSON.stringify(JSON.stringify({
        hook_event_name: "UserPromptSubmit",
        cwd: projectRoot,
        prompt: "在 Kimi 内部输入的指令",
      }))} | node bin/ai-instruction-logger.mjs --source kimi-cli`,
    ])

    const content = await readFile(
      path.join(projectRoot, "docs", "copyright-evidence", "instructions.md"),
      "utf8",
    )

    assert.match(content, /\[kimi-cli\] 在 Kimi 内部输入的指令\n$/)
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})
