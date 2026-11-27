#!/usr/bin/env python3
"""Convert SRT to a styled ASS subtitle file for burning in with ffmpeg's subtitles filter.

Usage: srt_to_ass.py IN.srt OUT.ass [--style social|clean|broadcast] [--width 1080 --height 1920]
       [--font "DejaVu Sans"] [--size N] [--upper]
Burn:  ffmpeg -i in.mp4 -vf "subtitles=OUT.ass" -c:a copy out.mp4
Styles: social    = big bold white, thick black outline, lower-middle (Reels/TikTok/Shorts)
        clean     = white on soft translucent box, bottom (YouTube, corporate)
        broadcast = smaller, outline + shadow, bottom title-safe
"""
import argparse, re

ap = argparse.ArgumentParser()
ap.add_argument("srt"); ap.add_argument("ass")
ap.add_argument("--style", default="clean", choices=["social", "clean", "broadcast"])
ap.add_argument("--width", type=int, default=1920); ap.add_argument("--height", type=int, default=1080)
ap.add_argument("--font", default="DejaVu Sans"); ap.add_argument("--size", type=int)
ap.add_argument("--upper", action="store_true")
a = ap.parse_args()

W, H = a.width, a.height
short = min(W, H)
# name: (size factor of short side, bold, border style, outline, shadow, margin_v factor of H, back colour)
presets = {
    "social":    (0.075, -1, 1, 5, 0, 0.30, "&H00000000"),
    "clean":     (0.050,  0, 3, 2, 0, 0.07, "&H80000000"),
    "broadcast": (0.042,  0, 1, 2, 1, 0.08, "&H00000000"),
}
f, bold, bs, ol, sh, mv, back = presets[a.style]
size = a.size or round(short * f)
hdr = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{a.font},{size},&H00FFFFFF,&H00FFFFFF,&H00000000,{back},{bold},0,0,0,100,100,0,0,{bs},{ol},{sh},2,{round(W*0.08)},{round(W*0.08)},{round(H*mv)},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

def ts(t):
    h, m, rest = t.strip().replace(",", ".").split(":")
    s, ms = (rest.split(".") + ["0"])[:2]
    cs = int(ms.ljust(3, "0")[:3]) // 10
    return f"{int(h)}:{int(m):02d}:{int(s):02d}.{cs:02d}"

blocks = re.split(r"\n\s*\n", open(a.srt, encoding="utf-8-sig").read().replace("\r", "").strip())
lines = []
for b in blocks:
    rows = b.split("\n")
    i = next((k for k, r in enumerate(rows) if "-->" in r), None)
    if i is None:
        continue
    start, end = [x.strip().split(" ")[0] for x in rows[i].split("-->")]
    text = "\\N".join(r.strip() for r in rows[i + 1:] if r.strip())
    text = re.sub(r"<[^>]+>", "", text).replace("{", "(").replace("}", ")")
    if a.upper:
        text = text.upper()
    lines.append(f"Dialogue: 0,{ts(start)},{ts(end)},Default,,0,0,0,,{text}")
open(a.ass, "w", encoding="utf-8").write(hdr + "\n".join(lines) + "\n")
print(f"{len(lines)} captions -> {a.ass}")
