/**
 * Builds the browser bundle consumed by the DSH client-module table.
 * Output: client/dist/client.js (referenced by package.json exports["./client"]).
 *
 * The bundle must follow the module-table contract used by every official
 * client package: register a CJS factory through
 * `window.__ModuleLoader__.load({ id, factory: (require) => ... })`; the
 * loader's `require` resolves seed modules such as `react` and
 * `react/jsx-runtime` from the page. esbuild emits the CJS body; the
 * banner/footer below wrap it. Format verified against
 * @deepseek-ai/dsh-client-ui-jobs/lib/client.js.
 *
 * Run `npm run build` BEFORE `dsh plugin add` — the activation scan fails
 * loud when a package declares dsh.client but its bundle is missing.
 */
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'

mkdirSync('client/dist', { recursive: true })

await build({
  entryPoints: ['client/src/index.tsx'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  outfile: 'client/dist/client.js',
  external: ['react', 'react/jsx-runtime', '@deepseek-ai/cordis'],
  banner: {
    js: 'window.__ModuleLoader__.load({ id: "dsh-butler-memory", factory: function (require) { var module = { exports: {} }; var exports = module.exports; Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });',
  },
  footer: {
    js: 'return module.exports; } });',
  },
  sourcemap: false,
  logLevel: 'info',
})
