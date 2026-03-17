# Best Take 🎬

**Best Take** is a high-performance, speech-based video editor that allows you to edit video by editing text. It leverages AI-powered transcription and local rendering to provide a seamless, privacy-focused video editing experience.

## ✨ Features

- **AI Transcription:** Automatic word-level transcription using `faster-whisper` running locally.
- **Text-Based Editing:** Cut, reorder, or delete parts of your video simply by interacting with the transcript.
- **Auto-Trim Silences:** Automatically detect and remove silent parts of your video using Remotion's `getSilentParts()`.
- **Clean Jump Cuts:** Adjustable "Clip Padding" (0.1s - 0.9s) to ensure transitions between cuts sound natural and "breathable."
- **Local Rendering:** High-performance video export powered by Remotion, running entirely on your machine.
- **Full History:** Multi-level Undo/Redo support for all timeline operations.
- **Aspect Ratio Control:** Switch between 16:9, 9:16, 1:1, or original dimensions on the fly.

## 🏗️ Architecture

- **Frontend:** Next.js (App Router) with Tailwind CSS.
- **Video Engine:** [Remotion](https://remotion.dev/) for frame-accurate playback and headless rendering.
- **Transcription Bridge:** A Python-Node bridge that executes `faster-whisper` in a local virtual environment for maximum accuracy.
- **State Management:** Custom history-tracked state for clip sequences and word-level mappings.

## 🚀 Getting Started

### Prerequisites

- **Node.js:** v18 or later.
- **Python:** 3.9+ (for transcription).
- **FFmpeg:** Installed and available in your system PATH.

### Installation

1. **Clone and Install Dependencies:**

   ```bash
   npm install
   ```

2. **Setup Python Virtual Environment:**

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install faster-whisper
   ```

3. **Configure Environment:**
   Ensure `public/uploads` and `public/renders` directories exist:

   ```bash
   mkdir -p public/uploads public/renders
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```

## 🛠️ Commands

- `npm run dev`: Start the Next.js development server.
- `npx remotion studio`: Open the Remotion Studio to preview compositions.
- `npm run lint`: Run the project linter.

## 📝 How it Works

1. **Upload:** Upload a video file. It is stored locally in `public/uploads`.
2. **Transcribe:** The system triggers a local Python script to generate a word-level JSON transcript.
3. **Edit:** Select words in the `TranscriptionView` to delete them, or drag clips in the `TimelineEditor` to reorder segments.
4. **Padding & Silence:** Use the toolbar to tweak jump-cut padding or automatically strip silences from the footage.
5. **Export:** Click "Export Video" to bundle the project and render a final `.mp4` using your local CPU/GPU.

## ⚖️ License

Best Take is built on top of Remotion. Note that for some entities, a Remotion company license is required. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
