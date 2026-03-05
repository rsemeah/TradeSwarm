#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

function findPagesUpwards(startDir, maxLevels = 8) {
  const results = []
  let dir = path.resolve(startDir)
  for (let i = 0; i < maxLevels; i++) {
    const candidate = path.join(dir, 'pages')
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      results.push(candidate)
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return results
}

function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (['node_modules', '.git', '.next', 'dist'].includes(e.name)) continue
      yield* walk(full)
    } else {
      yield full
    }
  }
}

function validateJsonFiles(root) {
  const errors = []
  for (const file of walk(root)) {
    if (!file.endsWith('.json')) continue
    try {
      const content = fs.readFileSync(file, 'utf8')
      JSON.parse(content)
    } catch (err) {
      errors.push({ file, error: err.message })
    }
  }
  return errors
}

function main() {
  const repoRoot = process.cwd()
  console.log('Repo root:', repoRoot)

  console.log('\nSearching for `pages` directories in parent paths (up to 8 levels)...')
  const pages = findPagesUpwards(repoRoot)
  if (pages.length === 0) {
    console.log('No `pages` directories found in ancestor paths.')
  } else {
    console.log('Found `pages` directories:')
    for (const p of pages) console.log(' -', p)
  }

  console.log('\nValidating JSON files under repo (skipping node_modules, .git, .next, dist)...')
  const jsonErrors = validateJsonFiles(repoRoot)
  if (jsonErrors.length === 0) {
    console.log('All JSON files are valid.')
  } else {
    console.log('JSON parse errors:')
    for (const e of jsonErrors) console.log(` - ${e.file}: ${e.error}`)
  }

  if (pages.length > 0 || jsonErrors.length > 0) process.exit(1)
  process.exit(0)
}

main()
