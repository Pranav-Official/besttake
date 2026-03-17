import React, { useMemo, useRef, useEffect, useState } from "react";
import { WordTranscription } from "../../types/constants";
import { cn } from "../lib/utils";
import { Badge } from "./Badge";

interface TranscriptionViewProps {
  transcription: WordTranscription[];
  currentTime: number;
  onWordClick?: (start: number) => void;
  onDeleteWords?: (wordIds: string[]) => void;
  onToggleWordDelete?: (wordId: string) => void;
  deletedWordIds: Set<string>;
  selectedWordIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  className?: string;
}

export const TranscriptionView: React.FC<TranscriptionViewProps> = ({
  transcription,
  currentTime,
  onWordClick,
  onDeleteWords,
  onToggleWordDelete,
  deletedWordIds,
  selectedWordIds,
  onSelectionChange,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStartId, setDragStartId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const activeWordIndex = useMemo(() => {
    return transcription.findIndex(
      (word) => currentTime >= word.start && currentTime <= word.end,
    );
  }, [transcription, currentTime]);

  const getWordRange = (startId: string, endId: string) => {
    const startIndex = transcription.findIndex((w) => w.id === startId);
    const endIndex = transcription.findIndex((w) => w.id === endId);
    if (startIndex === -1 || endIndex === -1) return [];

    const [min, max] =
      startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
    return transcription.slice(min, max + 1).map((w) => w.id);
  };

  const handleMouseDown = (id: string, shiftKey: boolean) => {
    setMenuPosition(null);
    if (shiftKey && selectedWordIds.size > 0) {
      const lastSelectedId = Array.from(selectedWordIds).pop()!;
      const range = getWordRange(lastSelectedId, id);
      onSelectionChange(new Set([...selectedWordIds, ...range]));
    } else {
      onSelectionChange(new Set([id]));
      setIsDragging(true);
      setDragStartId(id);
    }
  };

  const handleMouseEnter = (id: string) => {
    if (isDragging && dragStartId) {
      const range = getWordRange(dragStartId, id);
      onSelectionChange(new Set(range));
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
      if (selectedWordIds.size > 1) {
        setMenuPosition({ x: e.clientX, y: e.clientY });
        // Prevent this click from reaching the window listener immediately
        e.stopPropagation();
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      // Small delay to ensure the click that opens the menu doesn't immediately close it
      setTimeout(() => {
        setMenuPosition(null);
      }, 10);
    };
    if (menuPosition) {
      window.addEventListener("click", handleClickOutside);
    }
    return () => window.removeEventListener("click", handleClickOutside);
  }, [menuPosition]);

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
        className="flex-1 overflow-y-auto p-8 custom-scrollbar scroll-smooth relative"
        onMouseLeave={() => setIsDragging(false)}
        onMouseUp={handleMouseUp}
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
              const isDeleted = deletedWordIds.has(word.id);
              const isSelected = selectedWordIds.has(word.id);

              return (
                <span
                  key={`${word.id}-${index}`}
                  ref={isActive ? activeWordRef : null}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(word.id, e.shiftKey);
                  }}
                  onMouseEnter={() => handleMouseEnter(word.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!e.shiftKey && !isDragging) {
                      if (e.altKey || e.metaKey || e.ctrlKey) {
                        onToggleWordDelete?.(word.id);
                      } else {
                        onWordClick?.(word.start);
                      }
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onToggleWordDelete?.(word.id);
                  }}
                  className={cn(
                    "relative cursor-pointer select-none transition-all duration-200 px-1 py-0.5 mx-[1px] my-[2px] rounded-md inline-block group",
                    isDeleted
                      ? "text-[#ef4444] line-through opacity-40 hover:opacity-100"
                      : isSelected
                        ? "bg-[#9cb2d7]/30 text-[#f1f2f3] ring-1 ring-[#9cb2d7]/50"
                        : isActive
                          ? "bg-[#9cb2d7] text-[#011626] font-black scale-105 shadow-[0_0_20px_rgba(156,178,215,0.4)] z-10"
                          : isPlayed
                            ? "text-[#f1f2f3] font-medium opacity-100"
                            : "text-[#f1f2f3]/30 font-normal hover:text-[#f1f2f3] hover:bg-white/5",
                  )}
                  title={
                    isDeleted
                      ? "Deleted - Right click to restore"
                      : `${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s (Right click to delete)`
                  }
                >
                  {word.text}
                  {/* Optional: Add a small delete indicator on hover */}
                  {!isDeleted && !isSelected && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#ef4444] rounded-full scale-0 group-hover:scale-100 transition-transform duration-200" />
                  )}
                </span>
              );
            })
          )}
        </div>

        {/* Floating Selection Menu */}
        {menuPosition && (
          <div
            className="fixed z-[100] bg-[#022540] border border-[#1d417c] rounded-lg shadow-xl overflow-hidden py-1 animate-in fade-in zoom-in duration-150"
            style={{ top: menuPosition.y + 10, left: menuPosition.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-[#ef4444] hover:text-white transition-colors flex items-center gap-2"
              onClick={() => {
                onDeleteWords?.(Array.from(selectedWordIds));
                setMenuPosition(null);
              }}
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                ></path>
              </svg>
              Delete Selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
