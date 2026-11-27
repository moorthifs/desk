#!/usr/bin/env python3
"""Tighten talking-head footage: shorten pauses instead of deleting all of them.

Detects silences with ffmpeg silencedetect, keeps `--keep` seconds of each pause (split
before/after the cut so speech never sounds clipped), writes an EDL and renders it with
edl_render.py.

Usage: silence_cut.py IN.mp4 OUT.mp4 [--noise -35dB] [--min-silence 0.5] [--keep 0.25]
                      [--edl edit/tight_edl.json] [--dry-run]
Tune --noise to the room: about 6 dB above the noise floor (probe.sh / ebur128 shows it).
"""
import argparse, json, os, re, subprocess, sys

ap = argparse.ArgumentParser()
ap.add_argument("inp"); ap.add_argument("out")
ap.add_argument("--noise", default="-35dB"); ap.add_argument("--min-silence", type=float, default=0.5)
ap.add_argument("--keep", type=float, default=0.25); ap.add_argument("--edl")
ap.add_argument("--dry-run", action="store_true")
a = ap.parse_args()

dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                     "-of", "csv=p=0", a.inp], text=True))
log = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", a.inp, "-map", "0:a:0", "-af",
                      f"silencedetect=n={a.noise}:d={a.min_silence}", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", log)]
ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
if len(ends) < len(starts):
    ends.append(dur)

half = a.keep / 2
keep, cur = [], 0.0
for s, e in zip(starts, ends):
    s = max(s, 0.0)
    cut_from, cut_to = s + half, e - half
    if s <= 0.01:            # leading silence: keep a short pre-roll
        cut_from = 0.0; cut_to = max(e - 0.15, 0.0)
    if e >= dur - 0.01:      # trailing silence: keep a short tail
        cut_from = s + 0.3; cut_to = dur
    if cut_to - cut_from > 0.05:
        if cut_from - cur > 0.05:
            keep.append((cur, cut_from))
        cur = cut_to
if dur - cur > 0.05:
    keep.append((cur, dur))

total = sum(e - s for s, e in keep)
print(f"{len(starts)} pauses found; {dur:.1f}s -> {total:.1f}s ({100*(1-total/dur):.0f}% removed), "
      f"{len(keep)} segments", file=sys.stderr)
for s, e in keep:
    print(f"  keep {s:8.2f} - {e:8.2f}  ({e-s:.2f}s)", file=sys.stderr)
if a.dry_run:
    sys.exit(0)

edl_path = a.edl or os.path.splitext(a.out)[0] + "_edl.json"
os.makedirs(os.path.dirname(os.path.abspath(edl_path)), exist_ok=True)
src = os.path.relpath(os.path.abspath(a.inp), os.path.dirname(os.path.abspath(edl_path)))
json.dump({"clips": [{"src": src, "in": round(s, 3), "out": round(e, 3)} for s, e in keep]},
          open(edl_path, "w"), indent=1)
print(f"EDL: {edl_path}", file=sys.stderr)
here = os.path.dirname(os.path.abspath(__file__))
sys.exit(subprocess.call([sys.executable, os.path.join(here, "edl_render.py"), edl_path, a.out]))
