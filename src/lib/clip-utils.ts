import { Clip, WordTranscription, SourceFile } from "../types/constants";

/**
 * Calculates the resulting clips after removing specific words.
 */
export const calculateClipsAfterDeletion = (
  clips: Clip[],
  sourceFiles: SourceFile[],
  wordIdsToCut: Set<string>,
  paddingEnabled: boolean,
  paddingDuration: number,
): Clip[] => {
  const nextClips: Clip[] = [];

  clips.forEach((clip) => {
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
      return !wordIdsToCut.has(globalId);
    });

    if (remainingWords.length === 0) return;

    let currentSegment: WordTranscription[] = [];
    const sourceWordToIndex = new Map(
      sourceFile.transcription.map((w, i) => [w.id, i]),
    );

    const processSegment = (segment: WordTranscription[]) => {
      if (segment.length === 0) return;
      const finalPadding = paddingEnabled ? paddingDuration : 0;
      const segStart = segment[0].start;
      const segEnd = segment[segment.length - 1].end;

      nextClips.push({
        id: `${clip.id}-${nextClips.length}-${Date.now()}`,
        fileId: clip.fileId,
        sourceStart: Math.max(0, segStart - finalPadding),
        sourceEnd: Math.min(sourceFile.duration, segEnd + finalPadding),
        logicalStart: segStart,
        logicalEnd: segEnd,
      });
    };

    remainingWords.forEach((word) => {
      const originalIndex = sourceWordToIndex.get(word.id)!;
      const lastOriginalIndex =
        currentSegment.length > 0
          ? sourceWordToIndex.get(currentSegment[currentSegment.length - 1].id)!
          : -1;

      if (
        currentSegment.length > 0 &&
        originalIndex === lastOriginalIndex + 1
      ) {
        currentSegment.push(word);
      } else {
        processSegment(currentSegment);
        currentSegment = [word];
      }
    });

    processSegment(currentSegment);
  });

  return nextClips;
};
