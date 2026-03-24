import { useQuery } from "@tanstack/react-query";
import { generateFirstFrameThumbnail } from "../../../hooks/use-library";

interface LibraryThumbnailProps {
  url: string;
  name: string;
}

/**
 * A component that uses TanStack Query to derive a thumbnail from a video URL.
 * Adheres to Rule 1 and Rule 2 (Derive/Use Data Fetching Library instead of useEffect).
 */
export const LibraryThumbnail: React.FC<LibraryThumbnailProps> = ({ url, name }) => {
  const { data: thumbnailUrl, isLoading } = useQuery({
    queryKey: ["thumbnail", url],
    queryFn: () => generateFirstFrameThumbnail(url),
    staleTime: Infinity, // Caches the thumbnail for the entire session
  });

  if (isLoading || !thumbnailUrl) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
        <div className="w-6 h-6 border-2 border-[#9cb2d7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={thumbnailUrl}
      alt={name}
      className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
    />
  );
};
