#!/usr/bin/env node

import { appendFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { installIntegrations } from "./installer.mjs"

const DEFAULT_RELATIVE_FILE = path.join("docs", "copyright-evidence", "instructions.md")

export function defaultInstructionFile(projectRoot = process.cwd()) {
  return path.join(projectRoot, DEFAULT_RELATIVE_FILE)
}

export function extractInstruction(input) {
  if (!input) return ""
  if (typeof input === "string") return input.trim()

  const direct = input.prompt ?? input.message ?? input.text ?? input.instruction
  if (typeof direct === "string") return direct.trim()

  if (Array.isArray(input.parts)) {
    return input.parts
      .filter((part) => part?.type === "text" && typeof part.text === "string")
      .map((part) => part.text.trim())
      .filter(Boolean)
      .join("\n")
  }

  return ""
}

export async function recordInstruction({
  projectRoot = process.cwd(),
  source = "unknown",
  instruction,
  outputFile = process.env.INSTRUCTION_LOG_FILE,
  now = new Date(),
} = {}) {
  const text = extractInstruction(instruction)
  if (!text) return null

  const target = path.resolve(projectRoot, outputFile || defaultInstructionFile(projectRoot))
  const timestamp = formatTimestamp(now)
  const normalized = text.replace(/\r\n/g, "\n").trim()

  await mkdir(path.dirname(target), { recursive: true })
  await appendFile(target, `${timestamp} [${source}] ${normalized}\n`, "utf8")

  return target
}

function formatTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0")
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + " " + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join(":")
}

async function readStdin() {
  if (process.stdin.isTTY) return ""
  process.stdin.setEncoding("utf8")
  let data = ""

  for await (const chunk of process.stdin) {
    data += chunk
  }

  return data
}

function parseArgs(argv) {
  const options = {
    source: "manual",
    projectRoot: undefined,
    message: "",
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--source") {
      options.source = argv[++i] || options.source
    } else if (arg === "--project-root") {
      options.projectRoot = argv[++i] || options.projectRoot
    } else if (arg === "--output-file") {
      options.outputFile = argv[++i]
    } else if (arg === "--message") {
      options.message = argv[++i] || ""
    } else {
      options.message = [options.message, arg].filter(Boolean).join(" ")
    }
  }

  return options
}

export async function runCli(argv = process.argv.slice(2)) {
  if (argv[0] === "install") {
    const { tools, projectRoot } = parseInstallArgs(argv.slice(1))
    const result = await installIntegrations({ tools, projectRoot })
    console.log(`Installed: ${result.installed.join(", ")}`)
    console.log(`Project: ${result.projectRoot}`)
    return
  }

  const options = parseArgs(argv)
  let instruction = options.message
  let payload = null

  const stdin = instruction ? "" : await readStdin()
  if (!instruction && stdin.trim()) {
    try {
      payload = JSON.parse(stdin)
      instruction = extractInstruction(payload)
    } catch {
      instruction = stdin
    }
  }

  await recordInstruction({
    projectRoot: options.projectRoot || payload?.cwd || process.cwd(),
    source: options.source,
    instruction,
    outputFile: options.outputFile,
  })
}

function parseInstallArgs(argv) {
  const tools = []
  let projectRoot = process.cwd()

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--project-root") {
      projectRoot = argv[++i] || projectRoot
    } else {
      tools.push(arg)
    }
  }

  return { tools: tools.length ? tools : ["all"], projectRoot }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : ""
if (invokedPath === fileURLToPath(import.meta.url)) {
  runCli().catch((error) => {
    console.error(`[instruction-logger] ${error.message}`)
    process.exitCode = 1
  })
}
