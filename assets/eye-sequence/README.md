# LIEU cover sequence

All 511 frames from `web_eye animation.zip` are retained as transparent
1280 × 720 WebP files. Names are one-based source IDs. No pointer tracking,
frame blending, motion blur, or additional floating motion is applied.

The cover choreography is continuous:

1. Descend in 1.6 seconds, facing forward at frame 45 on landing.
2. Continue frames 45–61, then rest for one second.
3. Play 61–417 at 30 fps and rest for 1.2 seconds.
4. Retrace 417–61 at 30 fps and rest for 1.4 seconds.
5. Repeat from step 3. Both turnaround poses are identical frames, without cuts.

The downward smile (frames 418–471) is excluded from idle playback. Scrolling
scrubs 417–471 while the body stays anchored and fades in place. Returning
to the top rewinds to 417 and resumes the idle return from that same frame. Offscreen and
hidden playback pauses and resumes where it left off. Reduced motion holds 61.

Entrance translation runs on a browser animation timeline, independently of
the background canvas render loop. Frames 1–45 decode during the logo opening.
The hero uses fixed positioning so scrolling does not require per-frame
compensation for document movement.

The controller reads ahead 20 frames in the current playback direction, retains
48 decoded images during entrance and 36 afterward, and loads four at a time. Frame 61 stays cached as a loading
fallback. Downloads cannot stall entrance movement. Failed requests retry once.

All frames are declared as hidden lazy images in `index.html`, allowing file
previews to rewrite their URLs. The controller uses those resolved sources.
Run `node tests/hero-loading.cjs` to verify playback and loading fallback.
