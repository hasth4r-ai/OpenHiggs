# Local video generation

Start Wan2GP in Pinokio, then start OpenHiggs. The bridge reuses Wan2GP's running Gradio queue and installed MiniMax H3 Ref2VA Pruned model. It does not start another Python model process. No paid provider is involved.

Connection settings live in `C:\openhiggs\config\wan-engine.json`; use `wan-engine.example.json` as the example. If Pinokio changes the app port, update `baseUrl` to the ready URL reported by `pterm status wan.git --probe`.

The initial setting is 480p with the installed model's 20-step configuration. Eight-step Turbo generation requires a matching installed LoRA; merely lowering the step count is not equivalent. Existing LoRAs are not automatically selected.

References are packaged into a queue ZIP in their supplied order, including up to three video/audio references. Missing files produce an error; unrelated uploads are never silently substituted. Wan2GP validates model-specific reference requirements.

OpenHiggs shows the current engine phase, progress, elapsed time, and a measured estimate for the current denoising pass. Loading, encoding, and final video conversion have no fabricated ETA. Closing the browser does not cancel the shared engine job; check Pinokio before retrying.

Original output remains in Wan2GP's configured output folder. A browser-compatible H.264/AAC MP4 copy is saved in `C:\openhiggs\data\generations`. Request/error logs are saved as `C:\openhiggs\logs\generation_*.jsonl`. The previous `scripts\wan_generate.py` is no longer called.

Implementation uses Gradio's queue protocol with state placeholders and trigger IDs from `/config`. Fetches must opt out of both Next.js caching and request deduplication, including an explicit AbortSignal, to avoid a stalled SSE reader on a cloned stream.

## Generation history
The video workspace opens directly to persistent History, with List, Grid and Masonry views, prompt search, status filters, video playback, details, prompt copying, settings reuse, and downloads. Records live in data\database\generation-history as individual JSON files. New requests save prompts, references, exposed settings, status and progress. Jobs interrupted by an OpenHiggs restart remain visible with a warning to check Wan2GP. Older videos can recover embedded model prompts, but missing original reference lists must be attached again.

Design references: https://higgsfield.ai/ai/video (History/View controls) and https://higgsfield.ai/creator-hub/help-center/getting-started/whats-in-my-higgsfield-account (asset details, copy, reuse and download).
