---
name: demo-video-studio
description: >
  Produce a cinematic product/demo video from a live web app. Playwright records
  real on-screen interactions with a visible synthetic cursor; local Kokoro TTS
  narrates; Whisper builds word-synced captions; a HyperFrames HTML composition
  assembles the clips, voice, captions and a music bed into an MP4. Use when the
  user wants to make a demo video, product walkthrough, screen-recorded demo,
  hackathon submission video, launch clip, or "record my app with narration and
  captions". Outputs a single landscape MP4; a hackathon structure is built in as
  a template.
---

# Demo Video Studio

Turn a running web app into a polished demo film: **real recorded interaction**
(not slideshow, not mock) + **local TTS narration** + **word-synced captions** +
a quiet **music bed**, composed deterministically with
[HyperFrames](https://hyperframes.heygen.com).

## When to use

Making any demo / walkthrough / product / launch / hackathon video of a web app,
especially when it should show the real product running with narration and
captions. Records a deployed URL or a local dev server.

## Pipeline

```
① record    Playwright drives your live app, visible cursor → out/clips/*.webm
② narrate   write VO per scene → Kokoro TTS (local)         → narration/*.wav
③ transcribe Whisper word-level timestamps                  → *.transcript.json
④ caption   group into phrases + fix brand mishears         → captions.js
⑤ music     ffmpeg ambient bed (mixed low under the voice)  → music/bed.wav
⑥ compose   HyperFrames HTML one-timeline: clips+voice+captions+music → MP4
```

Recording and composing are independent: re-record one scene, or re-run
narration, without redoing the other. A code-generated GIF track (HTML scenes
rendered straight to MP4, no recording) is an optional side path for doc pages.

## Workflow

1. **Understand the product first.** Read its README / demo docs. Write a Demo
   Flow before touching the tools: problem → product walkthrough → evidence →
   conclusion. Pick the recommended click-path and the visible result each scene
   must reach. See [references/templates.md](references/templates.md).
2. **Record.** Copy `scripts/record.mjs`, set `APP` and `SIZE`, replace `scenes`
   with your choreography (glide → pause → act → hold). Record at 1:1 device
   scale. `node scripts/record.mjs [scene]`. Engine + worked example:
   [references/recording.md](references/recording.md).
3. **Narrate → caption.** Write one `assets/narration/NN-*.txt` per scene in VO
   voice (you're talking to a viewer, not reading a README). Then:
   `bash scripts/tts.sh && bash scripts/transcribe.sh && node scripts/build-captions.mjs`.
   Edit `PHRASE_FIX` in `build-captions.mjs` for your brand names. Guide:
   [references/narration-and-captions.md](references/narration-and-captions.md).
4. **Compose & render.** Assemble in one HyperFrames HTML timeline, then
   `npx hyperframes render . --resolution landscape --fps 30 --crf 17`. Render
   1:1 (1080p authored → 1080p out) — never upscale to 4K, it softens UI.
   [references/composition.md](references/composition.md).
5. **QC before you ship.** ffprobe the duration/audio, sample 1–2 frames (not
   black, not empty), captions inside the frame, narration not clipped, the key
   result page actually visible. Fix flow/timing, then re-render.

## Quick start

```bash
# system deps
brew install node ffmpeg uv          # uv only for the Python TTS/Whisper venv
npx playwright install chromium

# Python venv for local TTS + transcription (one time)
python3 -m venv .ttsvenv && .ttsvenv/bin/pip install kokoro-onnx soundfile
export PATH="$(pwd)/.ttsvenv/bin:$PATH"

# 1) record  2) narrate  3) caption  4) compose+render
node scripts/record.mjs
bash scripts/tts.sh && bash scripts/transcribe.sh && node scripts/build-captions.mjs
npx hyperframes render . --resolution landscape --fps 30 --crf 17 --output out/demo.mp4
```

First TTS downloads ~340 MB (Kokoro), first transcribe ~466 MB (Whisper
`small.en`); both cache in `~/.cache/hyperframes/`.

## Hard-won rules

- **Real interaction beats slides** — record the product actually running.
- **1:1, never 2× upscale** — recording at 2× DPR and rendering 4K softens every
  UI clip. Author and render at 1080p.
- **Deterministic composition** — no `Date.now()`, `Math.random()`, or network in
  the HTML; HyperFrames seeks frames, so motion must be reproducible.
- **Visible cursor + hold on results** — glide deliberately, pause on the payoff.
- **VO, not docs** — narration tracks the picture; it is not the README read aloud.
- **Video ≥ narration** — pad clip time so visuals never end before the voice.

## Dependencies

Node 22+, FFmpeg, Playwright (Chromium), and the HyperFrames CLI (`npx
hyperframes`, install its skills with `npx skills add heygen-com/hyperframes`).
Local TTS/Whisper need Python + `kokoro-onnx`. See
[references/composition.md](references/composition.md) for the HyperFrames setup.

## References

- [references/pipeline.md](references/pipeline.md) — the six stages and data flow
- [references/recording.md](references/recording.md) — Director engine + worked example + recording pitfalls
- [references/narration-and-captions.md](references/narration-and-captions.md) — VO writing, TTS, Whisper, caption fixes
- [references/composition.md](references/composition.md) — HyperFrames timeline, crossfades, 1080p, rendering
- [references/templates.md](references/templates.md) — hackathon + product-demo structures and VO skeletons
- [references/troubleshooting.md](references/troubleshooting.md) — captions, white screen, audio, fonts
