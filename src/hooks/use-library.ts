import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface LibraryItem {
  id: string;
  name: string;
  filename: string;
  url: string;
  size: number;
  mtime: string;
  hasTranscription: boolean;
}

/**
 * A hook that manages the server-side library using TanStack Query.
 */
export const useLibrary = () => {
  const queryClient = useQueryClient();

  const query = useQuery<LibraryItem[]>({
    queryKey: ["library"],
    queryFn: async () => {
      const res = await fetch("/api/library");
      if (!res.ok) throw new Error("Failed to fetch library");
      return res.json();
    },
    staleTime: 60000, // 1 minute
  });

  const deleteMutation = useMutation({
    mutationFn: async (filename: string) => {
      const res = await fetch(
        `/api/library?filename=${encodeURIComponent(filename)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to delete file");
      return res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch library after a successful deletion
      queryClient.invalidateQueries({ queryKey: ["library"] });
    },
  });

  return {
    library: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    deleteFile: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};

/**
 * Helper to generate a thumbnail from a video URL.
 * Used inside useQuery to keep it out of useEffect.
 */
export const generateFirstFrameThumbnail = (videoUrl: string): Promise<string> => {
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
