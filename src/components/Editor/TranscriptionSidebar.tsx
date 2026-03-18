"use client";

import { useCallback, useState } from "react";
import { useEditor } from "../../context/EditorContext";
import { TranscriptionView } from "../TranscriptionView";
import { VIDEO_FPS } from "../../types/constants";
import { useEditorActions } from "../../hooks/use-editor-actions";
import { calculateClipsAfterDeletion } from "../../lib/clip-utils";
import { diffWords } from "diff";

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
    timelines,
    addTimeline,
    activeTimelineId,
    sourceFiles,
    paddingEnabled,
    paddingDuration,
  } = useEditor();

  const { onDeleteWords, onSplitClip } = useEditorActions();
  const [isProcessingBestTake, setIsProcessingBestTake] = useState(false);

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

  const onBestTake = useCallback(async () => {
    if (transcription.length === 0) return;
    setIsProcessingBestTake(true);
    try {
      const text = transcription.map((w) => w.text).join(" ");
      const res = await fetch("/api/besttake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, transcription }),
      });
      const data = await res.json();
      if (!data.cleanText) throw new Error("No clean text returned");

      const diff = diffWords(text, data.cleanText);

      const wordsToCutIds: string[] = [];
      let transcriptIndex = 0;

      diff.forEach((part) => {
        const wordsInPart = part.value.trim().split(/\s+/).filter(Boolean);
        if (part.added) {
          // Ignore hallucinated additions
        } else if (part.removed) {
          // Delete these words
          for (let i = 0; i < wordsInPart.length; i++) {
            if (transcriptIndex < transcription.length) {
              wordsToCutIds.push(transcription[transcriptIndex].id);
              transcriptIndex++;
            }
          }
        } else {
          // Keep these words
          transcriptIndex += wordsInPart.length;
        }
      });

      if (wordsToCutIds.length > 0) {
        const newTimelineId = `best-take-${Date.now()}`;
        const finalClips = calculateClipsAfterDeletion(
          clips,
          sourceFiles,
          new Set(wordsToCutIds),
          paddingEnabled,
          paddingDuration,
        );

        addTimeline({
          id: newTimelineId,
          name: `Best Take ${timelines.length}`,
          clips: finalClips,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingBestTake(false);
    }
  }, [
    transcription,
    clips,
    addTimeline,
    timelines.length,
    sourceFiles,
    paddingEnabled,
    paddingDuration,
  ]);

  return (
    <section className="w-2/5 flex flex-col bg-[#022540]">
      <TranscriptionView
        key={activeTimelineId}
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
        onBestTake={onBestTake}
        isProcessingBestTake={isProcessingBestTake}
      />
    </section>
  );
};
