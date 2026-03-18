import { useMutation } from "@tanstack/react-query";

/**
 * A hook that manages the asynchronous silence detection process.
 */
export const useSilenceDetection = () => {
  return useMutation({
    mutationFn: async ({
      serverVideoUrl,
      noiseThreshold,
      minDuration,
    }: {
      serverVideoUrl: string;
      noiseThreshold: number;
      minDuration: number;
    }): Promise<{ startInSeconds: number; endInSeconds: number }[]> => {
      const res = await fetch("/api/silence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoSrc: serverVideoUrl,
          noiseThresholdInDecibels: noiseThreshold,
          minDurationInSeconds: minDuration,
        }),
      });

      if (!res.ok) throw new Error("Silence detection failed");
      const { audibleParts } = await res.json();
      return audibleParts;
    },
  });
};
