import React, { useMemo, useRef, useEffect, useState } from "react";
import { WordTranscription, Clip } from "../../types/constants";
import { cn } from "../lib/utils";

interface TimelineEditorProps {
  transcription: WordTranscription[];
  clips: Clip[];
  onClipsChange: (clips: Clip[]) => void;
  currentFrame: number;
  onSeek: (frame: number) => void;
  fps: number;
  className?: string;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  transcription,
  clips,
  onClipsChange,
  currentFrame,
  onSeek,
  fps,
  className,
}) => {
  const [zoom, setZoom] = useState(50); // pixels per second
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const processedClips = useMemo(() => {
    let accumulatedTimelineStart = 0;
    return clips.map((clip) => {
      const duration = clip.sourceEnd - clip.sourceStart;
      const timelineStart = accumulatedTimelineStart;
      accumulatedTimelineStart += duration;

      // Find text preview
      const wordsInClip = transcription.filter(
        (w) => w.start >= clip.sourceStart && w.end <= clip.sourceEnd,
      );
      const textPreview =
        wordsInClip
          .slice(0, 5)
          .map((w) => w.text)
          .join(" ") + (wordsInClip.length > 5 ? "..." : "");

      return {
        ...clip,
        duration,
        timelineStart,
        textPreview,
      };
    });
  }, [transcription, clips]);

  const totalEditedDuration = processedClips.reduce(
    (acc, clip) => acc + clip.duration,
    0,
  );
  const timelineWidth = totalEditedDuration * zoom;

  // Sync scroll to playhead when zooming
  useEffect(() => {
    if (containerRef.current) {
      const playheadPos = (currentFrame / fps) * zoom;
      const container = containerRef.current;
      const scrollLeft = playheadPos - container.clientWidth / 2;
      container.scrollLeft = scrollLeft;
    }
  }, [zoom]);

  // Keep playhead in view while playing
  useEffect(() => {
    if (containerRef.current) {
      const playheadPos = (currentFrame / fps) * zoom;
      const container = containerRef.current;
      const padding = 100;

      const isOutsideLeft = playheadPos < container.scrollLeft + padding;
      const isOutsideRight =
        playheadPos > container.scrollLeft + container.clientWidth - padding;

      if (isOutsideLeft || isOutsideRight) {
        container.scrollLeft = playheadPos - container.clientWidth / 2;
      }
    }
  }, [currentFrame, zoom, fps]);

  // Handle seeking
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / zoom;
    onSeek(Math.floor(time * fps));
  };

  const moveClip = (index: number, direction: "left" | "right") => {
    const nextIndex = direction === "left" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= clips.length) return;

    const newClips = [...clips];
    const temp = newClips[index];
    newClips[index] = newClips[nextIndex];
    newClips[nextIndex] = temp;
    onClipsChange(newClips);
  };

  const deleteClip = (index: number) => {
    onClipsChange(clips.filter((_, i) => i !== index));
  };

  const renderRuler = () => {
    const markers = [];
    const step = zoom < 20 ? 10 : zoom < 50 ? 5 : 1;
    for (let i = 0; i <= totalEditedDuration; i += step) {
      markers.push(
        <div
          key={i}
          className="absolute top-0 bottom-0 border-l border-[#1d417c] flex flex-col justify-end pb-1"
          style={{ left: i * zoom }}
        >
          <span className="text-[10px] text-[#9cb2d7]/40 ml-1">
            {Math.floor(i / 60)}:{String(Math.floor(i % 60)).padStart(2, "0")}
          </span>
        </div>,
      );
    }
    return markers;
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-[#022540] border-t border-[#1d417c] h-64",
        className,
      )}
    >
      {/* Timeline Header / Toolbar */}
      <div className="h-10 border-b border-[#1d417c] flex items-center justify-between px-4 shrink-0 bg-[#022540]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#9cb2d7]/80 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#9cb2d7]"></span>
            Video 1 ({clips.length} clips)
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="text-[#9cb2d7]/50 hover:text-white transition-colors">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              ></path>
            </svg>
          </button>
          <div className="flex items-center gap-2 group">
            <div className="w-32 h-1.5 bg-[#1d417c] rounded-full relative">
              <input
                type="range"
                min="10"
                max="300"
                value={zoom}
                onChange={(e) => setZoom(parseInt(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div
                className="absolute top-0 bottom-0 left-0 bg-[#9cb2d7] rounded-full pointer-events-none"
                style={{ width: `${((zoom - 10) / (300 - 10)) * 100}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-[#9cb2d7] rounded-full shadow-sm pointer-events-none"
                style={{
                  left: `calc(${((zoom - 10) / (300 - 10)) * 100}% - 6px)`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Timeline Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Labels */}
        <div className="w-32 border-r border-[#1d417c] flex flex-col shrink-0 bg-[#011626]/20 font-bold text-[10px] uppercase tracking-tighter text-[#9cb2d7]/40">
          <div className="h-8 border-b border-[#1d417c]"></div>{" "}
          {/* Time ruler label space */}
          <div className="flex-1 flex items-center px-3">Video 1</div>
        </div>

        {/* Scrollable Tracks */}
        <div
          ref={containerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar relative select-none"
        >
          <div
            ref={trackRef}
            className="relative h-full flex flex-col"
            style={{ width: Math.max(timelineWidth, 1000) }}
            onClick={handleTimelineClick}
          >
            {/* Time Ruler */}
            <div className="h-8 border-b border-[#1d417c] relative">
              {renderRuler()}
            </div>

            {/* Video Track */}
            <div className="flex-1 relative bg-[#011626]/20">
              {processedClips.map((clip, index) => (
                <div
                  key={`video-${clip.id}`}
                  className="absolute top-2 bottom-2 bg-[#1d417c]/40 border border-[#9cb2d7]/30 rounded-lg overflow-hidden flex flex-col group hover:border-[#9cb2d7]/60 transition-all shadow-[0_4px_10px_rgba(0,0,0,0.3)] backdrop-blur-sm"
                  style={{
                    left: clip.timelineStart * zoom,
                    width: Math.max(2, clip.duration * zoom - 2),
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex-1 p-2 flex flex-col items-start overflow-hidden">
                    <p className="text-[10px] font-medium text-[#f1f2f3] leading-tight line-clamp-1 mb-1">
                      "{clip.textPreview}"
                    </p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => moveClip(index, "left")}
                        disabled={index === 0}
                        className="bg-black/40 p-1 rounded hover:bg-black/60 disabled:opacity-20"
                      >
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="white"
                        >
                          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveClip(index, "right")}
                        disabled={index === clips.length - 1}
                        className="bg-black/40 p-1 rounded hover:bg-black/60 disabled:opacity-20"
                      >
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="white"
                        >
                          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteClip(index)}
                        className="bg-red/40 p-1 rounded hover:bg-red/60"
                      >
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="white"
                        >
                          <path d="M19 13H5v-2h14v2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="h-1 bg-[#9cb2d7]/20 w-full shrink-0" />
                </div>
              ))}
            </div>

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-[#7ead70] z-50 pointer-events-none"
              style={{ left: (currentFrame / fps) * zoom }}
            >
              {/* Green Triangle Handle */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M0 0H16L8 8L0 0Z" fill="#7ead70" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
