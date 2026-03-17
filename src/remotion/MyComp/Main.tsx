import { AbsoluteFill, Video, Series, useVideoConfig } from "remotion";
import { useMemo } from "react";
import { z } from "zod";
import { CompositionProps } from "../../../types/constants";

interface Clip {
  id: string;
  start: number;
  end: number;
  duration: number;
  timelineStart: number;
}

export const Main = ({
  videoSrc,
  transcription = [],
  deletedWordIds = [],
}: z.infer<typeof CompositionProps>) => {
  const { fps } = useVideoConfig();

  // 1. Calculate non-deleted clips
  const clips = useMemo(() => {
    if (!transcription || transcription.length === 0) return [];

    const deletedSet = new Set(deletedWordIds);
    const result: Clip[] = [];
    let currentClip: { start: number; end: number } | null = null;
    let accumulatedTimelineStart = 0;

    transcription.forEach((word) => {
      const isDeleted = deletedSet.has(word.id);

      if (!isDeleted) {
        if (!currentClip) {
          currentClip = { start: word.start, end: word.end };
        } else {
          currentClip.end = word.end;
        }
      } else {
        if (currentClip) {
          const duration = currentClip.end - currentClip.start;
          result.push({
            id: `clip-${result.length}`,
            start: currentClip.start,
            end: currentClip.end,
            duration,
            timelineStart: accumulatedTimelineStart,
          });
          accumulatedTimelineStart += duration;
          currentClip = null;
        }
      }
    });

    if (currentClip) {
      const duration = currentClip.end - currentClip.start;
      result.push({
        id: `clip-${result.length}`,
        start: currentClip.start,
        end: currentClip.end,
        duration,
        timelineStart: accumulatedTimelineStart,
      });
    }

    return result;
  }, [transcription, deletedWordIds]);

  return (
    <AbsoluteFill style={{ backgroundColor: videoSrc ? "black" : "#011626" }}>
      {videoSrc ? (
        <AbsoluteFill>
          <Series>
            {clips.map((clip) => (
              <Series.Sequence
                key={`${clip.id}-${clip.start}`}
                durationInFrames={Math.max(1, Math.ceil(clip.duration * fps))}
                // PREMOUNTING is key to avoid black frames!
                premountFor={fps}
              >
                <Video
                  src={videoSrc}
                  startFrom={Math.floor(clip.start * fps)}
                  endAt={Math.ceil(clip.end * fps)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </Series.Sequence>
            ))}
          </Series>

          {clips.length === 0 && transcription.length > 0 && (
            <AbsoluteFill className="items-center justify-center bg-[#011626]">
              <p className="text-[#ef4444] font-bold">All content deleted</p>
            </AbsoluteFill>
          )}
        </AbsoluteFill>
      ) : (
        <AbsoluteFill className="items-center justify-center">
          <p className="text-[#9cb2d7]">No video source</p>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
