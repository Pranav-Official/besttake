import React, { useMemo } from "react";
import { WordTranscription } from "../../types/constants";
import { cn } from "../lib/utils";

interface TimelineViewProps {
  transcription: WordTranscription[];
  deletedWordIds: Set<string>;
  durationInFrames: number;
  currentFrame: number;
  onSeek: (frame: number) => void;
  className?: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  transcription,
  deletedWordIds,
  durationInFrames,
  currentFrame,
  onSeek,
  className,
}) => {
  const clips = useMemo(() => {
    if (!transcription || transcription.length === 0) return [];

    const result: {
      start: number;
      end: number;
      duration: number;
      timelineStart: number;
    }[] = [];
    let currentClip: { start: number; end: number } | null = null;
    let accumulatedTimelineStart = 0;

    transcription.forEach((word) => {
      const isDeleted = deletedWordIds.has(word.id);

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
            ...currentClip,
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
        ...currentClip,
        duration,
        timelineStart: accumulatedTimelineStart,
      });
    }

    return result;
  }, [transcription, deletedWordIds]);

  const totalDuration = useMemo(() => {
    return clips.reduce((acc, clip) => acc + clip.duration, 0);
  }, [clips]);

  return (
    <div
      className={cn(
        "relative w-full h-8 bg-[#011626]/50 rounded-lg border border-[#1d417c] overflow-hidden group",
        className,
      )}
    >
      {/* Clip visualization */}
      <div className="absolute inset-0 flex">
        {clips.map((clip, index) => (
          <div
            key={`${clip.start}-${index}`}
            style={{
              width: `${(clip.duration / totalDuration) * 100}%`,
              marginLeft: index > 0 ? "2px" : "0", // Show a small gap/line for the cut
            }}
            className="h-full bg-[#9cb2d7]/20 border-r border-[#9cb2d7]/40 last:border-0 relative"
          >
            {/* Cut indicator (except first) */}
            {index > 0 && (
              <div className="absolute left-[-2px] top-0 bottom-0 w-[2px] bg-[#ef4444]/60 z-10" />
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div
        className="absolute top-0 bottom-0 left-0 bg-[#7ead70]/40 border-r-2 border-[#7ead70] transition-all duration-75 z-20 pointer-events-none"
        style={{ width: `${(currentFrame / durationInFrames) * 100}%` }}
      />

      {/* Clickable area for seeking */}
      <div
        className="absolute inset-0 z-30 cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const percentage = x / rect.width;
          onSeek(Math.floor(percentage * durationInFrames));
        }}
      />
    </div>
  );
};
