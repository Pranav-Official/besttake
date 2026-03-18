import React, { useMemo, useRef, useEffect, useState } from "react";
import { WordTranscription, Clip } from "../types/constants";
import { cn } from "../lib/utils";

interface TimelineEditorProps {
  transcription: WordTranscription[];
  clips: Clip[];
  onClipsChange: (clips: Clip[]) => void;
  currentFrame: number;
  onSeek: (frame: number) => void;
  fps: number;
  paddingEnabled: boolean;
  onPaddingEnabledChange: (enabled: boolean) => void;
  paddingDuration: number;
  onPaddingDurationChange: (duration: number) => void;
  onTrimSilences: (noiseThreshold: number, minDuration: number) => void;
  isTrimmingSilences: boolean;
  onSplitAtPlayhead?: () => void;
  className?: string;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  transcription,
  clips,
  onClipsChange,
  currentFrame,
  onSeek,
  fps,
  paddingEnabled,
  onPaddingEnabledChange,
  paddingDuration,
  onPaddingDurationChange,
  onTrimSilences,
  isTrimmingSilences,
  onSplitAtPlayhead,
  className,
}) => {
  const [zoom, setZoom] = useState(50); // pixels per second
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Tools State
  const [isGrabMode, setIsGrabMode] = useState(false);
  const [showSilenceTool, setShowSilenceTool] = useState(false);
  const [noiseThreshold, setNoiseThreshold] = useState(-20);
  const [minDuration, setMinDuration] = useState(0.5);

  // Dragging/Reordering State
  const [reorderState, setReorderState] = useState<{
    draggedIndex: number;
    tempClips: Clip[];
  } | null>(null);

  // Trimming State
  const [trimmingState, setTrimmingState] = useState<{
    clipId: string;
    handle: "left" | "right";
    initialX: number;
    initialValue: number;
    initialTimelineStarts: Record<string, number>;
    tempClips: Clip[];
  } | null>(null);

  // Use a ref to keep track of the current trimmingState without triggering useEffect re-runs
  const trimmingStateRef = useRef(trimmingState);
  useEffect(() => {
    trimmingStateRef.current = trimmingState;
  }, [trimmingState]);

  const processedClips = useMemo(() => {
    let sourceClips = clips;
    if (reorderState) {
      sourceClips = reorderState.tempClips;
    } else if (trimmingState) {
      sourceClips = trimmingState.tempClips;
    }

    let accumulatedTimelineStart = 0;
    return sourceClips.map((clip) => {
      const duration = clip.sourceEnd - clip.sourceStart;

      // If we are trimming or reordering, we use the CAPTURED starting positions to create "gaps"
      // or to maintain the visual position during reorder.
      // For reordering, we actually want it to snap in real-time,
      // but for trimming, we want gaps.

      let timelineStart = accumulatedTimelineStart;

      if (trimmingState) {
        timelineStart = trimmingState.initialTimelineStarts[clip.id] ?? 0;
        // Special case: If we are trimming the LEFT handle of THIS clip,
        // its visual start position in the timeline must move to create a gap/overlap
        if (
          trimmingState.clipId === clip.id &&
          trimmingState.handle === "left"
        ) {
          const delta = clip.sourceStart - trimmingState.initialValue;
          timelineStart += delta;
        }
      }

      accumulatedTimelineStart += duration;

      // Find text preview from the unified transcription
      // The unified transcription words have 'start' and 'end' in timeline time
      const wordsInClip = transcription.filter(
        (w) =>
          w.start >= timelineStart - 0.01 &&
          w.end <= timelineStart + duration + 0.01,
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
  }, [transcription, clips, trimmingState, reorderState]);

  const totalEditedDuration = useMemo(() => {
    if (processedClips.length === 0) return 0;
    const lastClip = processedClips[processedClips.length - 1];

    // For trimming, we need to account for gaps that might extend beyond the last clip's end
    if (trimmingState) {
      return Math.max(
        ...processedClips.map((c) => c.timelineStart + c.duration),
      );
    }

    return lastClip.timelineStart + lastClip.duration;
  }, [processedClips, trimmingState]);
  const timelineWidth = totalEditedDuration * zoom;

  // Sync scroll to playhead when zooming
  useEffect(() => {
    if (containerRef.current) {
      const playheadPos = (currentFrame / fps) * zoom;
      const container = containerRef.current;
      const scrollLeft = playheadPos - container.clientWidth / 2;
      container.scrollLeft = scrollLeft;
    }
  }, [zoom, currentFrame, fps]);

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
    if (!trackRef.current || isGrabMode) return;
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

  const handleDragStart = (e: React.MouseEvent, index: number) => {
    if (!isGrabMode) return;
    e.stopPropagation();
    e.preventDefault();
    setReorderState({
      draggedIndex: index,
      tempClips: [...clips],
    });
  };

  useEffect(() => {
    if (reorderState === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container || !reorderState) return;

      const rect = container.getBoundingClientRect();
      const deltaX = e.clientX - rect.left;
      const mouseTimelinePos = (deltaX + container.scrollLeft) / zoom;

      // Find the new index based on mouse position
      let newIndex = 0;
      let currentPos = 0;
      const currentTempClips = reorderState.tempClips;
      const originalClip = currentTempClips[reorderState.draggedIndex];

      const clipsWithoutDragged = currentTempClips.filter(
        (_, i) => i !== reorderState.draggedIndex,
      );

      for (let i = 0; i < clipsWithoutDragged.length; i++) {
        const duration =
          clipsWithoutDragged[i].sourceEnd - clipsWithoutDragged[i].sourceStart;
        if (mouseTimelinePos > currentPos + duration / 2) {
          newIndex = i + 1;
        }
        currentPos += duration;
      }

      if (newIndex !== reorderState.draggedIndex) {
        const nextClips = [...clipsWithoutDragged];
        nextClips.splice(newIndex, 0, originalClip);

        setReorderState({
          draggedIndex: newIndex,
          tempClips: nextClips,
        });
      }
    };

    const handleMouseUp = () => {
      if (reorderState) {
        onClipsChange(reorderState.tempClips);
      }
      setReorderState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [reorderState, zoom, onClipsChange]);

  const handleTrimStart = (
    e: React.MouseEvent,
    clipId: string,
    handle: "left" | "right",
    currentValue: number,
  ) => {
    e.stopPropagation();
    e.preventDefault();

    // 1. Capture current timeline starts for all clips to create "gaps" during drag
    const initialTimelineStarts: Record<string, number> = {};
    let accumulated = 0;
    clips.forEach((c) => {
      initialTimelineStarts[c.id] = accumulated;
      accumulated += c.sourceEnd - c.sourceStart;
    });

    setTrimmingState({
      clipId,
      handle,
      initialX: e.clientX,
      initialValue: currentValue,
      initialTimelineStarts,
      tempClips: [...clips],
    });
  };

  useEffect(() => {
    if (!trimmingState?.clipId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentTrimmingState = trimmingStateRef.current;
      if (!currentTrimmingState) return;

      const deltaX = e.clientX - currentTrimmingState.initialX;
      const deltaTime = deltaX / zoom;
      const newValue = Math.max(
        0,
        currentTrimmingState.initialValue + deltaTime,
      );

      let constrainedValue = newValue;
      let targetTimelineSeekFrame = 0;

      const nextTempClips = currentTrimmingState.tempClips.map((clip) => {
        if (clip.id !== currentTrimmingState.clipId) return clip;

        if (currentTrimmingState.handle === "left") {
          constrainedValue = Math.min(newValue, clip.sourceEnd - 0.1);
          const delta = constrainedValue - currentTrimmingState.initialValue;
          const timelineStart =
            (currentTrimmingState.initialTimelineStarts[clip.id] ?? 0) + delta;
          targetTimelineSeekFrame = Math.floor(timelineStart * fps);

          return {
            ...clip,
            sourceStart: constrainedValue,
            logicalStart: constrainedValue,
          };
        } else {
          constrainedValue = Math.max(newValue, clip.sourceStart + 0.1);
          const timelineStart =
            currentTrimmingState.initialTimelineStarts[clip.id] ?? 0;
          const duration = constrainedValue - clip.sourceStart;
          targetTimelineSeekFrame = Math.floor(
            (timelineStart + duration) * fps,
          );

          return {
            ...clip,
            sourceEnd: constrainedValue,
            logicalEnd: constrainedValue,
          };
        }
      });

      // 1. Seek the player (Side effect)
      // Seek to the point in the edited timeline where the frame is being trimmed
      onSeek(targetTimelineSeekFrame);

      // 2. Update local state for visual gaps/overlaps
      setTrimmingState({ ...currentTrimmingState, tempClips: nextTempClips });
    };

    const handleMouseUp = () => {
      const finalTrimmingState = trimmingStateRef.current;
      if (finalTrimmingState) {
        // 3. Commit the final state to the global clips (this triggers the "Snap")
        onClipsChange(finalTrimmingState.tempClips);
      }
      setTrimmingState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [trimmingState?.clipId, zoom, fps, onClipsChange, onSeek]);

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

          <div className="flex items-center gap-1.5 ml-2 border-l border-[#1d417c] pl-3">
            {/* Split Tool */}
            <button
              onClick={onSplitAtPlayhead}
              className="w-7 h-7 flex items-center justify-center rounded bg-[#011626]/40 border border-[#1d417c] text-[#9cb2d7] hover:bg-[#1d417c]/40 hover:text-[#f1f2f3] transition-all"
              title="Split at Playhead"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="6" cy="6" r="3"></circle>
                <circle cx="6" cy="18" r="3"></circle>
                <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
                <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
                <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
              </svg>
            </button>

            {/* Grab Mode Tool */}
            <button
              onClick={() => setIsGrabMode(!isGrabMode)}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded border transition-all",
                isGrabMode
                  ? "bg-[#9cb2d7] border-[#9cb2d7] text-[#011626]"
                  : "bg-[#011626]/40 border-[#1d417c] text-[#9cb2d7] hover:bg-[#1d417c]/40 hover:text-[#f1f2f3]",
              )}
              title={
                isGrabMode
                  ? "Exit Grab Mode"
                  : "Enter Grab Mode (Reorder Clips)"
              }
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0V12m-3 .5a1.5 1.5 0 003 0m0 0V4a1.5 1.5 0 113 0v10m-3-2a1.5 1.5 0 013 0m0 0V6a1.5 1.5 0 113 0v10m-3-2.5a1.5 1.5 0 013 0m0 0V14a1.5 1.5 0 013 0m0 0h.5a1.5 1.5 0 011.5 1.5v2.5a4 4 0 01-4 4H10a4 4 0 01-4-4v-1.5"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Trim Silences Tool */}
          <div className="relative">
            <button
              onClick={() => setShowSilenceTool(!showSilenceTool)}
              disabled={isTrimmingSilences}
              className={cn(
                "h-7 px-2 flex items-center gap-1.5 rounded bg-[#011626]/40 border border-[#1d417c] text-[10px] font-bold text-[#9cb2d7] hover:bg-[#1d417c]/40 hover:text-[#f1f2f3] transition-all",
                isTrimmingSilences && "opacity-50 cursor-not-allowed",
              )}
              title="Auto-trim silences"
            >
              {isTrimmingSilences ? (
                <>
                  <div className="w-2.5 h-2.5 border-2 border-[#9cb2d7] border-t-transparent rounded-full animate-spin"></div>
                  <span>TRIMMING...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <span>TRIM SILENCES</span>
                </>
              )}
            </button>

            {showSilenceTool && (
              <div className="absolute top-full mt-2 right-0 w-56 bg-[#022540] border border-[#1d417c] rounded-lg shadow-2xl p-4 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-[#9cb2d7] uppercase tracking-wider">
                        Noise Threshold
                      </label>
                      <span className="text-[10px] font-mono text-[#f1f2f3]">
                        {noiseThreshold} dB
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-60"
                      max="30"
                      step="1"
                      value={noiseThreshold}
                      onChange={(e) =>
                        setNoiseThreshold(parseInt(e.target.value))
                      }
                      className="w-full h-1 bg-[#1d417c] rounded-full appearance-none cursor-pointer accent-[#9cb2d7]"
                    />
                    <div className="flex justify-between text-[8px] text-[#9cb2d7]/40 uppercase">
                      <span>Quiet</span>
                      <span>Loud</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-[#9cb2d7] uppercase tracking-wider">
                        Min Silence Duration
                      </label>
                      <span className="text-[10px] font-mono text-[#f1f2f3]">
                        {minDuration}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="2.0"
                      step="0.1"
                      value={minDuration}
                      onChange={(e) =>
                        setMinDuration(parseFloat(e.target.value))
                      }
                      className="w-full h-1 bg-[#1d417c] rounded-full appearance-none cursor-pointer accent-[#9cb2d7]"
                    />
                    <div className="flex justify-between text-[8px] text-[#9cb2d7]/40 uppercase">
                      <span>Short</span>
                      <span>Long</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-[#1d417c]">
                    <button
                      onClick={() => setShowSilenceTool(false)}
                      className="flex-1 px-3 py-1.5 rounded bg-transparent text-[#9cb2d7] hover:text-[#f1f2f3] text-[10px] font-bold transition-all uppercase"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onTrimSilences(noiseThreshold, minDuration);
                        setShowSilenceTool(false);
                      }}
                      className="flex-1 px-3 py-1.5 rounded bg-[#9cb2d7] text-[#011626] hover:bg-[#f1f2f3] text-[10px] font-bold transition-all uppercase"
                    >
                      Process
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Clip Padding Tool */}
          <div
            className="flex items-center bg-[#011626]/40 rounded-md border border-[#1d417c] p-0.5"
            title="Clip Padding"
          >
            <button
              onClick={() => onPaddingEnabledChange(!paddingEnabled)}
              className={cn(
                "w-6 h-6 rounded flex items-center justify-center transition-all",
                paddingEnabled
                  ? "bg-[#9cb2d7] text-[#011626]"
                  : "text-[#9cb2d7]/40 hover:text-[#9cb2d7]",
              )}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M8 7h8M8 12h8m-8 5h8"
                />
              </svg>
            </button>
            <div className="flex items-center ml-1 pr-1 border-l border-[#1d417c]">
              <input
                type="number"
                min="0.1"
                max="0.9"
                step="0.1"
                value={paddingDuration}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    onPaddingDurationChange(
                      Number(Math.max(0.1, Math.min(0.9, val)).toFixed(1)),
                    );
                  }
                }}
                className="w-10 bg-transparent text-[10px] font-bold text-center text-[#9cb2d7] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() =>
                    onPaddingDurationChange(
                      Number(Math.min(0.9, paddingDuration + 0.1).toFixed(1)),
                    )
                  }
                  className="text-[#9cb2d7]/40 hover:text-white leading-none text-[8px]"
                >
                  ▲
                </button>
                <button
                  onClick={() =>
                    onPaddingDurationChange(
                      Number(Math.max(0.1, paddingDuration - 0.1).toFixed(1)),
                    )
                  }
                  className="text-[#9cb2d7]/40 hover:text-white leading-none text-[8px]"
                >
                  ▼
                </button>
              </div>
              <span className="text-[8px] text-[#9cb2d7]/40 font-bold ml-0.5">
                S
              </span>
            </div>
          </div>

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
                  className={cn(
                    "absolute top-2 bottom-2 bg-[#1d417c]/40 border border-[#9cb2d7]/30 rounded-lg overflow-hidden flex flex-col group transition-all shadow-[0_4px_10px_rgba(0,0,0,0.3)] backdrop-blur-sm",
                    !isGrabMode && "hover:border-[#9cb2d7]/60",
                    isGrabMode &&
                      "cursor-grab active:cursor-grabbing hover:bg-[#1d417c]/60",
                    reorderState?.draggedIndex === index &&
                      "opacity-50 ring-2 ring-[#9cb2d7] z-50",
                  )}
                  style={{
                    left: clip.timelineStart * zoom,
                    width: Math.max(2, clip.duration * zoom - 2),
                  }}
                  onMouseDown={(e) => handleDragStart(e, index)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Left Trim Handle */}
                  {!isGrabMode && (
                    <div
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-1.5 bg-white/20 hover:bg-[#7ead70] cursor-col-resize z-20 transition-all border-r border-white/10 group-hover:w-2.5",
                        trimmingState?.clipId === clip.id &&
                          trimmingState.handle === "left" &&
                          "bg-[#7ead70] w-3",
                      )}
                      onMouseDown={(e) =>
                        handleTrimStart(e, clip.id, "left", clip.sourceStart)
                      }
                    >
                      <div className="absolute inset-y-0 right-[1px] w-[1px] bg-white/30" />
                    </div>
                  )}

                  {/* Right Trim Handle */}
                  {!isGrabMode && (
                    <div
                      className={cn(
                        "absolute right-0 top-0 bottom-0 w-1.5 bg-white/20 hover:bg-[#7ead70] cursor-col-resize z-20 transition-all border-l border-white/10 group-hover:w-2.5",
                        trimmingState?.clipId === clip.id &&
                          trimmingState.handle === "right" &&
                          "bg-[#7ead70] w-3",
                      )}
                      onMouseDown={(e) =>
                        handleTrimStart(e, clip.id, "right", clip.sourceEnd)
                      }
                    >
                      <div className="absolute inset-y-0 left-[1px] w-[1px] bg-white/30" />
                    </div>
                  )}

                  <div className="flex-1 p-2 flex flex-col items-start overflow-hidden pointer-events-none select-none">
                    <p className="text-[10px] font-medium text-[#f1f2f3] leading-tight line-clamp-1 mb-1">
                      "{clip.textPreview}"
                    </p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
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
