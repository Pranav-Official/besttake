import { useCallback } from "react";
import { parseMedia } from "@remotion/media-parser";
import { useEditor } from "../context/EditorContext";
import { generateMockTranscription } from "../lib/mock-transcription";
import { SourceFile } from "../types/constants";

const generateThumbnail = (videoUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.currentTime = 1; // Capture at 1 second

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      } else {
        resolve("");
      }
      video.remove();
    };

    video.onerror = () => {
      resolve("");
      video.remove();
    };
  });
};

const fetchMetadata = async (videoUrl: string) => {
  try {
    const meta = await parseMedia({
      src: videoUrl,
      fields: { width: true, height: true, durationInSeconds: true },
    });
    return {
      width: Math.max(1, meta.width),
      height: Math.max(1, meta.height),
      durationInSeconds: meta.durationInSeconds,
    };
  } catch {
    return new Promise<{
      width: number;
      height: number;
      durationInSeconds: number;
    }>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve({
          width: Math.max(1, video.videoWidth),
          height: Math.max(1, video.videoHeight),
          durationInSeconds: video.duration || 1,
        });
      };
      video.onerror = () => reject(new Error("Manual metadata load failed"));
      video.src = videoUrl;
    });
  }
};

/**
 * A hook that manages video uploading and metadata extraction.
 */
export const useVideoUpload = () => {
  const {
    setSourceFiles,
    setNativeDimensions,
    setIsUnsupportedCodec,
    setIsTranscribing,
    setActiveFileId,
  } = useEditor();

  const handleSourceFileAdd = useCallback(
    async (src: string, name: string, serverUrl?: string) => {
      try {
        setIsUnsupportedCodec(false);
        const metadata = await fetchMetadata(src);

        if (metadata.width <= 1 || metadata.height <= 1) {
          setIsUnsupportedCodec(true);
        }

        const fileId = `file-${Date.now()}`;
        const thumbnailUrl = await generateThumbnail(src);

        const newSourceFile: SourceFile = {
          id: fileId,
          name: name,
          url: src,
          thumbnailUrl,
          serverUrl,
          transcription: [],
          width: metadata.width,
          height: metadata.height,
          duration: metadata.durationInSeconds || 20,
        };

        setSourceFiles((prev) => [...prev, newSourceFile]);
        setActiveFileId(fileId);
        setNativeDimensions({ width: metadata.width, height: metadata.height });

        if (serverUrl) {
          setIsTranscribing(true);
          try {
            const transcribeRes = await fetch("/api/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ videoSrc: serverUrl }),
            });

            if (!transcribeRes.ok) throw new Error("Transcription failed");

            const realTranscription = await transcribeRes.json();
            setSourceFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? { ...f, transcription: realTranscription }
                  : f,
              ),
            );
          } catch (err) {
            console.error("Transcription failed, falling back to mock:", err);
            const mockTranscription = generateMockTranscription(
              metadata.durationInSeconds ?? 20,
            );
            setSourceFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? { ...f, transcription: mockTranscription }
                  : f,
              ),
            );
          } finally {
            setIsTranscribing(false);
          }
        } else {
          const mockTranscription = generateMockTranscription(
            metadata.durationInSeconds ?? 20,
          );
          setSourceFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, transcription: mockTranscription } : f,
            ),
          );
        }
      } catch (err) {
        console.error("Critical error loading video metadata:", err);
      }
    },
    [
      setSourceFiles,
      setNativeDimensions,
      setIsUnsupportedCodec,
      setIsTranscribing,
      setActiveFileId,
    ],
  );

  const onUpload = useCallback(
    async (src: string, file: File, serverUrl?: string) => {
      await handleSourceFileAdd(src, file.name, serverUrl);
    },
    [handleSourceFileAdd],
  );

  const onLibrarySelect = useCallback(
    async (item: { name: string; url: string; filename: string }) => {
      await handleSourceFileAdd(item.url, item.name, item.url);
    },
    [handleSourceFileAdd],
  );

  return {
    onUpload,
    onLibrarySelect,
  };
};
