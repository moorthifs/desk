#!/usr/bin/env bash
# Make a labelled grid of evenly spaced frames so you can SEE the footage.
# Usage: contact_sheet.sh FILE [COLS=4] [ROWS=4] [OUT=<file>_contact.jpg]
set -euo pipefail
f="${1:?usage: contact_sheet.sh FILE [COLS] [ROWS] [OUT]}"
cols="${2:-4}"; rows="${3:-4}"; out="${4:-${f%.*}_contact.jpg}"
n=$((cols*rows))
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
tmp=$(mktemp -d)
for i in $(seq 0 $((n-1))); do
  t=$(python3 -c "print(round($dur*($i+0.5)/$n,3))")
  ffmpeg -nostdin -v error -copyts -ss "$t" -i "$f" -frames:v 1 \
    -vf "scale=480:-2,drawtext=text='%{pts\:hms}':x=8:y=h-th-8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=4" \
    -y "$tmp/$(printf %03d $i).png"
done
ffmpeg -nostdin -v error -framerate 1 -i "$tmp/%03d.png" -vf "tile=${cols}x${rows}:padding=4:color=black" -frames:v 1 -q:v 3 -y "$out"
rm -rf "$tmp"
echo "$out"
