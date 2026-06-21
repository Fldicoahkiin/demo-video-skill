#!/usr/bin/env bash
# Regenerate the quiet ambient music bed (assets/music/bed.wav).
# Soft A-minor sine pad: root + fifth + octave + high shimmer, lowpassed, slow
# tremolo, light echo, fade in/out. Mixed into the composition at volume 0.12.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p assets/music

ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "sine=frequency=110:sample_rate=44100:duration=240" \
  -f lavfi -i "sine=frequency=164.81:sample_rate=44100:duration=240" \
  -f lavfi -i "sine=frequency=220:sample_rate=44100:duration=240" \
  -f lavfi -i "sine=frequency=329.63:sample_rate=44100:duration=240" \
  -filter_complex "\
   [0:a]volume=0.5,tremolo=f=0.12:d=0.3[a0];\
   [1:a]volume=0.32,tremolo=f=0.10:d=0.25[a1];\
   [2:a]volume=0.22,tremolo=f=0.16:d=0.3[a2];\
   [3:a]volume=0.10,tremolo=f=0.10:d=0.4[a3];\
   [a0][a1][a2][a3]amix=inputs=4:normalize=0[mix];\
   [mix]lowpass=f=900,highpass=f=60,aecho=0.8:0.85:300|600:0.25|0.18,\
   afade=t=in:st=0:d=4,afade=t=out:st=230:d=4,volume=0.5[out]" \
  -map "[out]" -ac 2 -ar 44100 -c:a pcm_s16le assets/music/bed.wav

echo "Wrote assets/music/bed.wav"
