import sys
import json
import os

# Add venv's nvidia libraries to LD_LIBRARY_PATH for the current process
# This is required for faster-whisper to find libcublas.so.12 and others
venv_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if not venv_base.endswith("venv"):
    # If not running from src/runner, adjust. Let's assume project root/venv
    venv_base = os.path.join(os.getcwd(), "venv")

nvidia_libs_path = os.path.join(
    venv_base, "lib", "python3.14", "site-packages", "nvidia", "cublas", "lib"
)
if os.path.exists(nvidia_libs_path):
    # For CUDA 12 / faster-whisper / ctranslate2
    # We need to add the various nvidia-*/lib folders to the search path
    site_packages = os.path.join(venv_base, "lib", "python3.14", "site-packages")
    lib_paths = [
        os.path.join(site_packages, "nvidia", "cublas", "lib"),
        os.path.join(site_packages, "nvidia", "cudnn", "lib"),
        os.path.join(
            site_packages, "nvidia", "cublas", "cu12", "lib"
        ),  # some versions use this structure
    ]

    current_ld = os.environ.get("LD_LIBRARY_PATH", "")
    new_ld = ":".join(lib_paths + ([current_ld] if current_ld else []))
    os.environ["LD_LIBRARY_PATH"] = new_ld

    # On some systems, we might need to use ctypes to pre-load or set paths
    # but usually setting os.environ["LD_LIBRARY_PATH"] before imports is enough
    # or just relying on the fact that we'll try CUDA then CPU.

from faster_whisper import WhisperModel


def transcribe(file_path):
    # Model size can be "base", "small", "medium", "large-v3", etc.
    model_size = "distil-large-v3"

    print(f"Initializing WhisperModel (size={model_size})...", file=sys.stderr)

    # Try to use CUDA if available, otherwise fall back to CPU
    model = None
    try:
        # Check if CUDA is actually available via environment or other means
        # faster-whisper will throw if it can't find libraries
        model = WhisperModel(model_size, device="cuda", compute_type="float16")
        print("Using CUDA for transcription", file=sys.stderr)

        # Test if CUDA actually works
        print(
            f"Starting transcription for {file_path} (trying CUDA)...", file=sys.stderr
        )
        segments, info = model.transcribe(
            file_path,
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
        )
        # We need to iterate segments to actually trigger the work
        word_transcription = process_segments(segments)
        print(
            f"Transcription complete (CUDA). Found {len(word_transcription)} words.",
            file=sys.stderr,
        )
        return word_transcription
    except Exception as e:
        print(f"CUDA failed or lib missing: {e}. Falling back to CPU.", file=sys.stderr)
        # compute_type="int8" is good for CPU speed
        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        print("Using CPU for transcription", file=sys.stderr)

        print(
            f"Starting transcription for {file_path} (trying CPU)...", file=sys.stderr
        )
        segments, info = model.transcribe(
            file_path,
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
        )
        word_transcription = process_segments(segments)
        print(
            f"Transcription complete (CPU). Found {len(word_transcription)} words.",
            file=sys.stderr,
        )
        return word_transcription


def process_segments(segments):
    word_transcription = []
    word_id_counter = 0

    print("Processing segments...", file=sys.stderr)
    for segment in segments:
        if segment.words:
            for word in segment.words:
                word_transcription.append(
                    {
                        "id": str(word_id_counter),
                        "text": word.word.strip(),
                        "start": word.start,
                        "end": word.end,
                    }
                )
                word_id_counter += 1
    return word_transcription


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python transcribe.py <file_path>")
        sys.exit(1)

    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found")
        sys.exit(1)

    try:
        result = transcribe(file_path)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
