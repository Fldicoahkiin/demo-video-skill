# Troubleshooting

**White screen at the start of a clip.** Warm the page first: load it in a
throwaway context so it's cached, then record in a fresh context where it opens
instantly. Or add a short `sleep` after `goto` before acting.

**A dialog won't close / Escape does nothing.** Component libraries often trap
Escape. Use `Director.closeDialog(selector)` to click the close button, then wait
for the backdrop to detach.

**Recorded UI looks soft / blurry.** You recorded or rendered at 2×. Set
`deviceScaleFactor: 1` and render `--resolution landscape` (1080p), not
`landscape-4k`. Author and render 1:1.

**TTS or transcribe can't find Python deps.** Put the venv on PATH:
`export PATH="$(pwd)/.ttsvenv/bin:$PATH"`, with `kokoro-onnx` and `soundfile`
installed in it. First run downloads model weights into `~/.cache/hyperframes/`.

**Captions show the wrong brand spelling.** Whisper can't spell proper nouns.
Add a `PHRASE_FIX` regex (single word) or a `WORD_FIX` merge (brand split across
two tokens) in `build-captions.mjs`, then re-run it — no need to re-transcribe.

**Captions overlap or run off the frame.** Lower `MAX_WORDS` in
`build-captions.mjs` for shorter groups. Don't hand-add caption cues on top of
the generated track — let the timestamps drive it.

**Narration is longer than the clip.** Pad the clip: hold a settled frame with
`sleep`, or raise the scene's `data-duration`. Keep VO a touch shorter than the
picture; never let the voice run past the visuals.

**Narration is longer than the video overall.** HyperFrames holds the last frame
to cover trailing audio — but it's better to fix timing so the last scene's
visual lasts as long as its voice.

**No system/mic audio in the recording.** Playwright doesn't capture system
audio; that's intended — all audio is the TTS narration + music bed, mixed in the
composition.

**The page needs login or a funded account.** Do that setup from your own
tooling and pass any secret via env at run time. Never read keys inside the
committed recorder.

**`npm run dev` times out / preview dies.** It's a long-running server. Start it
in the background and keep it alive while authoring; don't run it in the
foreground.
