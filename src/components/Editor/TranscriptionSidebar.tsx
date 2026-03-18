"use client";

import { useCallback } from "react";
import { useEditor } from "../../context/EditorContext";
import { TranscriptionView } from "../TranscriptionView";
import { VIDEO_FPS } from "../../types/constants";
import { useEditorActions } from "../../hooks/use-editor-actions";

export const TranscriptionSidebar = () => {
  const {
    transcription,
    clips,
    currentFrame,
    deletedWordIds,
    playerRef,
    setCurrentFrame,
    lastFrameRef,
    selectedWordIds,
    setSelectedWordIds,
  } = useEditor();

  const { onDeleteWords, onSplitClip } = useEditorActions();

  const onWordClick = useCallback(
    (timelineStartTime: number) => {
      if (playerRef.current) {
        const frame = Math.floor(timelineStartTime * VIDEO_FPS);
        playerRef.current.seekTo(frame);
        setCurrentFrame(frame);
        lastFrameRef.current = frame;
      }
    },
    [playerRef, setCurrentFrame, lastFrameRef],
  );

  const onToggleWordDelete = useCallback(
    (wordId: string) => {
      const isDeleted = deletedWordIds.has(wordId);
      if (isDeleted) return;
      onDeleteWords([wordId]);
    },
    [deletedWordIds, onDeleteWords],
  );

  return (
    <section className="w-2/5 flex flex-col bg-[#022540]">
      <TranscriptionView
        transcription={transcription}
        clips={clips}
        currentTime={currentFrame / VIDEO_FPS}
        onWordClick={onWordClick}
        onDeleteWords={(ids) => {
          onDeleteWords(ids);
          setSelectedWordIds(new Set());
        }}
        onToggleWordDelete={onToggleWordDelete}
        onSplitClip={onSplitClip}
        deletedWordIds={deletedWordIds}
        selectedWordIds={selectedWordIds}
        onSelectionChange={setSelectedWordIds}
      />
    </section>
  );
};
