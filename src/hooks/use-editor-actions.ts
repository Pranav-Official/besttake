import { useCallback } from "react";
import { useEditor } from "../context/EditorContext";
import { Clip, VIDEO_FPS } from "../types/constants";

/**
 * A hook that provides common editor actions like deleting words and splitting clips.
 */
export const useEditorActions = () => {
  const {
    transcription,
    setClips,
    paddingEnabled,
    paddingDuration,
    clips,
    currentFrame,
  } = useEditor();

  const onDeleteWords = useCallback(
    (wordIds: string[]) => {
      const wordsToCutIds = new Set(wordIds);
      const wordToIndex = new Map(transcription.map((w, i) => [w.id, i]));

      setClips((prev) => {
        const nextClips: Clip[] = [];

        prev.forEach((clip) => {
          const lStart = clip.logicalStart ?? clip.sourceStart;
          const lEnd = clip.logicalEnd ?? clip.sourceEnd;

          const wordsInClip = transcription.filter(
            (w) => w.start >= lStart - 0.01 && w.end <= lEnd + 0.01,
          );

          const remainingWords = wordsInClip.filter(
            (w) => !wordsToCutIds.has(w.id),
          );

          if (remainingWords.length === 0) return;

          let currentSegment: typeof transcription = [];

          remainingWords.forEach((word) => {
            const originalIndex = wordToIndex.get(word.id)!;
            const lastOriginalIndex =
              currentSegment.length > 0
                ? wordToIndex.get(currentSegment[currentSegment.length - 1].id)!
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
                  sourceStart: Math.max(0, segStart - finalPadding),
                  sourceEnd: Math.min(
                    transcription[transcription.length - 1]?.end || 10000,
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
              sourceStart: Math.max(0, segStart - finalPadding),
              sourceEnd: Math.min(
                transcription[transcription.length - 1]?.end || 10000,
                segEnd + finalPadding,
              ),
              logicalStart: segStart,
              logicalEnd: segEnd,
            });
          }
        });

        return nextClips;
      });
    },
    [transcription, setClips, paddingEnabled, paddingDuration],
  );

  const onSplitClip = useCallback(
    (wordId: string) => {
      const word = transcription.find((w) => w.id === wordId);
      if (!word) return;

      const clipIndex = clips.findIndex(
        (c) => word.start >= c.sourceStart && word.end <= c.sourceEnd,
      );
      if (clipIndex === -1) return;

      setClips((prev) => {
        const nextClips = [...prev];
        const clip = nextClips[clipIndex];

        const leftClip: Clip = {
          id: `${clip.id}-s1`,
          sourceStart: clip.sourceStart,
          sourceEnd: word.end,
        };
        const rightClip: Clip = {
          id: `${clip.id}-s2`,
          sourceStart: word.end,
          sourceEnd: clip.sourceEnd,
        };

        if (word.end === clip.sourceEnd) return prev;

        nextClips.splice(clipIndex, 1, leftClip, rightClip);
        return nextClips;
      });
    },
    [transcription, clips, setClips],
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
        sourceEnd: splitSourceTime,
        logicalEnd: splitSourceTime,
      };
      const rightClip: Clip = {
        ...target,
        id: `${target.id}-pt2-${Date.now()}`,
        sourceStart: splitSourceTime,
        logicalStart: splitSourceTime,
      };

      next.splice(clipIndex, 1, leftClip, rightClip);
      return next;
    });
  }, [currentFrame, clips, setClips]);

  return { onDeleteWords, onSplitClip, onSplitAtPlayhead };
};
