import { useQuery } from "@tanstack/react-query";
import { WordTranscription } from "../types/constants";
import { generateMockTranscription } from "../lib/mock-transcription";

/**
 * A hook that manages the transcription of a video using TanStack Query.
 */
export const useTranscription = (
  serverVideoUrl?: string,
  durationInSeconds?: number,
) => {
  return useQuery({
    queryKey: ["transcription", serverVideoUrl],
    queryFn: async (): Promise<WordTranscription[]> => {
      if (!serverVideoUrl) return [];

      try {
        const transcribeRes = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoSrc: serverVideoUrl }),
        });

        if (!transcribeRes.ok) {
          throw new Error("Transcription failed");
        }

        return await transcribeRes.json();
      } catch (err) {
        console.error("Transcription failed, falling back to mock:", err);
        return generateMockTranscription(durationInSeconds ?? 20);
      }
    },
    enabled: !!serverVideoUrl,
    staleTime: Infinity, // Keep transcription for the session
  });
};
