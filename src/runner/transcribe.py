import sys
import json
import os
from faster_whisper import WhisperModel

def transcribe(file_path):
    # Model size can be "base", "small", "medium", "large-v3", etc.
    model_size = "base"

    # Try to use CUDA if available, otherwise fall back to CPU
    try:
        # compute_type="float16" is standard for GPU
        model = WhisperModel(model_size, device="cuda", compute_type="float16")
    except Exception:
        # compute_type="int8" is good for CPU speed
        model = WhisperModel(model_size, device="cpu", compute_type="int8")

    # Transcribe with word-level timestamps and VAD filter
    segments, info = model.transcribe(
        file_path,
        beam_size=5,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500),
    )

    word_transcription = []
    word_id_counter = 0

    for segment in segments:
        if segment.words:
            for word in segment.words:
                word_transcription.append({
                    "id": str(word_id_counter),
                    "text": word.word.strip(),
                    "start": word.start,
                    "end": word.end
                })
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
