# Narration & captions

Local, deterministic, English-by-default: Kokoro for voice, Whisper for
word-level timing, a small grouping pass for readable captions. No cloud TTS, no
API keys.

## Write VO, not docs

Narration tracks the picture. You are talking a viewer through what they see —
not reading the README aloud.

❌ Doc voice (this is a description, not a script):
```
WalDrive is a desktop drive for data your agents store on Walrus. Files are
content-addressed and metadata lives on Sui.
```

✅ VO voice (you're narrating the screen):
```
Your agents generate real files now. But where do they live? On someone's
server, behind someone's login. WalDrive puts them on Walrus — owned by you,
verifiable by anyone. Watch: drag a file in, and it's stored.
```

Rules of thumb:
- One `assets/narration/NN-*.txt` per scene. The filename stem (`04-verify`)
  keys the captions back to the scene.
- Short sentences. Each becomes its own caption beat.
- Say the UI labels you click ("hit **Verify**", "open **History**") so the
  voice and the picture reinforce each other.
- Name the payoff out loud ("a live SHA-256", "the balance jumps to ten").

## Timing

| Speed | Words/sec | 100 words |
|---|---|---|
| normal (`1.0`) | ~2.5 en wps | ~40s |
| calm (`0.95`) | ~2.3 en wps | ~43s |

A 60–90s short demo is ~150–230 English words; a 4–5 min hackathon cut is
~700–1000. Keep each scene's VO a touch shorter than its clip — pad the clip
with a held frame, never let the voice run past the picture.

## TTS — `scripts/tts.sh`

Regenerates every `assets/narration/*.txt` → `*.wav` with Kokoro:

```bash
export PATH="$(pwd)/.ttsvenv/bin:$PATH"   # the kokoro-onnx venv
VOICE=af_nova SPEED=0.95 bash scripts/tts.sh
```

- **Voice:** `af_nova` — warm, neutral, product-demo. Override with `VOICE=`.
- **Speed:** `0.95` — slightly slow for clarity. Override with `SPEED=`.
- Under the hood: `npx hyperframes tts <txt> --voice … --speed … --output <wav>`.

## Transcribe — `scripts/transcribe.sh`

Word-level timestamps for caption sync. English audio → `small.en` is correct:

```bash
bash scripts/transcribe.sh   # *.wav → *.transcript.json (renamed per scene)
```

`hyperframes transcribe` always writes `transcript.json`; the script renames it
to `<scene>.transcript.json` after each run.

## Captions — `scripts/build-captions.mjs`

Turns the per-scene transcripts into readable caption groups:

```bash
node scripts/build-captions.mjs   # → captions.js (window.__captions) + captions.json
```

What it does:
1. **Word merges (`WORD_FIX`)** — applied to the raw token array *before*
   grouping, so a brand name Whisper splits across two tokens (and thus across a
   group boundary) collapses into one token first.
2. **Grouping** — words into phrases of `MIN_WORDS`–`MAX_WORDS`, with a new group
   forced on sentence end or a pause longer than `PAUSE` seconds. Tune
   `MAX_WORDS` (default 6) for shorter/longer captions.
3. **Phrase fixes (`PHRASE_FIX`)** — regex replacements on each final grouped
   string: brand-name spelling, casing, UI-label capitalization.

`captions.js` is loaded synchronously by the composition before the timeline
script, so caption data is available at build time without an async fetch.

### Configure for your project

`PHRASE_FIX` / `WORD_FIX` at the top of `build-captions.mjs` ship empty with
commented examples. Whisper *will* mis-hear your brand the first time. Workflow:
run the pipeline, read the captions, add a fix for each wrong word, re-run
`build-captions.mjs` (no need to re-transcribe). Examples:

```js
const PHRASE_FIX = [
  [/\bWhile drive\b/gi, "WalDrive"],     // a brand heard as two words
  [/\bSUI\b/g, "Sui"],                   // force brand casing
  [/\b(h)it verify\b/gi, "$1it Verify"], // capitalize a UI label you say aloud
];
const WORD_FIX = [
  [["while", "drive"], "WalDrive"],      // merge a split brand before grouping
];
```
