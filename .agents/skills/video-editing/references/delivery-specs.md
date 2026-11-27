# Delivery specs

Platforms change limits often. These are safe, widely accepted settings as of late 2026; if
the user names a hard requirement (a broadcaster spec sheet, a festival DCP), that wins.

Common web/social encode (H.264, plays everywhere):
```bash
ffmpeg -i master.mp4 -c:v libx264 -preset slow -crf 18 -profile:v high -pix_fmt yuv420p \
  -g FPS*2 -bf 2 -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart out.mp4
```
Add `-maxrate X -bufsize 2X` where a bitrate ceiling is listed.

| Destination | Resolution / aspect | FPS | Video | Audio | Loudness | Notes |
|---|---|---|---|---|---|---|
| YouTube (long form) | 3840x2160 or 1920x1080, 16:9 | source (24/25/30/50/60) | H.264 CRF 16–18, or upload ProRes/high bitrate; ~12 Mbps 1080p30, ~45 Mbps 4K30 | AAC 384k stereo 48k | −14 LUFS, TP −1 | Sidecar SRT; chapters in description; thumbnail 1280x720 JPG < 2 MB |
| YouTube Shorts | 1080x1920 9:16 | 30/60 | H.264 CRF 18 | AAC 192k | −14 | ≤ 3 min; keep text out of bottom 20 % |
| Instagram Reels | 1080x1920 9:16 | 30 | H.264 CRF 18, maxrate 8M | AAC 192k 48k | −14 | Cover 1080x1920 (centre 1080x1440 shows in grid); safe zone: avoid top 220 px, bottom 420 px, right 120 px |
| Instagram feed | 1080x1350 4:5 or 1080x1080 | 30 | as above | AAC 192k | −14 | 4:5 takes most screen space in feed |
| TikTok | 1080x1920 9:16 | 30/60 | H.264 CRF 18, maxrate 10M | AAC 192k | −14 | Burned captions; avoid bottom 480 px and right 140 px |
| LinkedIn | 1920x1080, 1080x1080 or 1080x1350 | 30 | H.264 CRF 18, maxrate 10M | AAC 192k | −14 | Mostly watched muted: burned captions or SRT upload |
| X (Twitter) | 1920x1080 or 1080x1080 / 1080x1920 | 30/60 | H.264 high, maxrate 8M | AAC 128–192k | −14 | ≤ 512 MB / 2:20 for most accounts |
| Facebook | 1080x1920 / 1080x1080 / 1920x1080 | 30 | H.264 CRF 18 | AAC 192k | −14 | |
| Website hero / background loop | 1920x1080 (and 1280x720) | 24/30 | H.264 CRF 23–26 + VP9/AV1 WebM; no audio (`-an`) | — | — | 5–15 s seamless loop, < 3–5 MB; `muted playsinline autoplay loop` |
| Podcast video | 1920x1080 | 30 | H.264 CRF 20 | AAC 192k | −16 LUFS, TP −1 | |
| Email / WhatsApp / Slack | 1280x720 | 30 | two-pass to size (recipes) | AAC 128k | −14 | WhatsApp ~16 MB practical; email ~20–25 MB |
| Broadcast EU | 1920x1080 25p/50i | 25 | per broadcaster (often XDCAM HD422 / ProRes 422 HQ) | PCM 24-bit 48k | −23 LUFS, TP −1 (EBU R128) | Get the spec sheet |
| Broadcast US | 1920x1080 29.97 | 29.97 | per broadcaster | PCM 24-bit 48k | −24 LKFS, TP −2 (ATSC A/85) | |
| Archive / hand-off master | source res | source | ProRes 422 HQ: `-c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le` (.mov) | PCM 24-bit: `-c:a pcm_s24le` | mix target | Give editors/clients this plus the web file |

Vertical safe area, 1080x1920: keep important text and faces inside x 60–960, y 220–1500.

## HEVC / AV1 variants (smaller files, same quality)

```bash
-c:v libx265 -crf 22 -preset slow -tag:v hvc1 -pix_fmt yuv420p      # Apple-friendly HEVC
-c:v libsvtav1 -crf 32 -preset 6 -pix_fmt yuv420p                    # AV1 (if available: ffmpeg -encoders | grep av1)
-c:v libvpx-vp9 -crf 32 -b:v 0 -row-mt 1 -c:a libopus -b:a 128k      # WebM for the web
```

## Deliverables checklist

- [ ] Correct resolution, aspect, fps, yuv420p (web) and faststart
- [ ] Loudness on target, true peak under ceiling (`scripts/qc.sh FILE TARGET TP`)
- [ ] No unintended black/frozen frames, no clicks at cuts, no flash frames
- [ ] Captions spelled correctly (names!), timed, inside the safe area
- [ ] First frame works as a thumbnail; last frame is clean
- [ ] File names: `project_platform_WxH_vNN.mp4` (e.g. `launch_reels_1080x1920_v02.mp4`)
- [ ] Sidecar SRT/VTT and thumbnail delivered where the platform uses them
