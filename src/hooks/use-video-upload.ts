import { useCallback } from "react";
import { parseMedia } from "@remotion/media-parser";
import { useEditor } from "../context/EditorContext";
import { generateMockTranscription } from "../lib/mock-transcription";

/**
 * A hook that manages video uploading and metadata extraction.
 */
export const useVideoUpload = () => {
  const {
    videoSrc,
    setVideoSrc,
    setServerVideoUrl,
    setTranscription,
    setClips,
    setNativeDimensions,
    setIsUnsupportedCodec,
    setIsTranscribing,
  } = useEditor();

  const onUpload = useCallback(
    async (src: string, file: File, serverUrl?: string) => {
      if (videoSrc && videoSrc.startsWith("blob:")) {
        URL.revokeObjectURL(videoSrc);
      }

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
            video.onerror = () =>
              reject(new Error("Manual metadata load failed"));
            video.src = videoUrl;
          });
        }
      };

      try {
        setIsUnsupportedCodec(false);
        const metadata = await fetchMetadata(src);

        if (metadata.width <= 1 || metadata.height <= 1) {
          setIsUnsupportedCodec(true);
        }

        setNativeDimensions({ width: metadata.width, height: metadata.height });
        setVideoSrc(src);
        setServerVideoUrl(serverUrl);

        if (serverUrl) {
          setIsTranscribing(true);
          try {
            const transcribeRes = await fetch("/api/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ videoSrc: serverUrl }),
            });

            if (!transcribeRes.ok) {
              throw new Error("Transcription failed");
            }

            const realTranscription = await transcribeRes.json();
            setTranscription(realTranscription);
          } catch (err) {
            console.error("Transcription failed, falling back to mock:", err);
            setTranscription(
              generateMockTranscription(metadata.durationInSeconds ?? 20),
            );
          } finally {
            setIsTranscribing(false);
          }
        } else {
          setTranscription(
            generateMockTranscription(metadata.durationInSeconds ?? 20),
          );
        }

        setClips([
          {
            id: "initial-clip",
            sourceStart: 0,
            sourceEnd: metadata.durationInSeconds ?? 20,
            logicalStart: 0,
            logicalEnd: metadata.durationInSeconds ?? 20,
          },
        ]);
      } catch (err) {
        console.error("Critical error loading video metadata:", err);
        setNativeDimensions({ width: 1280, height: 720 });
        setVideoSrc(src);
        setServerVideoUrl(serverUrl);
        setTranscription(generateMockTranscription(20));
        setClips([
          {
            id: "initial-clip",
            sourceStart: 0,
            sourceEnd: 20,
            logicalStart: 0,
            logicalEnd: 20,
          },
        ]);
      }
    },
    [
      videoSrc,
      setVideoSrc,
      setServerVideoUrl,
      setTranscription,
      setClips,
      setNativeDimensions,
      setIsUnsupportedCodec,
      setIsTranscribing,
    ],
  );

  return { onUpload };
};
