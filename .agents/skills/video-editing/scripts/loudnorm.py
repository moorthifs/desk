#!/usr/bin/env python3
"""Two-pass EBU R128 loudness normalization (linear when possible), video stream copied.

Usage: loudnorm.py IN OUT [--target -14] [--tp -1] [--lra 11] [--acodec aac] [--abitrate 320k]
Targets: -14 social/streaming, -16 podcast, -23 EBU broadcast, -24 US broadcast.
"""
import argparse, json, re, subprocess, sys

ap = argparse.ArgumentParser()
ap.add_argument("inp"); ap.add_argument("out")
ap.add_argument("--target", type=float, default=-14); ap.add_argument("--tp", type=float, default=-1)
ap.add_argument("--lra", type=float, default=11); ap.add_argument("--acodec", default="aac")
ap.add_argument("--abitrate", default="320k")
a = ap.parse_args()

base = f"loudnorm=I={a.target}:TP={a.tp}:LRA={a.lra}"
r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", a.inp, "-map", "0:a:0",
                    "-af", base + ":print_format=json", "-f", "null", "-"], capture_output=True, text=True)
m = re.findall(r"\{[^{}]*\}", r.stderr)
if not m:
    sys.exit("loudnorm analysis failed:\n" + r.stderr[-2000:])
s = json.loads(m[-1])
print(f"measured: I={s['input_i']} LUFS TP={s['input_tp']} dBTP LRA={s['input_lra']}", file=sys.stderr)
af = (f"{base}:measured_I={s['input_i']}:measured_TP={s['input_tp']}:measured_LRA={s['input_lra']}"
      f":measured_thresh={s['input_thresh']}:offset={s['target_offset']}:linear=true,aresample=48000")
cmd = ["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", a.inp, "-map", "0:v?", "-map", "0:a:0",
       "-c:v", "copy", "-af", af, "-c:a", a.acodec]
if a.acodec not in ("pcm_s16le", "pcm_s24le", "flac"):
    cmd += ["-b:a", a.abitrate]
if a.out.lower().endswith((".mp4", ".mov", ".m4v")):
    cmd += ["-movflags", "+faststart"]
sys.exit(subprocess.call(cmd + [a.out]))
