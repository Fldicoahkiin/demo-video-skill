// Records real-interaction demo clips by driving a live web app with Playwright:
// a visible synthetic cursor glides, clicks ripple, and every scene is captured
// as its own webm in out/clips/. Copy this file, point APP at your app, and
// replace `scenes` with your own choreography. Re-run after UX changes.
// Usage: node scripts/record.mjs [scene ...]
//
// The Director class below is the reusable engine — keep it. Only `scenes`,
// `APP`, and `SIZE` are project-specific. A full worked example (drag-to-upload,
// dialog handling, folder/tag/move choreography) lives in references/recording.md.
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, renameSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CLIPS = join(ROOT, "out", "clips");
// Your running app. Record a deployed URL or a local dev server.
const APP = process.env.DEMO_URL ?? "http://localhost:5173";
// 1:1 device scale (deviceScaleFactor: 1 below) keeps UI text crisp — do NOT
// record at 2× and downscale, it softens every frame. 1456×819 ≈ 16:9.
const SIZE = { width: 1456, height: 819 };

// A visible synthetic cursor so the camera can follow the pointer. Injected into
// every page; it grows/shrinks and tints on mousedown so clicks read on video.
const CURSOR_INIT = `
(() => {
  const make = () => {
    if (document.getElementById("__cursor")) return;
    const c = document.createElement("div");
    c.id = "__cursor";
    c.style.cssText = [
      "position:fixed", "left:-40px", "top:-40px", "width:22px", "height:22px",
      "border-radius:50%", "background:rgba(255,255,255,0.92)",
      "border:1.5px solid rgba(20,20,30,0.55)", "box-shadow:0 1px 6px rgba(0,0,0,0.45)",
      "z-index:2147483647", "pointer-events:none", "transform:translate(-50%,-50%)",
      "transition:width .12s ease,height .12s ease,background .12s ease",
    ].join(";");
    document.documentElement.appendChild(c);
    addEventListener("mousemove", (e) => { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; }, true);
    addEventListener("mousedown", () => { c.style.width = "15px"; c.style.height = "15px"; c.style.background = "rgba(94,106,210,0.95)"; }, true);
    addEventListener("mouseup", () => { c.style.width = "22px"; c.style.height = "22px"; c.style.background = "rgba(255,255,255,0.92)"; }, true);
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", make);
  else make();
})();
`;

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The reusable recording engine: an eased synthetic cursor that glides to
// elements before interacting, so motion reads as deliberate on camera.
class Director {
  constructor(page) {
    this.page = page;
    this.x = SIZE.width / 2;
    this.y = SIZE.height / 2;
  }
  async glideTo(x, y, ms = 650) {
    const steps = Math.max(12, Math.round(ms / 16));
    const [x0, y0] = [this.x, this.y];
    for (let i = 1; i <= steps; i++) {
      const t = easeInOut(i / steps);
      await this.page.mouse.move(x0 + (x - x0) * t, y0 + (y - y0) * t);
      await sleep(ms / steps);
    }
    this.x = x; this.y = y;
  }
  async glide(selector, ms = 650) {
    const el = this.page.locator(selector).first();
    await el.waitFor({ state: "visible", timeout: 15000 });
    const box = await el.boundingBox();
    await this.glideTo(box.x + box.width / 2, box.y + box.height / 2, ms);
    return el;
  }
  async click(selector, { pause = 260, ms = 600, force = false } = {}) {
    const el = await this.glide(selector, ms);
    await sleep(pause);
    // real click on the element (full event pipeline — needed for component
    // libraries that use Popover/Select); the cursor already glided for the camera.
    await el.click({ delay: 70, force });
  }
  async type(selector, text, { perChar = 55 } = {}) {
    await this.click(selector);
    for (const ch of text) { await this.page.keyboard.type(ch); await sleep(perChar); }
  }
  /** Close an open dialog by clicking its close affordance. Many component
   *  libraries trap or ignore Escape, so prefer clicking the button. Adjust the
   *  selector to match your UI. */
  async closeDialog(closeSelector = '[aria-label="Close"]') {
    const close = this.page.locator(closeSelector).last();
    if (await close.count()) {
      await this.glide(closeSelector, 500).catch(() => {});
      await close.click({ force: true });
    }
  }
  /** Drop files onto the first file input's container with a real drag-over, so
   *  the dragging UI shows on camera. `files` is [{ name, mime, b64 }]. */
  async dropFiles(files) {
    const zone = this.page.locator('input[type="file"]').first().locator("xpath=..");
    const box = await zone.boundingBox();
    await this.glideTo(box.x + box.width / 2, box.y - 120, 500);
    const dt = await this.page.evaluateHandle(async (specs) => {
      const dt = new DataTransfer();
      for (const { name, mime, b64 } of specs) {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        dt.items.add(new File([bytes], name, { type: mime }));
      }
      return dt;
    }, files);
    await zone.dispatchEvent("dragover", { dataTransfer: dt });
    await this.glideTo(box.x + box.width / 2, box.y + box.height / 2, 700);
    await sleep(350);
    await zone.dispatchEvent("drop", { dataTransfer: dt });
  }
}

/** Reset to a brand-new visitor (clears any persisted local state). */
async function freshUser(page) {
  await page.goto(APP);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

// ───────────────────────────── scenes ─────────────────────────────
// Replace these with your own. Each function records ONE clip to
// out/clips/<name>.webm. Hold on key states with sleep() so the cut has room to
// breathe and so the clip fills its slot in the composition. Keep total motion
// calm — glide, pause, act, hold.
//
// Scenes chain via out/clips/state.json: "01-*" starts fresh, each scene saves
// localStorage/cookies for the next, and the state is persisted so you can
// re-record a single scene (`node scripts/record.mjs 02-interact`) without
// replaying the whole sequence.
//
// If a scene needs off-screen setup (seed data, a backend call, a funded test
// account), do it from your OWN tooling before/within the scene. Never read
// secrets or private keys inside a committed recorder — keep credentials out of
// the repo and pass anything sensitive via env at run time.

const scenes = {
  /** Open the app on a fresh visit and let the first screen settle. */
  async "01-open"(d, page) {
    await page.waitForSelector("body");
    await d.glideTo(SIZE.width / 2, SIZE.height * 0.4, 500);
    await sleep(1500);
    // then act, e.g. await d.click('button:has-text("Get started")', { ms: 900 });
    await sleep(2500);
  },

  /** A representative interaction. Glide to a control, act, then hold on the
   *  result. Swap in your real flow — type into a field, drop a file, open a
   *  dialog, wait for a result to render. */
  async "02-interact"(d, page) {
    await page.waitForSelector("body");
    await d.glideTo(SIZE.width / 2, SIZE.height / 2, 500);
    await sleep(800);
    // act on your real flow, e.g.:
    //   await d.type('input[name="q"]', "hello", { perChar: 55 });
    //   await d.click('button:has-text("Run")');
    //   await page.waitForSelector("text=Done", { timeout: 30000 });
    // for drag-to-upload + dialog choreography see references/recording.md
    await sleep(2500);
  },
};

// ───────────────────────────── main ─────────────────────────────

mkdirSync(CLIPS, { recursive: true });
const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(scenes);

const STATE_FILE = join(CLIPS, "state.json");
let state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : null;
for (const name of names) {
  if (!scenes[name]) { console.error(`unknown scene ${name}`); process.exit(1); }
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: SIZE,
    deviceScaleFactor: 1,
    recordVideo: { dir: CLIPS, size: SIZE },
    colorScheme: "dark",
    storageState: state ?? undefined,
  });
  await context.addInitScript(CURSOR_INIT);
  const page = await context.newPage();
  console.log(`▶ ${name}`);
  if (/^01[-_]/.test(name)) {
    await freshUser(page);
  } else {
    await page.goto(APP);
  }
  const d = new Director(page);
  try {
    await scenes[name](d, page);
    state = await context.storageState();
    writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch (e) {
    console.error(`  ✗ ${name}: ${e.message}`);
    state = await context.storageState().catch(() => state);
  }
  const video = page.video();
  await context.close();
  const path = await video.path();
  renameSync(path, join(CLIPS, `${name}.webm`));
  await browser.close();
  console.log(`  ✓ out/clips/${name}.webm`);
}
console.log("done:", readdirSync(CLIPS).join(", "));
