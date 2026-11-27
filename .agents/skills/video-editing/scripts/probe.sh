#!/usr/bin/env bash
# Summarize a media file for editing decisions.
# Usage: probe.sh FILE
set -euo pipefail
f="${1:?usage: probe.sh FILE}"
ffprobe -v error -show_entries format=duration,size,bit_rate:format_tags=creation_time \
  -of default=nw=1 "$f" | sed 's/^/format./'
ffprobe -v error -select_streams v -show_entries \
  stream=index,codec_name,profile,width,height,sample_aspect_ratio,display_aspect_ratio,pix_fmt,r_frame_rate,avg_frame_rate,color_space,color_transfer,color_primaries,field_order,bit_rate:stream_side_data=rotation \
  -of default=nw=1 "$f" | sed 's/^/video./'
ffprobe -v error -select_streams a -show_entries \
  stream=index,codec_name,sample_rate,channels,channel_layout,bit_rate \
  -of default=nw=1 "$f" | sed 's/^/audio./'
r=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$f" 2>/dev/null || true)
a=$(ffprobe -v error -select_streams v:0 -show_entries stream=avg_frame_rate -of csv=p=0 "$f" 2>/dev/null || true)
if [ -n "$r" ] && [ "$r" != "$a" ]; then
  echo "WARNING: r_frame_rate ($r) != avg_frame_rate ($a): likely VFR. Conform to CFR before editing."
fi
t=$(ffprobe -v error -select_streams v:0 -show_entries stream=color_transfer -of csv=p=0 "$f" 2>/dev/null || true)
case "$t" in smpte2084|arib-std-b67) echo "WARNING: HDR source ($t). Tone-map for SDR delivery (see recipes: HDR to SDR).";; esac
if ffprobe -v error -select_streams a:0 -show_entries stream=index -of csv=p=0 "$f" | grep -q .; then
  ffmpeg -hide_banner -nostats -i "$f" -map 0:a:0 -af ebur128=peak=true -f null - 2>&1 \
    | awk '/Integrated loudness/{s=1} s&&/I:|LRA:|Peak:/{gsub(/^ +/,"");print "loudness." $0}'
fi
