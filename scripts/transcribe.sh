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
  echo "transcribe → $base"
  npx hyperframes transcribe "$wav" --model small.en >/dev/null 2>&1
  mv "$N/transcript.json" "$N/$base.transcript.json"
done
echo "Done."
