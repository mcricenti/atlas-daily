import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const dist = join(process.cwd(), 'dist')
const redirects = join(dist, '_redirects')
const assetsIgnore = join(dist, '.assetsignore')

// Workers Assets SPA is handled by wrangler `assets.not_found_handling`.
// The Cloudflare Vite plugin still emits a Pages-style `_redirects` SPA rule,
// which conflicts on `wrangler deploy` / `--temporary` (infinite loop error).
if (existsSync(redirects)) {
  unlinkSync(redirects)
}

const ignoreLines = new Set(
  existsSync(assetsIgnore)
    ? readFileSync(assetsIgnore, 'utf8').split(/\r?\n/).filter(Boolean)
    : [],
)
ignoreLines.add('_redirects')
writeFileSync(assetsIgnore, `${[...ignoreLines].join('\n')}\n`)
