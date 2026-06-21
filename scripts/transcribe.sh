#!/usr/bin/env bash
# Transcribe each narration WAV to word-level timestamps for captions.
# Audio is English → small.en is correct.
# hyperframes transcribe always writes assets/narration/transcript.json,
# so we rename it to <name>.transcript.json after each run.
set -euo pipefail
cd "$(dirname "$0")/.."

N=assets/narration
for wav in "$N"/*.wav; do
  base="$(basename "$wav" .wav)"
  echo "transcribe → $base  (first run downloads the Whisper model, ~466 MB — be patient)"
  # keep stderr (model download / errors); only quiet stdout
  npx hyperframes transcribe "$wav" --model small.en >/dev/null
  if [ ! -f "$N/transcript.json" ]; then
    echo "  ✗ expected $N/transcript.json not found — check 'hyperframes transcribe' output" >&2
    exit 1
  fi
  mv "$N/transcript.json" "$N/$base.transcript.json"
done
echo "Done."
