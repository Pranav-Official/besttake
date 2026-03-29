import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Clip, SourceFile } from "../types/constants";

/**
 * A hook that manages the video rendering process (export),
 * including starting the render and polling for its status.
 */
export const useRenderManager = () => {
  const [renderId, setRenderId] = useState<string | null>(null);

  const startRenderMutation = useMutation({
    mutationFn: async ({
      serverVideoUrl,
      sourceFiles,
      clips,
      dimensions,
    }: {
      serverVideoUrl?: string;
      sourceFiles: SourceFile[];
      clips: Clip[];
      dimensions: { width: number; height: number };
    }) => {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoSrc: serverVideoUrl,
          sourceFiles,
          clips,
          dimensions,
        }),
      });

      if (!response.ok) throw new Error("Failed to start render");
      const data = await response.json();
      setRenderId(data.id);
      return data;
    },
  });

  const statusQuery = useQuery({
    queryKey: ["renderStatus", renderId],
    queryFn: async () => {
      if (!renderId) return null;
      const res = await fetch(`/api/render?id=${renderId}`);
      if (!res.ok) throw new Error("Failed to fetch render status");
      return res.json();
    },
    enabled: !!renderId,
    refetchInterval: (query) => (query.state.data?.done ? false : 1000),
  });

  const cancelRenderMutation = useMutation({
    mutationFn: async () => {
      if (!renderId) return;
      const res = await fetch(`/api/render?id=${renderId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to cancel render");
      return res.json();
    },
    onSuccess: () => {
      setRenderId(null);
    },
  });

  const reset = () => {
    setRenderId(null);
    startRenderMutation.reset();
  };

  return {
    startRender: startRenderMutation.mutateAsync,
    cancelRender: cancelRenderMutation.mutateAsync,
    isRendering: !!renderId && !statusQuery.data?.done,
    progress: statusQuery.data?.progress ?? 0,
    status: statusQuery.data?.status ?? "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: (startRenderMutation.error || statusQuery.error) as any,
    downloadUrl: statusQuery.data?.url ?? null,
    renderId,
    reset,
  };
};
