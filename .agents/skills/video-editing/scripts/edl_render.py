#!/usr/bin/env python3
"""Render an edit decision list (EDL JSON) to a video, frame-accurately.

EDL format:
{
  "fps": 30, "width": 1920, "height": 1080,      # optional; default = first clip's
  "fit": "pad" | "crop",                          # optional; how to conform other sizes
  "clips": [
    {"src": "a.mp4", "in": 12.4, "out": 31.85,
     "transition": {"type": "fade", "dur": 0.5}}  # optional, into THIS clip from previous
  ]
}
For J/L cuts, render the picture cut here and then lay the audio offset (see recipes.md).
xfade types: fade, dissolve, fadeblack, fadewhite, wipeleft, slideleft, smoothleft, circleopen ...

Usage: edl_render.py EDL.json OUT.mp4 [--crf 16] [--preset medium] [--keep-temp]
Paths in the EDL are relative to the EDL file. Each segment gets 15 ms audio fades so hard cuts
never click. Output is a high-quality intermediate (x264 CRF 16, AAC 320k, 48 kHz); export the
deliverable from it with the delivery spec.
"""
import argparse, json, os, shutil, subprocess, sys, tempfile
from fractions import Fraction


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.stderr.write(" ".join(cmd) + "\n" + r.stderr[-3000:])
        sys.exit(r.returncode)
    return r.stdout


def probe(path):
    out = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path]))
    v = next((s for s in out["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in out["streams"] if s["codec_type"] == "audio"), None)
    return v, a, float(out["format"]["duration"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("edl"); ap.add_argument("out")
    ap.add_argument("--crf", default="16"); ap.add_argument("--preset", default="medium")
    ap.add_argument("--keep-temp", action="store_true")
    a = ap.parse_args()

    edl = json.load(open(a.edl))
    base = os.path.dirname(os.path.abspath(a.edl))
    clips = edl["clips"]
    if not clips:
        sys.exit("EDL has no clips")
    v0, _, _ = probe(os.path.join(base, clips[0]["src"]))
    W = int(edl.get("width") or v0["width"]); H = int(edl.get("height") or v0["height"])
    W -= W % 2; H -= H % 2
    fps = str(edl.get("fps") or v0["r_frame_rate"])
    fit = edl.get("fit", "pad")
    if fit == "crop":
        scale = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}"
    else:
        scale = f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:black"

    tmp = tempfile.mkdtemp(prefix="edl_")
    segs, durs = [], []
    for i, c in enumerate(clips):
        src = os.path.join(base, c["src"])
        _, has_a, sdur = probe(src)
        t_in = float(c.get("in", 0)); t_out = float(c.get("out", sdur))
        if t_out <= t_in:
            sys.exit(f"clip {i}: out <= in")
        d = t_out - t_in
        fo = max(d - 0.015, 0)
        vf = f"{scale},setsar=1,fps={fps},format=yuv420p"
        af = f"aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.015,afade=t=out:st={fo:.3f}:d=0.015"
        seg = os.path.join(tmp, f"seg{i:03d}.mkv")
        cmd = ["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{t_in:.3f}", "-t", f"{d:.3f}", "-i", src]
        if not has_a:
            cmd += ["-f", "lavfi", "-t", f"{d:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
        cmd += ["-map", "0:v:0", "-map", "0:a:0" if has_a else "1:a:0",
                "-vf", vf, "-af", af, "-c:v", "libx264", "-crf", "10", "-preset", "veryfast",
                "-c:a", "pcm_s16le", "-t", f"{d:.3f}", seg]
        run(cmd)
        segs.append(seg); durs.append(d)
        print(f"segment {i}: {c['src']} {t_in:.2f}-{t_out:.2f} ({d:.2f}s)", file=sys.stderr)

    enc = ["-c:v", "libx264", "-crf", a.crf, "-preset", a.preset, "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-movflags", "+faststart"]
    has_fx = any(c.get("transition") for c in clips[1:])
    if not has_fx:
        lst = os.path.join(tmp, "list.txt")
        with open(lst, "w") as fh:
            fh.writelines(f"file '{s}'\n" for s in segs)
        run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst] + enc + [a.out])
    else:
        inputs, fc = [], []
        for s in segs:
            inputs += ["-i", s]
        for i in range(len(segs)):  # common timebase, or xfade refuses to link
            fc.append(f"[{i}:v]settb=AVTB,setpts=PTS-STARTPTS[sv{i}]")
            fc.append(f"[{i}:a]asetpts=PTS-STARTPTS[sa{i}]")
        vprev, aprev, t = "[sv0]", "[sa0]", durs[0]
        for i in range(1, len(segs)):
            tr = clips[i].get("transition") or {}
            td = float(tr.get("dur", 0)) if tr else 0.0
            if td > 0:
                td = min(td, durs[i - 1] - 0.05, durs[i] - 0.05)
                off = t - td
                fc.append(f"{vprev}[sv{i}]xfade=transition={tr.get('type','fade')}:duration={td:.3f}:offset={off:.3f}[v{i}]")
                fc.append(f"{aprev}[sa{i}]acrossfade=d={td:.3f}:c1=tri:c2=tri[a{i}]")
                t = off + durs[i]
            else:
                fc.append(f"{vprev}[sv{i}]concat=n=2:v=1:a=0,settb=AVTB[v{i}]")
                fc.append(f"{aprev}[sa{i}]concat=n=2:v=0:a=1[a{i}]")
                t += durs[i]
            vprev, aprev = f"[v{i}]", f"[a{i}]"
        run(["ffmpeg", "-nostdin", "-v", "error", "-y"] + inputs +
            ["-filter_complex", ";".join(fc), "-map", vprev, "-map", aprev, "-shortest"] + enc + [a.out])
    if a.keep_temp:
        print(f"temp segments kept in {tmp}", file=sys.stderr)
    else:
        shutil.rmtree(tmp)
    print(a.out)


if __name__ == "__main__":
    main()
