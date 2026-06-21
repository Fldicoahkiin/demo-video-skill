# Pipeline & data flow

Six stages. Recording (①) and composition (⑥) are independent — re-do one
without the other.

```
                          assets/narration/NN-*.txt   (you write these)
                                   │
  your live app ──①──▶ out/clips/*.webm ──ffmpeg──▶ assets/clips/*.mp4 ─┐
                                   │                                     │
                          ②  tts.sh (Kokoro)                            │
                                   ▼                                     │
                          assets/narration/*.wav                        │
                                   │                                     ▼
                          ③ transcribe.sh (Whisper)            ⑥ index.html
                                   ▼                            (HyperFrames
                          *.transcript.json                      one timeline)
                                   │                                     │
                          ④ build-captions.mjs                          │
                                   ▼                                     │
                          captions.js ───────────────────────────────▶  │
                                                                         │
                          ⑤ music.sh (ffmpeg) ─▶ assets/music/bed.wav ─▶ │
                                                                         ▼
                                              npx hyperframes render → out/demo.mp4
```

## Stages

1. **record** — `scripts/record.mjs` drives the app, writes `out/clips/*.webm`;
   ffmpeg converts to H.264 `assets/clips/*.mp4`.
2. **narrate** — `scripts/tts.sh` reads each `narration/*.txt` → Kokoro `*.wav`.
3. **transcribe** — `scripts/transcribe.sh` → Whisper word timings
   `*.transcript.json`.
4. **caption** — `scripts/build-captions.mjs` → `captions.js` (+ `captions.json`).
5. **music** — `scripts/music.sh` → `assets/music/bed.wav`.
6. **compose** — `index.html` assembles clips + audio + captions + music; render
   with `npx hyperframes render`.

## File layout in your project

```
your-demo/
├── index.html                 # the HyperFrames composition (you author)
├── meta.json                  # { id, name }
├── captions.js                # AUTO-GENERATED (window.__captions)
├── scripts/                   # copied from this skill
│   ├── record.mjs  tts.sh  transcribe.sh  build-captions.mjs  music.sh
├── assets/
│   ├── clips/                 # H.264 clips used by the composition
│   ├── narration/             # NN-*.txt + *.wav + *.transcript.json
│   ├── music/bed.wav
│   └── captions.json          # AUTO-GENERATED (inspection copy)
└── out/                       # webm + rendered mp4 (gitignore)
```
