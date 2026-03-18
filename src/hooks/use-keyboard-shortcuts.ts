import { useEffect } from "react";
import { PlayerRef } from "@remotion/player";
import { VIDEO_FPS } from "../types/constants";

interface UseKeyboardShortcutsProps {
  undo: () => void;
  redo: () => void;
  onDeleteWords: (ids: string[]) => void;
  selectedWordIds: Set<string>;
  setSelectedWordIds: (ids: Set<string>) => void;
  playerRef: React.RefObject<PlayerRef | null>;
  editedDurationInFrames: number;
  onFrameUpdate: (frame: number) => void;
}

/**
 * A hook that manages global keyboard shortcuts for the editor.
 */
export const useKeyboardShortcuts = ({
  undo,
  redo,
  onDeleteWords,
  selectedWordIds,
  setSelectedWordIds,
  playerRef,
  editedDurationInFrames,
  onFrameUpdate,
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (e.shiftKey) redo();
        else undo();
        return;
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        redo();
        return;
      }

      // 2. Play/Pause (Space)
      if (
        e.key === " " &&
        !["INPUT", "TEXTAREA", "BUTTON"].includes(
          (e.target as HTMLElement).tagName,
        )
      ) {
        e.preventDefault();
        if (playerRef.current) {
          if (playerRef.current.isPlaying()) playerRef.current.pause();
          else playerRef.current.play();
        }
        return;
      }

      // 3. Delete Selection
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedWordIds.size > 0
      ) {
        onDeleteWords(Array.from(selectedWordIds));
        setSelectedWordIds(new Set());
        return;
      }

      // 4. Timeline Navigation (Arrows)
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
          return;
        }
        e.preventDefault();
        if (playerRef.current) {
          const step = e.shiftKey ? VIDEO_FPS : 1;
          const current = playerRef.current.getCurrentFrame();
          const nextFrame =
            e.key === "ArrowLeft"
              ? Math.max(0, current - step)
              : Math.min(editedDurationInFrames, current + step);

          playerRef.current.seekTo(nextFrame);
          onFrameUpdate(nextFrame);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    undo,
    redo,
    onDeleteWords,
    selectedWordIds,
    setSelectedWordIds,
    playerRef,
    editedDurationInFrames,
    onFrameUpdate,
  ]);
};
