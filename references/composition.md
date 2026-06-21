# Composition (HyperFrames)

The final video is one [HyperFrames](https://hyperframes.heygen.com) HTML file:
a single root timeline that embeds the recorded clips as seekable `<video>`,
plays the narration as separate `<audio>`, draws a caption track from
`window.__captions`, and mixes a quiet music bed. HTML is the source of truth;
HyperFrames seeks and captures frames deterministically.

## Setup

```bash
npx skills add heygen-com/hyperframes   # install the HyperFrames agent skills
npx hyperframes docs data-attributes    # local reference, no network
```

A composition project has `index.html` (the timeline), `meta.json` (id/name),
`assets/` (clips, narration, music), and `captions.js` (generated). Keep the
preview server alive while authoring: `npm run dev` (long-running — run it in the
background, never foreground or it times out and dies).

**Start from the skeleton.** Copy
[composition-skeleton.html](composition-skeleton.html) to your project as
`index.html` — a minimal, renderable composition (one title scene, one clip, a
synced caption track, narration + music bed). Add one scene block and one
`SCENE_AT` entry per recording, then grow the timeline.

## Timeline rules

1. Every timed element needs `data-start`, `data-duration`, `data-track-index`.
2. Visible timed elements **must** have `class="clip"` — the framework uses it
   for visibility control.
3. GSAP timelines are paused and registered on `window.__timelines`:
   ```js
   window.__timelines = window.__timelines || {};
   window.__timelines["composition-id"] = gsap.timeline({ paused: true });
   ```
4. Videos are `muted`; audio is a separate `<audio>` track with its own
   `data-start`. Use `data-media-start` to trim a clip's lead-in.
5. **Deterministic only** — no `Date.now()`, no `Math.random()`, no network
   fetch. Frames must be reproducible across seeks.

## Structure & crossfades

Lay scenes on the timeline back to back. Clips crossfade (~0.6s, ease-out) by
**alternating `data-track-index` 2/3** so both frames are live through the
dissolve. Text scenes (title card, problem statement, conclusion) are
GSAP-gated DOM on their own track. Give the differentiator scene room — e.g. a
slow zoom on the moment that proves the product (a verification, a result).

A worked timing table (the WalDrive cut, ~3:42): title 0:00–0:05 → problem
0:05–0:27 → six product clips 0:27–3:13 (verify gets the zoom) → MCP/agent text
3:13–3:24 → conclusion 3:24–3:42. See [templates.md](templates.md) for the
structure to fill.

## Music bed — `scripts/music.sh`

Regenerates `assets/music/bed.wav`: a soft A-minor sine pad (root + fifth +
octave + shimmer), lowpassed, slow tremolo, light echo, fade in/out, built with
ffmpeg. Mixed into the composition at `data-volume="0.12"` so narration stays
clear. Edit the frequencies/duration in the script for a different mood. The bed
is 240s; a shorter cut is fine — the composition's `data-duration` trims it. Only
raise `duration=` for cuts longer than four minutes.

## Render

```bash
npx hyperframes render . --quality high --fps 30 --resolution landscape \
  --crf 17 --output out/demo.mp4
```

- **`landscape` = 1920×1080, native, no upscale.** The composition is authored at
  1080p; rendering `landscape-4k` makes Chrome capture at 2× DPR and upscales
  1080p footage to 4K, softening every UI clip. 1:1 keeps screen recordings
  sharp. (Portrait/square exist for social cuts.)
- `--quality` defaults to `standard`; use `high` for the final render and
  `draft` for fast iteration (`--quality draft --output renders/draft.mp4`).

Always check before rendering (`npm run check` runs all three):

```bash
npx hyperframes lint        # timing/structure errors
npx hyperframes inspect     # layout overflow
npx hyperframes validate    # console errors + WCAG contrast (hidden command; skip if unavailable)
```

## Swapping a clip after a UX change

1. Re-record the scene (`node scripts/record.mjs <scene>`), convert to mp4.
2. Drop it over the matching file in `assets/clips/` (keep the filename).
3. If its length changed, adjust that clip's `data-duration` (and the following
   scene's `data-start`) so the cut still lands on the action.
4. Re-render.

## Re-running narration after a copy change

1. Edit the `assets/narration/NN-*.txt`.
2. `bash scripts/tts.sh && bash scripts/transcribe.sh && node scripts/build-captions.mjs`.
3. If a scene's VO got longer/shorter, nudge that `<audio>`'s `data-start` and
   the scene timing so voice and visuals stay aligned.
4. Re-render.

## Optional: code-generated GIF track

For doc-page media, author short HTML scenes (no recording) and render each
straight to MP4/GIF — deterministic, ~200 KB, no DPI or cropping issues. Same
HyperFrames rules; one tiny composition per GIF.
