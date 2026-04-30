import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import { promisify } from "node:util"

import { installIntegrations } from "../src/installer.mjs"

const execFileAsync = promisify(execFile)

test("install all writes project-level configs and codex hooks", async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "instruction-install-"))
  const homeDir = await mkdtemp(path.join(tmpdir(), "instruction-home-"))
  const loggerRoot = path.resolve(".")

  try {
    const result = await installIntegrations({
      projectRoot,
      loggerRoot,
      tools: ["all"],
      platform: "linux",
      homeDir,
    })

    assert.deepEqual(result.installed, ["claude-code", "opencode", "codex", "kimi-cli"])

    const claude = JSON.parse(await readFile(path.join(projectRoot, ".claude", "settings.json"), "utf8"))
    const command = claude.hooks.UserPromptSubmit[0].hooks[0].command
    assert.match(command, /ai-instruction-logger\.mjs/)
    assert.match(command, /--source claude-code/)

    const opencode = JSON.parse(await readFile(path.join(projectRoot, "opencode.json"), "utf8"))
    assert.deepEqual(opencode.plugin, [
      path.join(loggerRoot, "integrations", "opencode", "instruction-logger.js"),
    ])

    const codexHooks = JSON.parse(await readFile(path.join(projectRoot, ".codex", "hooks.json"), "utf8"))
    const codexCommand = codexHooks.hooks.UserPromptSubmit[0].hooks[0].command
    assert.match(codexCommand, /--source codex/)
    assert.match(codexCommand, /--project-root/)

    const codexConfig = await readFile(path.join(projectRoot, ".codex", "config.toml"), "utf8")
    assert.match(codexConfig, /\[features\]/)
    assert.match(codexConfig, /codex_hooks = true/)

    const kimiConfig = await readFile(path.join(homeDir, ".kimi", "config.toml"), "utf8")
    assert.match(kimiConfig, /event = "UserPromptSubmit"/)
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
    await rm(homeDir, { recursive: true, force: true })
  }
})

test("installer preserves existing opencode plugins and reports backups", async () => {
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

    const result = await installIntegrations({
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

    assert.deepEqual(result.backups, [`${opencodePath}.bak`])
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

test("npx cache installs generate durable github npx hook commands", async () => {
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

    const codexHooks = await readFile(path.join(projectRoot, ".codex", "hooks.json"), "utf8")
    assert.match(codexHooks, /npx --yes github:CoderIvanLee\/ai-instruction-logger/)
    assert.doesNotMatch(codexHooks, /node_modules\/ai-instruction-logger/)
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})

test("codex installer enables hooks in an existing features table", async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "instruction-install-"))
  const configPath = path.join(projectRoot, ".codex", "config.toml")

  try {
    await mkdir(path.dirname(configPath), { recursive: true })
    await writeFile(configPath, "[features]\nfast_mode = true\n", "utf8")

    const result = await installIntegrations({
      projectRoot,
      loggerRoot: path.resolve("."),
      tools: ["codex"],
    })

    const config = await readFile(configPath, "utf8")
    assert.match(config, /\[features\]\ncodex_hooks = true\nfast_mode = true/)

    assert.deepEqual(result.backups, [`${configPath}.bak`])
    const backup = await readFile(`${configPath}.bak`, "utf8")
    assert.match(backup, /fast_mode = true/)
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})

test("kimi-cli installer writes a UserPromptSubmit hook to the kimi config", async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "instruction-install-"))
  const homeDir = await mkdtemp(path.join(tmpdir(), "instruction-home-"))

  try {
    const result = await installIntegrations({
      projectRoot,
      loggerRoot: path.resolve("."),
      tools: ["kimi-cli"],
      homeDir,
    })

    assert.deepEqual(result.installed, ["kimi-cli"])

    const config = await readFile(path.join(homeDir, ".kimi", "config.toml"), "utf8")
    assert.match(config, /\[\[hooks\]\]/)
    assert.match(config, /event = "UserPromptSubmit"/)
    assert.match(config, /--source kimi-cli/)
    assert.doesNotMatch(config, /--project-root/)
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
    await rm(homeDir, { recursive: true, force: true })
  }
})

test("kimi-cli installer preserves existing config and reports a backup", async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "instruction-install-"))
  const homeDir = await mkdtemp(path.join(tmpdir(), "instruction-home-"))
  const configPath = path.join(homeDir, ".kimi", "config.toml")

  try {
    await mkdir(path.dirname(configPath), { recursive: true })
    await writeFile(configPath, "model = \"kimi-k2\"\n", "utf8")

    const result = await installIntegrations({
      projectRoot,
      loggerRoot: path.resolve("."),
      tools: ["kimi-cli"],
      homeDir,
    })

    const config = await readFile(configPath, "utf8")
    assert.match(config, /model = "kimi-k2"/)
    assert.match(config, /event = "UserPromptSubmit"/)

    assert.deepEqual(result.backups, [`${configPath}.bak`])
    const backup = await readFile(`${configPath}.bak`, "utf8")
    assert.match(backup, /model = "kimi-k2"/)
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
    await rm(homeDir, { recursive: true, force: true })
  }
})

test("installer does not create a backup when config content is unchanged", async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "instruction-install-"))
  const loggerRoot = path.resolve(".")

  try {
    const first = await installIntegrations({
      projectRoot,
      loggerRoot,
      tools: ["codex"],
    })
    const second = await installIntegrations({
      projectRoot,
      loggerRoot,
      tools: ["codex"],
    })

    assert.deepEqual(first.backups, [])
    assert.deepEqual(second.backups, [])
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})

test("cli install output lists backup files", async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "instruction-install-"))
  const opencodePath = path.join(projectRoot, "opencode.json")

  try {
    await writeFile(opencodePath, JSON.stringify({ plugin: ["existing-plugin"] }, null, 2), "utf8")

    const { stdout } = await execFileAsync("node", [
      "bin/ai-instruction-logger.mjs",
      "install",
      "opencode",
      "--project-root",
      projectRoot,
    ])

    assert.match(stdout, /Backups:/)
    assert.match(stdout, /opencode\.json\.bak/)
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})
