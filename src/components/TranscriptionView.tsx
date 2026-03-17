import React, { useMemo, useRef, useEffect } from "react";
import { WordTranscription } from "../../types/constants";
import { cn } from "../lib/utils";
import { Badge } from "./Badge";

interface TranscriptionViewProps {
  transcription: WordTranscription[];
  currentFrame: number;
  fps: number;
  onWordClick?: (start: number) => void;
  className?: string;
}

export const TranscriptionView: React.FC<TranscriptionViewProps> = ({
  transcription,
  currentFrame,
  fps,
  onWordClick,
  className,
}) => {
  const currentTime = currentFrame / fps;
  const containerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);

  const activeWordIndex = useMemo(() => {
    return transcription.findIndex(
      (word) => currentTime >= word.start && currentTime <= word.end,
    );
  }, [transcription, currentTime]);

  // Auto-scroll logic
  useEffect(() => {
    if (activeWordRef.current && containerRef.current) {
      const container = containerRef.current;
      const word = activeWordRef.current;

      const containerRect = container.getBoundingClientRect();
      const wordRect = word.getBoundingClientRect();

      // Check if word is outside of the visible area
      const isAbove = wordRect.top < containerRect.top + 100;
      const isBelow = wordRect.bottom > containerRect.bottom - 100;

      if (isAbove || isBelow) {
        word.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [activeWordIndex]);

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-[#022540] border-l border-[#1d417c]",
        className,
      )}
    >
      <div className="p-4 border-b border-[#1d417c] flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#9cb2d7]/70">
            Transcript Editor
          </h2>
        </div>
        <div className="flex gap-2">
          <Badge
            variant="accent"
            className="bg-[#7ead70]/10 border-[#7ead70]/20 text-[#7ead70]"
          >
            {transcription.length} words
          </Badge>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-8 custom-scrollbar scroll-smooth"
      >
        <div className="text-xl leading-[1.8] tracking-tight">
          {transcription.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center py-20 text-center opacity-30 italic">
              <p>Waiting for video upload...</p>
            </div>
          ) : (
            transcription.map((word, index) => {
              const isActive = index === activeWordIndex;
              const isPlayed = currentTime > word.end;

              return (
                <span
                  key={`${word.text}-${index}`}
                  ref={isActive ? activeWordRef : null}
                  onClick={() => onWordClick?.(word.start)}
                  className={cn(
                    "relative cursor-pointer select-none transition-all duration-200 px-1 py-0.5 mx-[1px] my-[2px] rounded-md inline-block",
                    isActive
                      ? "bg-[#9cb2d7] text-[#011626] font-black scale-105 shadow-[0_0_20px_rgba(156,178,215,0.4)] z-10"
                      : isPlayed
                        ? "text-[#f1f2f3] font-medium opacity-100"
                        : "text-[#f1f2f3]/30 font-normal hover:text-[#f1f2f3] hover:bg-white/5",
                  )}
                  title={`${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s`}
                >
                  {word.text}
                </span>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
