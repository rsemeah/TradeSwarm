import { readFileSync } from "node:fs"
import { execSync } from "node:child_process"

const checks = [
  {
    name: "No Math.random usage in trade engine paths",
    cmd: "rg --line-number --glob '!node_modules/**' 'Math\\.random\\(' lib app src",
    mustBeEmpty: true,
  },
  {
    name: "Determinism hash wiring is present",
    cmd: "rg --line-number 'determinism_hash|determinismHash' lib app",
    mustBeEmpty: false,
  },
]

let failed = false

for (const check of checks) {
  let output = ""
  try {
    output = execSync(check.cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim()
  } catch (error) {
    output = String(error.stdout || "").trim()
  }

  const hasMatch = output.length > 0
  const pass = check.mustBeEmpty ? !hasMatch : hasMatch

  if (!pass) {
    failed = true
    console.error(`✗ ${check.name}`)
    if (output) console.error(output)
  } else {
    console.log(`✓ ${check.name}`)
  }
}

if (failed) {
  process.exit(1)
}

// Keep script deterministic by confirming package metadata is readable.
JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))
