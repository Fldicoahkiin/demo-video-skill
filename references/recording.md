# Recording real interaction

`scripts/record.mjs` drives your live app with Playwright and records each scene
as its own `webm`. The goal is footage that reads as a calm, deliberate human
using the product — not a frantic test run.

## The engine (keep it)

`Director` wraps Playwright with an eased synthetic cursor so the camera can
follow the pointer:

- `glideTo(x, y, ms)` / `glide(selector, ms)` — move the cursor with ease-in-out
  before doing anything. Motion that teleports reads as a bug; motion that glides
  reads as intent.
- `click(selector, { pause, ms, force })` — glide, hold, then a real
  `el.click()` (full event pipeline — needed for component libraries that build
  Select/Popover on React-Aria or similar).
- `type(selector, text, { perChar })` — click, then key-by-key typing so the
  text appears at a human pace.
- `dropFiles([{ name, mime, b64 }])` — a real `dragover` then `drop` on the file
  input's container, so the drag-over UI shows on camera.
- `closeDialog(selector)` — many component libraries trap or ignore Escape;
  click the close button instead.

The cursor is injected via `CURSOR_INIT` as a fixed `<div>` that follows
`mousemove` and shrinks/tints on `mousedown`. It lives above everything
(`z-index: 2147483647`) and ignores pointer events.

## Scene model

- Each key in `scenes` records one clip to `out/clips/<name>.webm`.
- Scenes **chain** through `out/clips/state.json`: `01-*` starts on a fresh
  visitor (`freshUser` clears localStorage); each scene saves storage state for
  the next. Because state is persisted, you can re-record a single scene
  (`node scripts/record.mjs 05-organize`) without replaying the whole run.
- Hold on important states with `sleep()` so the cut has room and the clip fills
  its slot in the composition. Rhythm per scene: **glide → pause → act → hold**.

## Pitfalls (learned the hard way)

- **1:1 device scale.** `deviceScaleFactor: 1`. Recording at 2× and later
  rendering 4K upscales the footage and softens every UI edge. Author and render
  at 1080p, 1:1.
- **Dark mode / theme up front.** Set the app's theme via an init script before
  the first paint so there's no flash.
- **Dialogs that ignore Escape.** Click the close affordance (`closeDialog`),
  then wait for the backdrop to detach before the next action.
- **Selects that fire on change.** A library `Select` may run its action and keep
  the dialog open — close it yourself and let the list re-fetch.
- **Inputs that dismiss on blur.** Type on the already-focused input
  (`pressSequentially`) without moving the cursor away first.
- **Wait for the real result, not a timer.** Prefer
  `waitForSelector("text=…")` / `waitForFunction(...)` over `sleep` for anything
  that depends on a network or chain round-trip; only use `sleep` to hold a
  settled frame.
- **Off-screen setup stays out of the repo.** If a scene needs seeded data, a
  funded test account, or a backend call, do it from your own tooling and pass
  any secret via env at run time. Never read private keys or `.env` inside a
  committed recorder.

## Preparing drop-in files

`dropFiles` wants base64. Build it inline or from a repo asset:

```js
// from a repo file:
import { readFileSync } from "node:fs";
const b64 = readFileSync("public/photo.png").toString("base64");

// inline text (UTF-8 safe):
const md = btoa(unescape(encodeURIComponent("# Notes\n\n- one\n- two")));

await d.dropFiles([
  { name: "photo.png", mime: "image/png", b64 },
  { name: "notes.md", mime: "text/markdown", b64: md },
]);
```

## Worked example — an 8-scene product demo (WalDrive)

A real composition's scene list, to show choreography on a non-trivial app
(wallet, uploads, on-chain actions). Each is one recorded clip:

| Scene | Choreography | Technique it demonstrates |
|---|---|---|
| `01-welcome` | fresh visit → "Generate wallet" → empty drive settles | `freshUser`, hold on first paint |
| `02-faucet` | switch network in localStorage → one-click get gas → balance 0→N live | seed state via `page.evaluate`, `waitForFunction` on the balance text |
| `03-multi-upload` | drag 3 files in → batch progress → cards appear live | `dropFiles` with mixed mime types, `waitForSelector` per card |
| `04-verify` | open a file → rendered preview → click Verify → live SHA-256 | the differentiator scene — hold, then slow-zoom it in the composition |
| `05-organize` | new folder → tag a file → move into folder → browse in | dialog-that-ignores-Escape, select-fires-on-change, blur-on-input |
| `06-versions` | upload a new version → open History → restore v1 (one tx) | feed a hidden file input via `evaluate`, reopen to show the new badge |
| `07-storage` | Settings → on-chain storage receipts → extend one | scroll a panel into view inside a dialog, hold while a tx lands |
| `08-accounts` | account switcher → import a key → the whole tree swaps in | off-screen key passed at run time, not stored in the recorder |

The recorder is ~200 lines: the `Director` engine, `CURSOR_INIT`, `freshUser`,
and this `scenes` map. Everything project-specific is in `scenes`, `APP`, `SIZE`.

## Convert webm → mp4 for the composition

HyperFrames embeds H.264 clips. After recording:

```bash
for f in out/clips/*.webm; do
  ffmpeg -y -i "$f" -c:v libx264 -crf 20 -preset fast -pix_fmt yuv420p -an \
    "assets/clips/$(basename "$f" .webm).mp4"
done
```

`-an` drops audio (narration is a separate track). To gently speed a clip that
runs long, add `-filter:v "setpts=0.71*PTS"`.
