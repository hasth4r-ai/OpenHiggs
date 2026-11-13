# Video Inpaint

Edit Video now offers Remove / Clean plate and Replace object. Supply source footage, a frame-aligned black/white mask, an instruction, and optionally one image reference. MOV, MP4, MKV, WebM and AVI inputs are accepted. White is edited; inversion, 0–32 pixel expansion and 0–16 pixel feathering are available. References guide appearance; frame injection cannot be combined with this H3 denoise-control mode, so arbitrary timestamp anchoring is deliberately not exposed.

The worker derives settings from the installed `loras/minimax_h3/Minimaxh3_VideoInpaintRef2VA.json`, merges model defaults, and overrides stale prompt, timeline and reference values. It uses GVA/GVAI, grouped-row masking, 20 steps, control-video FPS, and FG single-task prompt mode. No new model or LoRA is downloaded or enabled. The original Create Video pipeline remains separate, with a shared submission lock preventing concurrent GPU tasks between modes.

Inputs must have constant and matching frame rates, dimensions, duration and frame count; combined upload size is limited to 512 MB for queue packaging. The model may internally resize or pad; export rejects missing frames or changed FPS and trims padding, then composites the masked region at the original dimensions. Unmasked footage comes from the source. Final encoding is lossy ProRes, so byte-identical pixel preservation is not claimed.

Output choices are ProRes 422, 422 HQ and opaque 4444, using the installed FFmpeg `prores_ks`. The MOV retains source dimensions and frame rate, with original audio encoded as PCM by default. An H.264/AAC MP4 preview is generated separately. 4444 is not an alpha export and does not recover precision lost inside the AI model. History provides a separate Download ProRes MOV action; cancellation/deletion remain available.

## Safe activation

Do not rebuild the live `.next` directory or restart either running service during a generation. `C:\openhiggs\Activate Video Inpaint.cmd` first checks OpenHiggs history and Wan2GP state. It refuses activation while either reports active work. Once idle, it rebuilds and restarts OpenHiggs only; it does not restart Wan2GP. If either state cannot be checked, activation stops without changing the running server.

## Validation

The implementation was compiled in an isolated checkout. CPU-only synthetic MOV/mask tests verify alignment rejection, single-task preset mapping, red/blue masked compositing, all three ProRes profiles, output FPS/frame count/dimensions, original audio, audio removal, inverted/expanded/feathered masks and the MP4 preview. No GPU inpainting run was submitted while the user's long Create Video generation was running. Model-level removal/replacement quality still needs a short real-footage test after that job finishes.

Run the CPU tests with `node local-hosting/inpaint-test.mjs <path-to-ffmpeg>`; they create their own temporary directory. No model process is started.
