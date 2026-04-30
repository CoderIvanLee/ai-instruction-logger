import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const TOOL_ORDER = ["claude-code", "opencode", "codex", "kimi-cli"]
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const GITHUB_NPX_SPEC = "github:CoderIvanLee/ai-instruction-logger"

export async function installIntegrations({
  projectRoot = process.cwd(),
  loggerRoot = ROOT,
  tools = ["all"],
  platform = process.platform,
  homeDir = os.homedir(),
} = {}) {
  const normalizedProjectRoot = path.resolve(projectRoot)
  const normalizedLoggerRoot = path.resolve(loggerRoot)
  const requested = expandTools(tools)
  const installed = []

  for (const tool of requested) {
    if (tool === "claude-code") {
      await installClaudeCode(normalizedProjectRoot, normalizedLoggerRoot)
    } else if (tool === "opencode") {
      await installOpencode(normalizedProjectRoot, normalizedLoggerRoot)
    } else if (tool === "codex") {
      await installCodex(normalizedProjectRoot, normalizedLoggerRoot, platform)
    } else if (tool === "kimi-cli" || tool === "kimi") {
      await installKimiCli(normalizedLoggerRoot, homeDir)
    } else {
      throw new Error(`Unsupported tool: ${tool}`)
    }
    installed.push(tool === "kimi" ? "kimi-cli" : tool)
  }

  return { projectRoot: normalizedProjectRoot, loggerRoot: normalizedLoggerRoot, installed }
}

function expandTools(tools) {
  const requested = tools.length ? tools : ["all"]
  if (requested.includes("all")) return TOOL_ORDER

  return [...new Set(requested)]
}

async function installClaudeCode(projectRoot, loggerRoot) {
  const settingsPath = path.join(projectRoot, ".claude", "settings.json")
  const settings = await readJson(settingsPath, {})
  const command = [
    loggerCommand(loggerRoot),
    "--source claude-code",
    "--project-root",
    quoteArg(projectRoot),
  ].join(" ")

  settings.hooks = settings.hooks || {}
  settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit || []

  const hookGroup = settings.hooks.UserPromptSubmit[0] || { hooks: [] }
  hookGroup.hooks = hookGroup.hooks || []

  const alreadyInstalled = hookGroup.hooks.some((hook) =>
    typeof hook.command === "string" && hook.command.includes("ai-instruction-logger.mjs"),
  )

  if (!alreadyInstalled) {
    hookGroup.hooks.push({ type: "command", command })
  }

  if (!settings.hooks.UserPromptSubmit.length) {
    settings.hooks.UserPromptSubmit.push(hookGroup)
  } else {
    settings.hooks.UserPromptSubmit[0] = hookGroup
  }

  await writeJson(settingsPath, settings)
}

async function installOpencode(projectRoot, loggerRoot) {
  const configPath = path.join(projectRoot, "opencode.json")
  const config = await readJson(configPath, {})
  const pluginPath = path.join(loggerRoot, "integrations", "opencode", "instruction-logger.js")

  config.plugin = normalizePluginList(config.plugin)
  if (!config.plugin.includes(pluginPath)) {
    config.plugin.push(pluginPath)
  }

  await writeJson(configPath, config)
}

async function installCodex(projectRoot, loggerRoot, platform) {
  void platform

  const codexDir = path.join(projectRoot, ".codex")
  const hooksPath = path.join(codexDir, "hooks.json")
  const configPath = path.join(codexDir, "config.toml")
  const hooks = await readJson(hooksPath, {})
  const command = [
    loggerCommand(loggerRoot),
    "--source codex",
    "--project-root",
    quoteArg(projectRoot),
  ].join(" ")

  hooks.hooks = hooks.hooks || {}
  hooks.hooks.UserPromptSubmit = hooks.hooks.UserPromptSubmit || []

  const hookGroup = hooks.hooks.UserPromptSubmit[0] || { hooks: [] }
  hookGroup.hooks = hookGroup.hooks || []

  const alreadyInstalled = hookGroup.hooks.some((hook) =>
    typeof hook.command === "string" && hook.command.includes("ai-instruction-logger"),
  )

  if (!alreadyInstalled) {
    hookGroup.hooks.push({ type: "command", command })
  }

  if (!hooks.hooks.UserPromptSubmit.length) {
    hooks.hooks.UserPromptSubmit.push(hookGroup)
  } else {
    hooks.hooks.UserPromptSubmit[0] = hookGroup
  }

  await writeJson(hooksPath, hooks)
  await enableCodexHooksFeature(configPath)
}

async function installKimiCli(loggerRoot, homeDir) {
  const configPath = path.join(homeDir, ".kimi", "config.toml")
  const command = [
    loggerCommand(loggerRoot),
    "--source kimi-cli",
  ].join(" ")

  await appendKimiHook(configPath, command)
}

function normalizePluginList(plugin) {
  if (!plugin) return []
  if (Array.isArray(plugin)) return plugin
  return [plugin]
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"))
  } catch (error) {
    if (error.code === "ENOENT") return fallback
    throw error
  }
}

async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8")
}

async function exists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function quoteArg(value) {
  return JSON.stringify(value)
}

function loggerCommand(loggerRoot) {
  if (isNpxCacheInstall(loggerRoot)) {
    return `npx --yes ${GITHUB_NPX_SPEC}`
  }

  return `node ${quoteArg(path.join(loggerRoot, "bin", "ai-instruction-logger.mjs"))}`
}

function isNpxCacheInstall(loggerRoot) {
  return loggerRoot.includes(`${path.sep}_npx${path.sep}`)
}

async function enableCodexHooksFeature(configPath) {
  let config = ""
  const existed = await exists(configPath)

  if (existed) {
    config = await readFile(configPath, "utf8")
  }

  const nextConfig = setTomlFeature(config, "codex_hooks", "true")
  await mkdir(path.dirname(configPath), { recursive: true })
  await writeFile(configPath, nextConfig, "utf8")
}

async function appendKimiHook(configPath, command) {
  let config = ""
  const existed = await exists(configPath)

  if (existed) {
    config = await readFile(configPath, "utf8")
  }

  if (config.includes("ai-instruction-logger") && config.includes("UserPromptSubmit")) {
    return
  }

  const block = [
    "[[hooks]]",
    'event = "UserPromptSubmit"',
    `command = ${quoteArg(command)}`,
    "",
  ].join("\n")

  const nextConfig = `${config.trimEnd()}${config.trim() ? "\n\n" : ""}${block}`
  await mkdir(path.dirname(configPath), { recursive: true })
  await writeFile(configPath, nextConfig, "utf8")
}

function setTomlFeature(config, key, value) {
  const assignment = `${key} = ${value}`
  const existingKey = new RegExp(`^${escapeRegExp(key)}\\s*=.*$`, "m")
  if (existingKey.test(config)) {
    return ensureTrailingNewline(config.replace(existingKey, assignment))
  }

  const featuresHeader = /^\[features\]\s*$/m
  if (featuresHeader.test(config)) {
    return ensureTrailingNewline(config.replace(featuresHeader, `[features]\n${assignment}`))
  }

  const separator = config.trim() ? "\n\n" : ""
  return ensureTrailingNewline(`${config.trimEnd()}${separator}[features]\n${assignment}`)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function ensureTrailingNewline(value) {
  return value.endsWith("\n") ? value : `${value}\n`
}
