/**
 * Builds the browser bundle consumed by the DSH client-module table.
 * Output: client/dist/client.js (referenced by package.json exports["./client"]).
 *
 * Run `npm run build` BEFORE `dsh plugin add` — the activation scan fails
 * loud when a package declares dsh.client but its bundle is missing.
 *
 * VERIFY-STEP: if the DSH client kernel does not provide React as a page
 * builtin, remove 'react'/'react/jsx-runtime' from `external` so esbuild
 * bundles React into client.js instead.
 */
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'

mkdirSync('client/dist', { recursive: true })

await build({
  entryPoints: ['client/src/index.tsx'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  outfile: 'client/dist/client.js',
  external: ['react', 'react/jsx-runtime'],
  sourcemap: false,
  logLevel: 'info',
})
