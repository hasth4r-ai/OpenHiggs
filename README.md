# OpenHiggs

> **The modern, open-source AI video, inpainting, and cinema studio.** Powered locally by Wan 2.1 (Vace 14B FusioniX) and MiniMax H3 with zero cloud dependency.

---

## ✨ Features

- **🎬 Video Inpainting Studio**:
  - High-fidelity masked video editing powered by **Wan 2.1 (Vace 14B FusioniX)**.
  - Native **Apple ProRes 422 HQ** master export and fast MP4 preview.
  - Automatic hollow-mask dilation, edge feathering, and clean plate reference injection via MVAKI.
- **🎥 Video Generation Studio**:
  - Text-to-Video and Image-to-Video with realistic camera choreography (Tracking, Push-In, Orbit, Drone).
  - Authentic Higgsfield **Keyframe Progression** (`Start -> End` first & last frame animation).
  - Multi-reference support (character identity, costume style, environment anchors).
- **🕹️ Motion Control Studio**:
  - 15+ camera movement presets (Pan, Tilt, Zoom, Roll, Crane, Orbit, Handheld) with 10-level speed cadence.
- **💾 Complete Workspace Persistence**:
  - Prompts, settings, uploaded files, and active workflow tabs automatically persist across page refreshes.
- **🔒 100% Local & Private**:
  - Runs entirely on local hardware with zero external API calls or subscriptions.
  - Strict privacy protections ensure zero user media or generation files are committed to Git.
- **🌐 LAN Shared Models Architecture**:
  - Centralized model depot support so multiple team members on the same network can share heavy checkpoints without duplicating 100GB+ downloads.

---

## 🚀 Quick Start (Local Setup)

1. **Launch the Engine & Studio**:
   Double-click `Start OpenHiggs.cmd` in the root folder.
2. **Access OpenHiggs**:
   Open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.
3. **Stop OpenHiggs**:
   Double-click `Stop OpenHiggs.cmd` to cleanly release all GPU memory and background processes.

---

## 🛠️ Tech Stack

- **Frontend & App Shell**: Next.js 15, React 19, Tailwind CSS, Electron.
- **Backend**: Node.js API routes with real-time SSE progress streaming.
- **Local AI Engine**: Wan 2.1 14B VACE & MiniMax H3 via local Python CUDA pipeline.
- **Media Pipeline**: FFmpeg with native ProRes encoding and automated color-space preservation.

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
