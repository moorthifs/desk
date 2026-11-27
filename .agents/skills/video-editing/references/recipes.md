# ffmpeg recipes for professional finishing

All recipes assume `-c:a copy` or the audio chain from SKILL.md stage 5 unless stated. Replace
`in.mp4` / `out.mp4`. Test on a 10 s excerpt (`-ss 60 -t 10`) before rendering a long file.

## Conform

```bash
# VFR phone footage -> constant 30 fps, 48 kHz audio, keep quality (intermediate)
ffmpeg -i in.mp4 -vf fps=30 -c:v libx264 -crf 12 -preset veryfast -c:a aac -b:a 320k -ar 48000 conform.mp4
# Bake rotation metadata into pixels (stops players rotating differently)
ffmpeg -i in.mov -c:v libx264 -crf 12 -metadata:s:v rotate=0 out.mp4   # autorotate is on by default
# Deinterlace (field_order tt/bb in probe)
ffmpeg -i in.mts -vf bwdif=mode=send_field:deint=interlaced ...
```

## Cuts

```bash
# Frame-accurate trim (re-encode)
ffmpeg -ss 12.40 -to 31.85 -i in.mp4 -c:v libx264 -crf 16 -c:a aac -b:a 320k cut.mp4
# Fast keyframe trim (preview only)
ffmpeg -ss 12 -to 32 -i in.mp4 -c copy -avoid_negative_ts make_zero quick.mp4
```

Multi-clip cuts and crossfades: write an EDL and use `scripts/edl_render.py`.

### J-cut / L-cut (audio from B leads/trails the picture cut)

Render the picture cut and the audio separately, then offset:
```bash
# A then B, B's audio starts 0.6 s before the picture cut at T=8.0 (J-cut)
ffmpeg -i A.mp4 -i B.mp4 -filter_complex "
 [0:v]trim=0:8,setpts=PTS-STARTPTS[va];[1:v]trim=0:10,setpts=PTS-STARTPTS[vb];[va][vb]concat=n=2:v=1:a=0[v];
 [0:a]atrim=0:7.4,asetpts=PTS-STARTPTS,afade=t=out:st=7.1:d=0.3[aa];
 [1:a]atrim=0:10.6,asetpts=PTS-STARTPTS,afade=t=in:d=0.2,adelay=7400|7400[ab];
 [aa][ab]amix=inputs=2:normalize=0,atrim=0:18[a]" -map "[v]" -map "[a]" jcut.mp4
```
(B's audio must be trimmed from 0.6 s earlier in the source than B's picture for true sync:
take B picture from `t_b` and B audio from `t_b-0.6`.)

## Punch-in (hide a jump cut)

```bash
# 12 % digital zoom, centred; use on alternate segments
-vf "scale=iw*1.12:ih*1.12,crop=iw/1.12:ih/1.12"
# slow push-in over the clip (Ken Burns), 1.0 -> 1.1 in 5 s at 30 fps, 1080p out
-vf "scale=3840:-2,zoompan=z='min(1+0.1*on/150,1.1)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps=30"
```

## Reframe

```bash
# 16:9 1080p -> 9:16 1080x1920, crop positioned on subject (X = left edge of crop in source px)
-vf "crop=ih*9/16:ih:X:0,scale=1080:1920,setsar=1"
# subject moves: animate x
-vf "crop=ih*9/16:ih:'clip(600+(t-3)*80,0,iw-ow)':0,scale=1080:1920"
# 9:16 from 16:9 with blurred fill instead of cropping (good for wide shots / screen recordings)
-filter_complex "[0:v]split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=40,eq=brightness=-0.08[bg];[b]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2"
# 1:1 1080 / 4:5 1080x1350: same pattern with crop=ih:ih or crop=ih*4/5:ih
```

## Speed

```bash
# 2x video+audio (pitch preserved)
-filter_complex "[0:v]setpts=PTS/2[v];[0:a]atempo=2.0[a]"
# smooth slow motion 0.5x from 30 fps (motion interpolated; slow to render)
-vf "minterpolate=fps=60:mi_mode=mci,setpts=2*PTS" -r 30
# speed ramp: split into segments in the EDL, speed each with setpts, concat
```

## Stabilize (two pass)

```bash
ffmpeg -i in.mp4 -vf vidstabdetect=shakiness=6:accuracy=15:result=t.trf -f null -
ffmpeg -i in.mp4 -vf "vidstabtransform=input=t.trf:smoothing=20:zoom=3,unsharp=5:5:0.6" -c:a copy stab.mp4
```

## Color

```bash
# Basic correction: exposure/contrast/saturation (start small)
-vf "eq=brightness=0.03:contrast=1.08:saturation=1.10:gamma=0.98"
# White balance: warm a cold image (shift shadows/mids/highs)
-vf "colorbalance=rs=0.04:gs=0:bs=-0.04:rm=0.03:bm=-0.03"
# Gentle S-curve for punch
-vf "curves=master='0/0 0.25/0.21 0.5/0.5 0.75/0.79 1/1'"
# Apply a LUT at 70 % strength
-filter_complex "[0:v]split[o][l];[l]lut3d=look.cube[g];[o][g]blend=all_mode=normal:all_opacity=0.7"
# Before/after still for the user
ffmpeg -ss 10 -i in.mp4 -ss 10 -i graded.mp4 -filter_complex "[0:v][1:v]hstack" -frames:v 1 compare.jpg
# HDR (PQ/HLG) -> SDR Rec.709
-vf "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p"
```
Skin tones should sit on the vectorscope skin line; in practice: faces not orange, not grey,
not magenta. Check stills, not only the full frame.

## Audio

```bash
# Voice clean-up chain
-af "highpass=f=80,afftdn=nf=-25,acompressor=threshold=-18dB:ratio=3:attack=5:release=100:makeup=2,equalizer=f=3000:t=q:w=1:g=2"
# Remove 50 Hz hum and harmonics (only if present)
-af "bandreject=f=50:w=4,bandreject=f=100:w=4,bandreject=f=150:w=4"
# Music bed ducked under voice (sidechain), music fades in 1 s / out 2 s
ffmpeg -i video.mp4 -i music.mp3 -filter_complex "
 [1:a]volume=0.5,afade=t=in:d=1,afade=t=out:st=DUR-2:d=2[m];
 [0:a]asplit[v][sc];
 [m][sc]sidechaincompress=threshold=0.02:ratio=10:attack=20:release=400[md];
 [v][md]amix=inputs=2:normalize=0:duration=first[a]" -map 0:v -map "[a]" -c:v copy out.mp4
# Replace audio entirely
ffmpeg -i video.mp4 -i new.wav -map 0:v -map 1:a -c:v copy -shortest out.mp4
# Loudness normalize: scripts/loudnorm.py (two-pass). Measure: ffmpeg -i f -af ebur128=peak=true -f null -
```

## Text and graphics

Fonts available on most Linux: DejaVu Sans, Liberation Sans, Noto Sans. Use `fontfile=` with a
full path for reliability, e.g. `/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`.

```bash
# Title card, fade in 0.3 s / out 0.3 s, shown 1-4 s
-vf "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='Quarterly Review':fontsize=h/12:fontcolor=white:x=(w-tw)/2:y=(h-th)/2:alpha='if(lt(t,1),0,if(lt(t,1.3),(t-1)/0.3,if(lt(t,3.7),1,if(lt(t,4),(4-t)/0.3,0))))'"
# Lower third: name + role on a translucent bar, 2-7 s
-vf "drawbox=x=0:y=ih*0.78:w=iw*0.42:h=ih*0.12:color=black@0.55:t=fill:enable='between(t,2,7)',
     drawtext=fontfile=...Bold.ttf:text='Priya Nair':fontsize=h/22:fontcolor=white:x=w*0.04:y=h*0.795:enable='between(t,2,7)',
     drawtext=fontfile=...Sans.ttf:text='Head of Operations':fontsize=h/34:fontcolor=white@0.85:x=w*0.04:y=h*0.85:enable='between(t,2,7)'"
# Logo watermark, bottom-right, 4 % margin, 60 % opacity
# (logo width = 12 % of the 1920 px frame)
-filter_complex "[1:v]scale=230:-1,format=rgba,colorchannelmixer=aa=0.6[l];[0:v][l]overlay=W-w-W*0.04:H-h-H*0.04"
# Captions: burn styled ASS (scripts/srt_to_ass.py)
-vf "subtitles=captions.ass"
# Soft subtitles in MP4 (toggleable)
ffmpeg -i in.mp4 -i captions.srt -map 0 -map 1 -c copy -c:s mov_text -metadata:s:s:0 language=eng out.mp4
```

Text in `drawtext` with `:` and `'` escaped (`\:`, `'\''`); for anything complex
write a text file and use `textfile=`.

## Transitions and fades

```bash
# Fade from/to black at start/end of a DUR-second clip
-vf "fade=t=in:d=0.5,fade=t=out:st=DUR-0.7:d=0.7" -af "afade=t=in:d=0.3,afade=t=out:st=DUR-0.7:d=0.7"
# Crossfade two clips (A is 10 s long, 0.5 s fade)
-filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.5:offset=9.5[v];[0:a][1:a]acrossfade=d=0.5[a]"
```

## Stills, thumbnails, GIFs, audiograms

```bash
ffmpeg -ss 12.5 -i in.mp4 -frames:v 1 -q:v 2 thumb.jpg                       # thumbnail
ffmpeg -i in.mp4 -vf "thumbnail=300,scale=1280:-2" -frames:v 1 best.jpg      # auto "representative" frame
# High-quality GIF (palette)
ffmpeg -ss 5 -t 4 -i in.mp4 -vf "fps=15,scale=640:-2:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse=dither=sierra2_4a" out.gif
# Audiogram: still image + waveform + audio, 1080x1080
ffmpeg -loop 1 -i cover.jpg -i clip.wav -filter_complex "[0:v]scale=1080:1080[bg];[1:a]showwaves=s=900x200:mode=cline:colors=white[w];[bg][w]overlay=90:800[v]" -map "[v]" -map 1:a -shortest -c:v libx264 -pix_fmt yuv420p -c:a aac out.mp4
```

## Picture-in-picture, split screen, screen recordings

```bash
# Webcam bottom-right over screen recording at 25 % width with 24 px margin
-filter_complex "[1:v]scale=iw*0.25*1920/iw:-2[c];[0:v][c]overlay=W-w-24:H-h-24"
# Side by side
-filter_complex "[0:v]scale=-2:1080[a];[1:v]scale=-2:1080[b];[a][b]hstack"
# Screen recordings: keep text crisp -> x264 -tune stillimage or animation, CRF 18, keep native res
```

## Size-targeted compression

```bash
# Fit a 95 s video into 25 MB: total kbps = 25*8192/95 ≈ 2155; audio 128 -> video ≈ 2000k
ffmpeg -y -i in.mp4 -c:v libx264 -b:v 2000k -pass 1 -preset slow -an -f null /dev/null
ffmpeg -i in.mp4 -c:v libx264 -b:v 2000k -pass 2 -preset slow -c:a aac -b:a 128k -movflags +faststart out.mp4
```
