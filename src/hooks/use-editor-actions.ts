import { useCallback } from "react";
import { useEditor } from "../context/EditorContext";
import { Clip, VIDEO_FPS, WordTranscription } from "../types/constants";

/**
 * A hook that provides common editor actions like deleting words and splitting clips.
 */
export const useEditorActions = () => {
  const {
    sourceFiles,
    setClips,
    paddingEnabled,
    paddingDuration,
    clips,
    currentFrame,
    transcription: unifiedTranscription,
  } = useEditor();

  const onDeleteWords = useCallback(
    (wordIds: string[]) => {
      const wordsToCutIds = new Set(wordIds);

      setClips((prev) => {
        const nextClips: Clip[] = [];

        prev.forEach((clip) => {
          const sourceFile = sourceFiles.find((f) => f.id === clip.fileId);
          if (!sourceFile) return;

          const lStart = clip.logicalStart ?? clip.sourceStart;
          const lEnd = clip.logicalEnd ?? clip.sourceEnd;

          // Use the ORIGINAL transcription for logic within the source file
          const wordsInClipRange = sourceFile.transcription.filter(
            (w) => w.start >= lStart - 0.01 && w.end <= lEnd + 0.01,
          );

          // Find which of these words were selected for deletion
          const remainingWords = wordsInClipRange.filter((word) => {
            const globalId = `word-${clip.id}-${word.id}`;
            return !wordsToCutIds.has(globalId);
          });

          if (remainingWords.length === 0) return;

          let currentSegment: WordTranscription[] = [];
          const sourceWordToIndex = new Map(
            sourceFile.transcription.map((w, i) => [w.id, i]),
          );

          remainingWords.forEach((word) => {
            const originalIndex = sourceWordToIndex.get(word.id)!;
            const lastOriginalIndex =
              currentSegment.length > 0
                ? sourceWordToIndex.get(
                    currentSegment[currentSegment.length - 1].id,
                  )!
                : -1;

            if (
              currentSegment.length > 0 &&
              originalIndex === lastOriginalIndex + 1
            ) {
              currentSegment.push(word);
            } else {
              if (currentSegment.length > 0) {
                const finalPadding = paddingEnabled ? paddingDuration : 0;
                const segStart = currentSegment[0].start;
                const segEnd = currentSegment[currentSegment.length - 1].end;

                nextClips.push({
                  id: `${clip.id}-${nextClips.length}`,
                  fileId: clip.fileId,
                  sourceStart: Math.max(0, segStart - finalPadding),
                  sourceEnd: Math.min(
                    sourceFile.duration,
                    segEnd + finalPadding,
                  ),
                  logicalStart: segStart,
                  logicalEnd: segEnd,
                });
              }
              currentSegment = [word];
            }
          });

          if (currentSegment.length > 0) {
            const finalPadding = paddingEnabled ? paddingDuration : 0;
            const segStart = currentSegment[0].start;
            const segEnd = currentSegment[currentSegment.length - 1].end;

            nextClips.push({
              id: `${clip.id}-${nextClips.length}`,
              fileId: clip.fileId,
              sourceStart: Math.max(0, segStart - finalPadding),
              sourceEnd: Math.min(sourceFile.duration, segEnd + finalPadding),
              logicalStart: segStart,
              logicalEnd: segEnd,
            });
          }
        });

        return nextClips;
      });
    },
    [sourceFiles, setClips, paddingEnabled, paddingDuration],
  );

  const onSplitClip = useCallback(
    (unifiedWordId: string) => {
      const word = unifiedTranscription.find((w) => w.id === unifiedWordId);
      if (!word || !word.clipId) return;

      const clipIndex = clips.findIndex((c) => c.id === word.clipId);
      if (clipIndex === -1) return;

      setClips((prev) => {
        const nextClips = [...prev];
        const clip = nextClips[clipIndex];

        // Find the source word timing
        // unified word.start = sourceWord.start - clip.sourceStart + accumulatedTime
        // We need sourceWord.end to split correctly.
        // Actually, we can just find the word in the source file.
        const sourceFile = sourceFiles.find((f) => f.id === clip.fileId);
        if (!sourceFile) return prev;

        // The word.id in unified is `clip-${clipIndex}-${w.id}`
        const sourceWordId = unifiedWordId.split("-").pop();
        const sourceWord = sourceFile.transcription.find(
          (w) => w.id === sourceWordId,
        );
        if (!sourceWord) return prev;

        const leftClip: Clip = {
          id: `${clip.id}-s1`,
          fileId: clip.fileId,
          sourceStart: clip.sourceStart,
          sourceEnd: sourceWord.end,
        };
        const rightClip: Clip = {
          id: `${clip.id}-s2`,
          fileId: clip.fileId,
          sourceStart: sourceWord.end,
          sourceEnd: clip.sourceEnd,
        };

        if (sourceWord.end === clip.sourceEnd) return prev;

        nextClips.splice(clipIndex, 1, leftClip, rightClip);
        return nextClips;
      });
    },
    [unifiedTranscription, clips, setClips, sourceFiles],
  );

  const onSplitAtPlayhead = useCallback(() => {
    if (clips.length === 0) return;

    const targetEditedTime = currentFrame / VIDEO_FPS;
    let accumulatedTime = 0;
    let clipIndex = -1;

    for (let i = 0; i < clips.length; i++) {
      const duration = clips[i].sourceEnd - clips[i].sourceStart;
      if (
        targetEditedTime >= accumulatedTime &&
        targetEditedTime <= accumulatedTime + duration
      ) {
        clipIndex = i;
        break;
      }
      accumulatedTime += duration;
    }

    if (clipIndex === -1) return;

    const clip = clips[clipIndex];
    const splitPointInClip = targetEditedTime - accumulatedTime;
    const splitSourceTime = clip.sourceStart + splitPointInClip;

    if (
      splitPointInClip < 0.1 ||
      splitPointInClip > clip.sourceEnd - clip.sourceStart - 0.1
    ) {
      return;
    }

    setClips((prev) => {
      const next = [...prev];
      const target = next[clipIndex];

      const leftClip: Clip = {
        ...target,
        id: `${target.id}-pt1-${Date.now()}`,
        fileId: target.fileId,
        sourceEnd: splitSourceTime,
        logicalEnd: splitSourceTime,
      };
      const rightClip: Clip = {
        ...target,
        id: `${target.id}-pt2-${Date.now()}`,
        fileId: target.fileId,
        sourceStart: splitSourceTime,
        logicalStart: splitSourceTime,
      };

      next.splice(clipIndex, 1, leftClip, rightClip);
      return next;
    });
  }, [currentFrame, clips, setClips]);

  return { onDeleteWords, onSplitClip, onSplitAtPlayhead };
};
