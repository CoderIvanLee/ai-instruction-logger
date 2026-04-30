import { access, chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const TOOL_ORDER = ["claude-code", "opencode", "codex"]
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const GITHUB_NPX_SPEC = "github:CoderIvanLee/ai-instruction-logger"

export async function installIntegrations({
  projectRoot = process.cwd(),
  loggerRoot = ROOT,
  tools = ["all"],
  platform = process.platform,
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
    } else {
      throw new Error(`Unsupported tool: ${tool}`)
    }
    installed.push(tool)
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

  await writeJsonWithBackup(settingsPath, settings)
}

async function installOpencode(projectRoot, loggerRoot) {
  const configPath = path.join(projectRoot, "opencode.json")
  const config = await readJson(configPath, {})
  const pluginPath = path.join(loggerRoot, "integrations", "opencode", "instruction-logger.js")

  config.plugin = normalizePluginList(config.plugin)
  if (!config.plugin.includes(pluginPath)) {
    config.plugin.push(pluginPath)
  }

  await writeJsonWithBackup(configPath, config)
}

async function installCodex(projectRoot, loggerRoot, platform) {
  const installDir = path.join(projectRoot, ".ai-instruction-logger")
  await mkdir(installDir, { recursive: true })

  const unixPath = path.join(installDir, "codex")
  const cmdPath = path.join(installDir, "codex.cmd")

  await writeFile(unixPath, unixCodexWrapper(loggerRoot), "utf8")
  await writeFile(cmdPath, windowsCodexWrapper(loggerRoot), "utf8")

  if (platform !== "win32") {
    await chmod(unixPath, 0o755)
  }
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

async function writeJsonWithBackup(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true })
  if (await exists(filePath)) {
    await copyFile(filePath, `${filePath}.bak`)
  }
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

function unixCodexWrapper(loggerRoot) {
  return `#!/usr/bin/env sh
set -eu

PROJECT_ROOT=\${PROJECT_ROOT:-$(pwd)}

if [ "$#" -gt 0 ]; then
  ${loggerCommand(loggerRoot)} \\
    --source codex \\
    --project-root "$PROJECT_ROOT" \\
    --message "$*"
fi

exec codex "$@"
`
}

function windowsCodexWrapper(loggerRoot) {
  return `@echo off
setlocal

if "%PROJECT_ROOT%"=="" set "PROJECT_ROOT=%CD%"

if not "%~1"=="" (
  ${loggerCommand(loggerRoot)} --source codex --project-root "%PROJECT_ROOT%" --message %*
)

codex %*
`
}
