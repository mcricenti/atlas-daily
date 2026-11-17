/**
 * Records the tour narration in your MiniMax voice.
 *
 * Setup (once): create a file called .env.local in the project folder with
 *   MINIMAX_API_KEY=your-api-key
 *   MINIMAX_VOICE_ID=your-voice-id
 * (.env.local is never uploaded to GitHub.)
 *
 * Then, in the terminal:
 *   npm run voice                 how many lines are missing and roughly what they will cost
 *   npm run voice -- --voices     list the voice IDs your API key can use
 *   npm run voice -- --clone my-voice.mp3 dadvoice01
 *                                 make a voice from a 10 s–5 min recording of you reading
 *                                 (mp3/m4a/wav); then set MINIMAX_VOICE_ID=dadvoice01
 *   npm run voice -- --sample     record 3 lines so you can listen first
 *   npm run voice -- --go         record every missing line
 *
 * Clips go to public/voice/<key>.mp3 and are listed in public/voice/manifest.json.
 * Running it again only records lines that are new or changed.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FACTS } from '../src/data/curriculum'
import { buildAtlas, centerLonFor, isUsFact } from '../src/lib/geoData'
import { narrationLines, tourContextFor } from '../src/lib/tour'
import { speakableText, voiceKey } from '../src/lib/voiceKey'

const root = fileURLToPath(new URL('..', import.meta.url))
const voiceDir = join(root, 'public', 'voice')
const args = new Set(process.argv.slice(2))

// ── Settings ─────────────────────────────────────────────────────

function readEnvFile() {
  const file = join(root, '.env.local')
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
readEnvFile()

const API_KEY = process.env.MINIMAX_API_KEY ?? ''
const VOICE_ID = process.env.MINIMAX_VOICE_ID ?? ''
const HOST = process.env.MINIMAX_API_HOST ?? 'https://api.minimax.io'
const MODEL = process.env.MINIMAX_MODEL ?? 'speech-2.8-turbo'
/** Approximate published price per million characters (USD), for the estimate only. */
const PRICE_PER_M = MODEL.includes('hd') ? 100 : 60

// ── Lines to record ──────────────────────────────────────────────

function allLines(): string[] {
  const read = (p: string) => JSON.parse(readFileSync(join(root, p), 'utf8'))
  const topo = { us: read('public/geo/states-10m.json'), world: read('public/geo/countries-50m.json') }
  const lines = new Set<string>()
  for (const fact of FACTS) {
    const kind = isUsFact(fact) ? 'us' : 'world'
    const atlas = buildAtlas(topo[kind], kind, centerLonFor(fact))
    for (const line of narrationLines(fact, tourContextFor(atlas, fact))) lines.add(line)
  }
  return [...lines]
}

function existingClips(): Set<string> {
  if (!existsSync(voiceDir)) return new Set()
  return new Set(
    readdirSync(voiceDir)
      .filter((f) => f.endsWith('.mp3'))
      .map((f) => f.replace(/\.mp3$/, '')),
  )
}

function writeManifest(lines: string[]) {
  const have = existingClips()
  const clips = lines.map(voiceKey).filter((k) => have.has(k))
  mkdirSync(voiceDir, { recursive: true })
  writeFileSync(
    join(voiceDir, 'manifest.json'),
    JSON.stringify({ voice: VOICE_ID, model: MODEL, clips }, null, 0) + '\n',
  )
  return clips.length
}

// ── MiniMax API ──────────────────────────────────────────────────

async function api(path: string, body: unknown) {
  const res = await fetch(`${HOST}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => null)) as any
  if (!res.ok || !json) throw new Error(`HTTP ${res.status} from ${path}`)
  const code = json.base_resp?.status_code ?? 0
  if (code !== 0) {
    const err = new Error(`MiniMax error ${code}: ${json.base_resp?.status_msg ?? 'unknown'}`)
    ;(err as any).code = code
    throw err
  }
  return json
}

async function record(text: string): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    try {
      const json = await api('/v1/t2a_v2', {
        model: MODEL,
        text: speakableText(text),
        stream: false,
        voice_setting: { voice_id: VOICE_ID, speed: 0.95, vol: 1, pitch: 0 },
        audio_setting: { format: 'mp3', sample_rate: 32000, bitrate: 64000, channel: 1 },
      })
      const hex = json.data?.audio
      if (!hex) throw new Error('No audio in the response')
      return Buffer.from(hex, 'hex')
    } catch (e: any) {
      const rateLimited = e.code === 1002 || e.code === 1039
      if (attempt >= 4 || !(rateLimited || /HTTP 5|timeout/i.test(e.message))) throw e
      const wait = rateLimited ? 15000 * attempt : 3000 * attempt
      console.log(`  …waiting ${wait / 1000}s and trying again (${e.message})`)
      await new Promise((r) => setTimeout(r, wait))
    }
  }
}

async function cloneVoice(file: string, voiceId: string) {
  const form = new FormData()
  form.append('purpose', 'voice_clone')
  form.append('file', new Blob([readFileSync(file)]), file.split(/[\\/]/).pop())
  const res = await fetch(`${HOST}/v1/files/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: form,
  })
  const up = (await res.json().catch(() => null)) as any
  const fileId = up?.file?.file_id
  if (!fileId) throw new Error(`Upload failed: ${up?.base_resp?.status_msg ?? `HTTP ${res.status}`}`)
  await api('/v1/voice_clone', { file_id: fileId, voice_id: voiceId })
  console.log(`Voice "${voiceId}" created.`)
  console.log(`Add this line to .env.local:  MINIMAX_VOICE_ID=${voiceId}`)
  console.log('Then run: npm run voice -- --sample   (MiniMax deletes a new voice if it is not used within 7 days.)')
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  const lines = allLines()
  const have = existingClips()
  const missing = lines.filter((l) => !have.has(voiceKey(l)))
  const chars = missing.reduce((n, l) => n + speakableText(l).length, 0)

  console.log(`Narration lines: ${lines.length}   already recorded: ${lines.length - missing.length}   missing: ${missing.length}`)
  console.log(
    `Missing text: ${chars.toLocaleString()} characters ≈ $${((chars / 1e6) * PRICE_PER_M).toFixed(2)} with ${MODEL} (estimate; check your MiniMax plan)`,
  )

  const cloneAt = process.argv.indexOf('--clone')
  if (cloneAt > 0) {
    if (!API_KEY) throw new Error('MINIMAX_API_KEY is missing. Put it in .env.local (see the top of this file).')
    const file = process.argv[cloneAt + 1]
    const voiceId = process.argv[cloneAt + 2]
    if (!file || !voiceId || !/^[A-Za-z][A-Za-z0-9_-]{7,}$/.test(voiceId)) {
      throw new Error('Usage: npm run voice -- --clone recording.mp3 myvoice01  (ID: 8+ letters/numbers, starting with a letter)')
    }
    await cloneVoice(file, voiceId)
    return
  }

  const wantsApi = args.has('--go') || args.has('--sample') || args.has('--voices')
  if (!wantsApi) {
    console.log('\nNothing recorded. Add --sample to try 3 lines, or --go to record everything missing.')
    writeManifest(lines)
    return
  }
  if (!API_KEY) throw new Error('MINIMAX_API_KEY is missing. Put it in .env.local (see the top of this file).')

  if (args.has('--voices')) {
    const json = await api('/v1/get_voice', { voice_type: 'all' })
    const groups = ['voice_cloning', 'voice_generation', 'system_voice'] as const
    for (const g of groups) {
      const list = (json[g] ?? []) as { voice_id: string; voice_name?: string }[]
      if (!list.length) continue
      console.log(`\n${g.replace('_', ' ')}:`)
      for (const v of list.slice(0, g === 'system_voice' ? 8 : 100)) {
        console.log(`  ${v.voice_id}${v.voice_name ? `  (${v.voice_name})` : ''}`)
      }
      if (g === 'system_voice' && list.length > 8) console.log(`  …and ${list.length - 8} more built-in voices`)
    }
    return
  }

  if (!VOICE_ID) throw new Error('MINIMAX_VOICE_ID is missing. Run with --voices to see your voice IDs.')
  const todo = args.has('--sample') ? missing.slice(0, 3) : missing
  mkdirSync(voiceDir, { recursive: true })
  let done = 0
  for (const line of todo) {
    const key = voiceKey(line)
    const audio = await record(line)
    writeFileSync(join(voiceDir, `${key}.mp3`), audio)
    done++
    if (args.has('--sample')) console.log(`  saved public/voice/${key}.mp3  "${line}"`)
    else if (done % 25 === 0 || done === todo.length) {
      console.log(`  ${done}/${todo.length} recorded`)
      writeManifest(lines)
    }
  }
  const total = writeManifest(lines)
  console.log(`\nDone. ${total} of ${lines.length} lines now use your voice.`)
  if (args.has('--sample')) console.log('Open the files above to listen. If you like them, run: npm run voice -- --go')
  else console.log('Next: commit and push (or ask Claude to), and the site will use your voice.')
}

main().catch((e) => {
  console.error(`\n${e.message}`)
  process.exit(1)
})
