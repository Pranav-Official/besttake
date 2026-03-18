"use client";

import React, { useCallback } from "react";
import { useEditor } from "../../context/EditorContext";
import { TranscriptionView } from "../TranscriptionView";
import { VIDEO_FPS } from "../../types/constants";
import { useEditorActions } from "../../hooks/use-editor-actions";

export const TranscriptionSidebar = () => {
  const {
    transcription,
    clips,
    originalCurrentTime,
    deletedWordIds,
    playerRef,
    setCurrentFrame,
    lastFrameRef,
    selectedWordIds,
    setSelectedWordIds,
  } = useEditor();

  const { onDeleteWords, onSplitClip } = useEditorActions();

  const getEditedTime = useCallback(
    (originalStartTime: number) => {
      let accumulatedEditedTime = 0;
      for (const clip of clips) {
        if (
          originalStartTime >= clip.sourceStart &&
          originalStartTime <= clip.sourceEnd
        ) {
          return accumulatedEditedTime + (originalStartTime - clip.sourceStart);
        }
        accumulatedEditedTime += clip.sourceEnd - clip.sourceStart;
      }
      return accumulatedEditedTime;
    },
    [clips],
  );

  const onWordClick = useCallback(
    (originalStartTime: number) => {
      if (playerRef.current) {
        const editedTime = getEditedTime(originalStartTime);
        const frame = Math.floor(editedTime * VIDEO_FPS);
        playerRef.current.seekTo(frame);
        setCurrentFrame(frame);
        lastFrameRef.current = frame;
      }
    },
    [getEditedTime, playerRef, setCurrentFrame, lastFrameRef],
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
        currentTime={originalCurrentTime}
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
