#!/usr/bin/env bash
# Regenerate all narration WAVs from assets/narration/*.txt with Kokoro TTS.
# Voice: af_nova (warm, neutral product-demo). Speed 0.95 for clarity.
# Requires the kokoro-onnx venv on PATH (see README).
set -euo pipefail
cd "$(dirname "$0")/.."

VOICE="${VOICE:-af_nova}"
SPEED="${SPEED:-0.95}"
N=assets/narration

for txt in "$N"/*.txt; do
  base="$(basename "$txt" .txt)"
  out="$N/$base.wav"
  echo "tts → $out"
  npx hyperframes tts "$txt" --voice "$VOICE" --speed "$SPEED" --output "$out"
done

echo "Done. Now transcribe for captions:  bash scripts/transcribe.sh"
