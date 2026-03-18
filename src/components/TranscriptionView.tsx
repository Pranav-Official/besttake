import React, { useMemo, useRef, useEffect, useState } from "react";
import { WordTranscription, Clip } from "../types/constants";
import { cn } from "../lib/utils";
import { Badge } from "./Badge";
import { useEditor } from "../context/EditorContext";

import { Button } from "./Button";

interface TranscriptionViewProps {
  transcription: WordTranscription[];
  clips: Clip[];
  currentTime: number;
  onWordClick?: (start: number) => void;
  onDeleteWords?: (wordIds: string[]) => void;
  onToggleWordDelete?: (wordId: string) => void;
  onSplitClip?: (wordId: string) => void;
  deletedWordIds: Set<string>;
  selectedWordIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onBestTake?: () => void;
  isProcessingBestTake?: boolean;
  className?: string;
}

export const TranscriptionView: React.FC<TranscriptionViewProps> = ({
  transcription,
  clips,
  currentTime,
  onWordClick,
  onDeleteWords,
  onToggleWordDelete,
  onSplitClip,
  selectedWordIds,
  onSelectionChange,
  onBestTake,
  isProcessingBestTake,
  className,
}) => {
  const { sourceFiles } = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStartId, setDragStartId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Check for pending transcriptions
  const pendingClips = useMemo(() => {
    return clips.filter((clip) => {
      const sourceFile = sourceFiles.find((f) => f.id === clip.fileId);
      return sourceFile && sourceFile.transcription.length === 0;
    });
  }, [clips, sourceFiles]);

  const renderedItems = transcription;

  const activeWordIndex = useMemo(() => {
    for (let i = 0; i < renderedItems.length; i++) {
      const item = renderedItems[i];
      if (currentTime >= item.start && currentTime <= item.end) {
        return i;
      }
    }
    return -1;
  }, [renderedItems, currentTime]);

  const handleKeyDown = (e: React.KeyboardEvent, wordId: string) => {
    if (e.key === "Tab") {
      e.preventDefault();
      onSplitClip?.(wordId);
    }
  };

  const getWordRange = (startId: string, endId: string) => {
    const startIndex = renderedItems.findIndex((w) => w.id === startId);
    const endIndex = renderedItems.findIndex((w) => w.id === endId);
    if (startIndex === -1 || endIndex === -1) return [];

    const [min, max] =
      startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
    return renderedItems.slice(min, max + 1).map((w) => w.id);
  };

  const handleMouseDown = (id: string, shiftKey: boolean) => {
    setMenuPosition(null);
    if (shiftKey && selectedWordIds.size > 0) {
      const lastSelectedId = Array.from(selectedWordIds.values()).pop()!;
      const range = getWordRange(lastSelectedId, id);
      const combined = new Set(Array.from(selectedWordIds.values()));
      range.forEach((rid) => combined.add(rid));
      onSelectionChange(combined);
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
        <div className="flex gap-2 items-center">
          {onBestTake && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBestTake}
              disabled={isProcessingBestTake || transcription.length === 0}
              className={cn(
                "relative font-bold overflow-hidden transition-all duration-300",
                !isProcessingBestTake && transcription.length > 0
                  ? "border border-transparent bg-clip-border before:absolute before:inset-0 before:p-[1px] before:bg-gradient-to-r before:from-indigo-500 before:to-purple-500 before:-z-10 before:rounded-geist after:absolute after:inset-[1px] after:bg-[#022540] after:-z-10 after:rounded-[calc(var(--radius-geist)-1px)] hover:after:bg-[#022540]/80"
                  : "border-[#1d417c] text-[#9cb2d7]/50",
              )}
            >
              <span
                className={cn(
                  "flex items-center gap-1.5 relative z-10",
                  !isProcessingBestTake &&
                    transcription.length > 0 &&
                    "bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent",
                )}
              >
                {isProcessingBestTake ? (
                  <>
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-[#9cb2d7]">Processing...</span>
                  </>
                ) : (
                  <>✨ Best Take</>
                )}
              </span>
            </Button>
          )}
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
          {renderedItems.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center py-20 text-center opacity-30 italic">
              <p>No text in timeline.</p>
            </div>
          ) : (
            renderedItems.map((word, index) => {
              const isActive = index === activeWordIndex;
              const isSelected = selectedWordIds.has(word.id);

              // Find if this is the end of a clip
              const isEndOfClip =
                index < renderedItems.length - 1 &&
                renderedItems[index + 1].clipId !== word.clipId;

              return (
                <span key={word.id}>
                  <span
                    ref={isActive ? activeWordRef : null}
                    tabIndex={0}
                    onKeyDown={(e) => handleKeyDown(e, word.id)}
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
                      isSelected
                        ? "bg-[#9cb2d7]/30 text-[#f1f2f3] ring-1 ring-[#9cb2d7]/50"
                        : isActive
                          ? "bg-[#9cb2d7] text-[#011626] font-black scale-105 shadow-[0_0_20px_rgba(156,178,215,0.4)] z-10"
                          : "text-[#f1f2f3] font-medium opacity-100",
                    )}
                    title={`${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s (Clip: ${word.clipId})`}
                  >
                    {word.text}
                    {!isSelected && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#ef4444] rounded-full scale-0 group-hover:scale-100 transition-transform duration-200" />
                    )}
                  </span>
                  {isEndOfClip && (
                    <span
                      className="inline-block w-4 h-[1px] bg-[#1d417c] mx-2 align-middle opacity-50"
                      title="Clip Break"
                    />
                  )}
                </span>
              );
            })
          )}

          {pendingClips.length > 0 && (
            <div className="mt-12 p-6 border-2 border-dashed border-[#1d417c] rounded-xl bg-[#1d417c]/10 flex flex-col items-center gap-4 text-center animate-pulse">
              <div className="w-10 h-10 border-4 border-[#9cb2d7] border-t-transparent rounded-full animate-spin" />
              <div>
                <h3 className="text-sm font-bold text-[#9cb2d7] uppercase tracking-wider">
                  Transcribing {pendingClips.length} clips...
                </h3>
                <p className="text-xs text-[#9cb2d7]/50 mt-1">
                  Text will appear here as soon as processing is complete.
                </p>
              </div>
            </div>
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
                onDeleteWords?.(Array.from(selectedWordIds.values()));
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
