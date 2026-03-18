import { PlayerRef } from "@remotion/player";
import { useEffect, useRef } from "react";

/**
 * A hook that syncs the Remotion player's current frame with a callback.
 * It includes throttling during playback to avoid excessive React renders.
 */
export const usePlayerFrame = (
  playerRef: React.RefObject<PlayerRef | null>,
  onFrame: (frame: number) => void,
  dependencies: any[] = [],
) => {
  const lastFrameRef = useRef(0);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onFrameUpdate = (e: any) => {
      const newFrame = e.detail.frame;
      const isPlaying = playerRef.current?.isPlaying();

      if (isPlaying) {
        // Throttle updates during playback: only update every 3 frames (~10 times per second)
        // to avoid React's synchronous render limit at clip boundaries.
        if (Math.abs(newFrame - lastFrameRef.current) >= 3) {
          onFrame(newFrame);
          lastFrameRef.current = newFrame;
        }
      } else {
        // Full responsiveness when paused or seeking manually
        onFrame(newFrame);
        lastFrameRef.current = newFrame;
      }
    };

    player.addEventListener("frameupdate", onFrameUpdate);
    return () => player.removeEventListener("frameupdate", onFrameUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerRef, onFrame, ...dependencies]);
};
