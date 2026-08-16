/**
 * Install the bundled butler-memory skill into the DSH user skill root
 * (~/.dsh/skills), where the filesystem skill provider discovers it in every
 * profile and project. Idempotent: an existing copy is replaced with the
 * packaged version so upgrades stay in sync.
 *
 * Run manually with `npm run install-skill` (or let pnpm/npm invoke the
 * postinstall script during `dsh plugin add`).
 */
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const packageRoot = dirname(fileURLToPath(import.meta.url))
const source = join(packageRoot, 'skills', 'butler-memory', 'SKILL.md')
const targetDir = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'skills', 'butler-memory')
const target = join(targetDir, 'SKILL.md')

mkdirSync(targetDir, { recursive: true })
copyFileSync(source, target)

const probe = readFileSync(target, 'utf8')
if (!probe.includes('name: butler-memory')) {
  throw new Error(`installed skill looks wrong: ${target}`)
}
console.log(`butler-memory skill installed at ${target}`)
