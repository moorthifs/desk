---
name: video-editing
description: >-
  Professional video editing with ffmpeg: rough cut and fine cut from an edit decision list,
  silence and filler removal for talking-head footage, J/L cuts and crossfades, color correction
  and LUTs, broadcast-grade audio (EBU R128 loudness, denoise, ducking music under voice), burned-in
  or sidecar captions, titles and lower thirds, reframing 16:9 to 9:16/1:1/4:5, speed ramps,
  stabilization, and platform-correct exports (YouTube, Instagram Reels, TikTok, LinkedIn, X,
  ProRes masters), finished with an automated QC pass. Use this whenever the user wants to edit,
  cut, trim, join, shorten, caption, subtitle, color grade, fix audio in, reframe, compress,
  convert, or export a video, make a reel, short, promo, trailer, highlight, or podcast clip, or
  asks why a video looks or sounds unprofessional.
---

# Professional video editing

You edit like a working editor, not a format converter. Every job goes through the same six
stages. Do not skip stages 1 and 6, even for "just trim this".

Tools: `ffmpeg`/`ffprobe` (required), `python3`. Scripts live in this skill's `scripts/` folder
(`$SKILL` below means this skill's directory). Recipes are in `references/recipes.md`; platform
specs in `references/delivery-specs.md`. Read them when you reach the stage that needs them.

## 0. Ground rules

- **Never overwrite source media.** Write to `edit/` (work files) and `exports/` (deliverables)
  next to the source, or to the scratchpad. Keep the originals untouched.
- **One lossy encode for the deliverable.** Intermediate steps use stream copy (`-c copy`) or a
  near-lossless intermediate (`-c:v libx264 -crf 10 -preset veryfast` or ProRes). Re-encoding
  H.264 → H.264 → H.264 is how amateur edits get mushy.
- **Frame-accurate cuts need a re-encode.** `-c copy` cuts snap to keyframes. Use it only for
  quick previews or when the user explicitly accepts keyframe-snapped cuts.
- **Keep the source's frame rate, color space and sample rate** unless the delivery spec says
  otherwise. Mixing 29.97 and 30, or 44.1k and 48k, causes drift and stutter. Conform first.
- **Look before you cut.** Run the contact sheet and read the frames. Make edit decisions from
  what is on screen and in the transcript, never from file names.
- Long encodes (> ~2 min) go in the background; tell the user what is rendering.

## 1. Ingest and inspect

```bash
bash $SKILL/scripts/probe.sh input.mp4             # codec, fps, resolution, color, audio, duration
bash $SKILL/scripts/contact_sheet.sh input.mp4     # grid of frames -> input_contact.jpg; Read it
```

Note in your plan: duration, fps (exact, e.g. 30000/1001), resolution, rotation metadata,
VFR (variable frame rate, common on phone recordings), HDR (bt2020/PQ/HLG), audio channels and
loudness. Phone VFR footage must be conformed to CFR before editing (recipe: *Conform*).

If speech matters (talking head, interview, podcast, tutorial), get a transcript with word
timestamps. Use `whisper`/`faster-whisper` if installed (`pip install faster-whisper`), otherwise
ask the user for an SRT, or fall back to silence detection only.

## 2. Plan the edit (write an EDL)

Before rendering anything, write `edit/edl.json`, the single source of truth for the cut:

```json
{
  "fps": 30, "width": 1920, "height": 1080,
  "clips": [
    {"src": "a.mp4", "in": 12.40, "out": 31.85, "note": "hook: strongest line first"},
    {"src": "b.mp4", "in": 3.00,  "out": 9.50,  "transition": {"type": "fade", "dur": 0.5}},
    {"src": "a.mp4", "in": 55.10, "out": 80.00}
  ]
}
```

Render it with `python3 $SKILL/scripts/edl_render.py edit/edl.json edit/cut.mp4`.
Show the user the plan (clip list with timecodes and why) for anything over ~1 minute of output
or anything subjective, before the long render.

Editorial craft to apply while planning:

- **Hook in the first 1–3 seconds.** Open on the strongest moment, line, or visual, not on
  "Hi guys, so today…". For social, the first frame must work as a thumbnail.
- **Cut on action and on breath.** Cut points belong in natural pauses (between sentences, at
  the end of a gesture), never mid-word. Leave ~0.10–0.20 s of handle before the first word and
  ~0.15–0.30 s after the last word of a segment, or it feels clipped.
- **Remove dead air, keep rhythm.** Tighten pauses longer than ~0.5 s to ~0.25 s; do not remove
  every gap or speech becomes breathless. `scripts/silence_cut.py` does this.
- **Jump cuts:** fine for vlog/social; for polished pieces hide them with a punch-in (scale
  1.0 → 1.12 on alternate segments), B-roll, or a cutaway.
- **J-cuts and L-cuts** (audio leads or trails the picture by 0.3–1 s) make interviews feel
  edited by a person. Use them between speakers and into B-roll.
- **Transitions:** hard cuts by default. Crossfades for time passing or mood; dip-to-black for
  section changes. No star wipes, spins or random transitions; at most one transition style per
  piece.
- **Pacing by format:** social shorts change shot or visual every 2–4 s; YouTube tutorials
  5–10 s; corporate/documentary slower. Cut to the music's beat when there is music.
- **End deliberately:** a clear CTA, end card, or a clean button, never a trailing fumble.

## 3. Assemble

- Rough cut from the EDL → watch via a new contact sheet + spot-check frames at every cut
  (`ffmpeg -ss T -i cut.mp4 -frames:v 1 f.jpg`). Look for flash frames, mid-word cuts, black
  frames, jumps in framing.
- Talking-head: `python3 $SKILL/scripts/silence_cut.py in.mp4 edit/tight.mp4` (options:
  `--noise -35dB --min-silence 0.5 --keep 0.25`). Use `--dry-run` to print the kept segments
  first and sanity-check them.
- Reframing for vertical: center crop is a last resort; position the crop on the subject
  (read the contact sheet, set `x` per segment). Recipe: *Reframe*.

## 4. Finish: picture

Apply in this order (recipes in `references/recipes.md`):

1. **Stabilize** shaky handheld (vidstab two-pass), only if needed.
2. **Correct** first: exposure, white balance, contrast so skin tones look natural
   (`eq`, `colorbalance`, `curves`). Match shots so cuts don't jump in color.
3. **Grade** second (look/LUT via `lut3d`), subtle: blend at 50–80 %, not 100 %.
4. **Sharpen lightly** (`unsharp=5:5:0.5`) only for soft footage; never denoise + sharpen hard.
5. **Graphics:** titles, lower thirds, captions. Keep text inside the title-safe area (90 %
   of frame; for 9:16 keep clear of the top 220 px and bottom 420 px of a 1920 px frame
   where platform UI sits). One font family, at most two weights.

**Captions** (most social video is watched muted; burn them in for social, sidecar SRT/VTT
for YouTube/LinkedIn as well): 1–2 lines, ≤ 32–42 characters per line, 1–6 s per caption,
break at phrase boundaries, never leave one word orphaned. Generate an ASS file with a styled
look via `python3 $SKILL/scripts/srt_to_ass.py captions.srt captions.ass --style social` and
burn with the `subtitles` filter.

## 5. Finish: audio

Audio is half of "professional". Order:

1. **Clean:** high-pass 80 Hz on voice (`highpass=f=80`), denoise (`afftdn=nf=-25`), de-click
   if needed. Remove hum with `bandreject` at 50/60 Hz only if present.
2. **Shape voice:** gentle compression (`acompressor=threshold=-18dB:ratio=3:attack=5:release=100`),
   slight presence (`equalizer=f=3000:t=q:w=1:g=2`).
3. **Music:** duck under voice with `sidechaincompress` (or a fixed −18 to −24 dB under speech),
   fade in/out (`afade`). Music must never compete with words.
4. **Fades:** 10–30 ms audio fades at every hard cut that lands mid-sound to avoid clicks
   (the EDL renderer does this automatically).
5. **Loudness normalize last**, two-pass `loudnorm` to the platform target
   (`python3 $SKILL/scripts/loudnorm.py in.mp4 out.mp4 --target -14`). Targets: −14 LUFS
   streaming/social, −16 LUFS podcasts, −23 LUFS (EBU R128) / −24 LKFS (ATSC A/85) broadcast;
   true peak ≤ −1 dBTP (−2 for heavily compressed codecs).

## 6. Export and QC

Pick the spec from `references/delivery-specs.md`, then always run:

```bash
bash $SKILL/scripts/qc.sh exports/final.mp4
```

It reports duration, fps, resolution, codec/profile, pixel format, faststart, integrated
loudness and true peak, black segments, frozen frames, and silence. Fix every failure before
handing over. Then make a final contact sheet and look at it.

Hand-over message to the user: what was done (cuts, length before → after, color, audio, captions),
the export spec, where the files are, and anything you could not do or judged differently.

## Common requests → quick path

| Request | Path |
|---|---|
| "Trim / cut out X" | probe → EDL with 1–2 clips → render → qc |
| "Make it shorter / tighter" | transcript → silence_cut + remove repeats/false starts in EDL |
| "Turn this into a Reel/TikTok/Short" | pick 15–60 s best segment, hook first → reframe 9:16 → captions → −14 LUFS → spec export |
| "Add subtitles" | transcript → SRT → ASS styled → burn (and deliver SRT) |
| "Fix the audio" | stage 5 in full |
| "Make it look better" | stage 4.2–4.3, show before/after stills side by side |
| "Compress for email/WhatsApp" | two-pass x264 to target bitrate = size·8 / duration, 720p |
| "Podcast clip / audiogram" | best 30–90 s → captions → waveform (`showwaves`) over still |
