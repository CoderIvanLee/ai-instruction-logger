#!/usr/bin/env node

import { runCli } from "../src/instruction-logger.mjs"

runCli().catch((error) => {
  console.error(`[instruction-logger] ${error.message}`)
  process.exitCode = 1
})
