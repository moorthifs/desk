#!/usr/bin/env bash
# Automated QC of a deliverable. Usage: qc.sh FILE [TARGET_LUFS=-14] [MAX_TP=-1]
set -uo pipefail
f="${1:?usage: qc.sh FILE [TARGET_LUFS] [MAX_TP]}"; target="${2:--14}"; maxtp="${3:--1}"
fail=0; pass(){ echo "PASS  $*"; }; bad(){ echo "FAIL  $*"; fail=1; }; warn(){ echo "WARN  $*"; }
v(){ ffprobe -v error -select_streams v:0 -show_entries stream="$1" -of csv=p=0 "$f"; }
echo "== $f"
echo "duration: $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f") s, size: $(du -h "$f" | cut -f1)"
echo "video: $(v codec_name) $(v profile) $(v width)x$(v height) $(v pix_fmt) fps=$(v r_frame_rate)"
[ "$(v pix_fmt)" = "yuv420p" ] && pass "pix_fmt yuv420p (plays everywhere)" || warn "pix_fmt $(v pix_fmt): fine for masters, not for web/social"
[ $(( $(v width) % 2 )) -eq 0 ] && [ $(( $(v height) % 2 )) -eq 0 ] && pass "even dimensions" || bad "odd dimensions"
case "$f" in *.mp4|*.mov|*.m4v)
  if head -c 65536 "$f" | grep -aq moov; then pass "faststart (moov at front)"; else warn "moov atom not at front: add -movflags +faststart for web"; fi;;
esac
if ffprobe -v error -select_streams a:0 -show_entries stream=index -of csv=p=0 "$f" | grep -q .; then
  ar=$(ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate,channels -of csv=p=0 "$f")
  echo "audio: $(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "$f") $ar"
  lr=$(ffmpeg -hide_banner -nostats -i "$f" -map 0:a:0 -af ebur128=peak=true -f null - 2>&1)
  I=$(echo "$lr" | awk '/Integrated loudness/{s=1} s&&/ I:/{print $2; exit}')
  TP=$(echo "$lr" | awk '/True peak/{s=1} s&&/Peak:/{print $2; exit}')
  echo "loudness: I=$I LUFS, true peak=$TP dBTP (target $target LUFS, <= $maxtp dBTP)"
  python3 -c "import sys;sys.exit(0 if abs($I-($target))<=1.0 else 1)" && pass "integrated loudness within ±1 LU" || bad "integrated loudness $I LUFS off target $target"
  python3 -c "import sys;sys.exit(0 if $TP<=$maxtp+0.05 else 1)" && pass "true peak" || bad "true peak $TP dBTP > $maxtp"
  sil=$(ffmpeg -hide_banner -nostats -i "$f" -map 0:a:0 -af silencedetect=n=-50dB:d=2 -f null - 2>&1 | grep -c silence_start)
  [ "$sil" -eq 0 ] && pass "no silences > 2 s" || warn "$sil silence(s) > 2 s (check they are intended)"
else
  warn "no audio stream"
fi
blk=$(ffmpeg -hide_banner -nostats -i "$f" -map 0:v:0 -vf "blackdetect=d=0.1:pix_th=0.08" -an -f null - 2>&1 | grep -o 'black_start:[0-9.]* black_end:[0-9.]*')
[ -z "$blk" ] && pass "no black segments" || warn "black segments (ok only if intended fades):"$'\n'"$blk"
frz=$(ffmpeg -hide_banner -nostats -i "$f" -map 0:v:0 -vf "freezedetect=n=0.001:d=1.5" -an -f null - 2>&1 | grep -o 'freeze_start: [0-9.]*')
[ -z "$frz" ] && pass "no frozen frames > 1.5 s" || warn "frozen picture at: $(echo $frz | tr '\n' ' ') (ok for stills/titles)"
[ $fail -eq 0 ] && echo "QC RESULT: PASS" || echo "QC RESULT: FAIL"
exit $fail
