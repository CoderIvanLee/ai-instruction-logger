import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { mkdtemp, readFile, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import { promisify } from "node:util"

import { installIntegrations } from "../src/installer.mjs"

const execFileAsync = promisify(execFile)

test("install all writes project-level configs and codex wrappers", async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "instruction-install-"))
  const loggerRoot = path.resolve(".")

  try {
    const result = await installIntegrations({
      projectRoot,
      loggerRoot,
      tools: ["all"],
      platform: "linux",
    })

    assert.deepEqual(result.installed, ["claude-code", "opencode", "codex"])

    const claude = JSON.parse(await readFile(path.join(projectRoot, ".claude", "settings.json"), "utf8"))
    const command = claude.hooks.UserPromptSubmit[0].hooks[0].command
    assert.match(command, /ai-instruction-logger\.mjs/)
    assert.match(command, /--source claude-code/)

    const opencode = JSON.parse(await readFile(path.join(projectRoot, "opencode.json"), "utf8"))
    assert.deepEqual(opencode.plugin, [
      path.join(loggerRoot, "integrations", "opencode", "instruction-logger.js"),
    ])

    const unixWrapper = await readFile(path.join(projectRoot, ".ai-instruction-logger", "codex"), "utf8")
    assert.match(unixWrapper, /exec codex "\$@"/)
    assert.match(unixWrapper, /--source codex/)

    const windowsWrapper = await readFile(path.join(projectRoot, ".ai-instruction-logger", "codex.cmd"), "utf8")
    assert.match(windowsWrapper, /@echo off/)
    assert.match(windowsWrapper, /--source codex/)

    const mode = (await stat(path.join(projectRoot, ".ai-instruction-logger", "codex"))).mode
    assert.equal(Boolean(mode & 0o111), true)
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})

test("installer preserves existing opencode plugins and creates backups", async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "instruction-install-"))
  const loggerRoot = path.resolve(".")
  const opencodePath = path.join(projectRoot, "opencode.json")

  try {
    await execFileAsync("node", [
      "-e",
      `
        const fs = require("node:fs");
        fs.writeFileSync(${JSON.stringify(opencodePath)}, JSON.stringify({ plugin: ["existing-plugin"] }, null, 2));
      `,
    ])

    await installIntegrations({
      projectRoot,
      loggerRoot,
      tools: ["opencode"],
      platform: "win32",
    })

    const opencode = JSON.parse(await readFile(opencodePath, "utf8"))
    assert.deepEqual(opencode.plugin, [
      "existing-plugin",
      path.join(loggerRoot, "integrations", "opencode", "instruction-logger.js"),
    ])

    const backup = await readFile(`${opencodePath}.bak`, "utf8")
    assert.match(backup, /existing-plugin/)
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})

test("cli install command targets the requested project root", async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "instruction-install-"))

  try {
    await execFileAsync("node", [
      "bin/ai-instruction-logger.mjs",
      "install",
      "claude-code",
      "--project-root",
      projectRoot,
    ])

    const claude = await readFile(path.join(projectRoot, ".claude", "settings.json"), "utf8")
    assert.match(claude, /UserPromptSubmit/)
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})

test("npx cache installs generate durable github npx wrappers", async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "instruction-install-"))
  const loggerRoot = path.join(tmpdir(), "_npx", "abc", "node_modules", "ai-instruction-logger")

  try {
    await installIntegrations({
      projectRoot,
      loggerRoot,
      tools: ["claude-code", "codex"],
      platform: "linux",
    })

    const claude = await readFile(path.join(projectRoot, ".claude", "settings.json"), "utf8")
    assert.match(claude, /npx --yes github:CoderIvanLee\/ai-instruction-logger/)

    const unixWrapper = await readFile(path.join(projectRoot, ".ai-instruction-logger", "codex"), "utf8")
    assert.match(unixWrapper, /npx --yes github:CoderIvanLee\/ai-instruction-logger/)
    assert.doesNotMatch(unixWrapper, /node_modules\/ai-instruction-logger/)
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})
