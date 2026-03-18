"use client";

import { useEditor } from "../../context/EditorContext";
import { EditorHeader } from "./EditorHeader";
import { PlayerSection } from "./PlayerSection";
import { TranscriptionSidebar } from "./TranscriptionSidebar";
import { TimelineEditor } from "../TimelineEditor";
import { VIDEO_FPS } from "../../types/constants";
import { useKeyboardShortcuts } from "../../hooks/use-keyboard-shortcuts";
import { useSilenceDetection } from "../../hooks/use-silence-detection";
import { useEditorActions } from "../../hooks/use-editor-actions";
import { useMountEffect } from "../../hooks/use-mount-effect";
import { ClipManagement } from "./ClipManagement/ClipManagement";

export const EditorLayout = () => {
  const {
    view,
    sourceFiles,
    serverVideoUrl,
    transcription,
    clips,
    setClips,
    currentFrame,
    setCurrentFrame,
    undo,
    redo,
    playerRef,
    editedDurationInFrames,
    lastFrameRef,
    paddingEnabled,
    setPaddingEnabled,
    paddingDuration,
    setPaddingDuration,
    selectedWordIds,
    setSelectedWordIds,
    activeFileId,
    activeTimelineId,
    zoom,
    setZoom,
  } = useEditor();

  const { onDeleteWords, onSplitAtPlayhead } = useEditorActions();
  const { mutateAsync: trimSilences, isPending: isTrimmingSilences } =
    useSilenceDetection();

  const onTrimSilences = async (
    noiseThreshold: number,
    minDuration: number,
  ) => {
    const activeFile = sourceFiles.find((f) => f.id === activeFileId);

    console.log("onTrimSilences called with:", {
      noiseThreshold,
      minDuration,
      serverVideoUrl,
      activeFileId,
    });

    if (!serverVideoUrl || !activeFile) {
      console.warn(
        "Returning early from onTrimSilences: missing serverVideoUrl or activeFile",
      );
      return;
    }
    try {
      const audibleParts = await trimSilences({
        serverVideoUrl,
        noiseThreshold,
        minDuration,
      });

      // Instead of ignoring current clips, intersect audible parts with existing clips
      const nextClips: typeof clips = [];

      clips.forEach((clip) => {
        const lStart = clip.logicalStart ?? clip.sourceStart;
        const lEnd = clip.logicalEnd ?? clip.sourceEnd;

        // Find audible parts that overlap with this clip
        audibleParts.forEach((part) => {
          const overlapStart = Math.max(lStart, part.startInSeconds);
          const overlapEnd = Math.min(lEnd, part.endInSeconds);

          // If there is a valid audible overlap within this clip
          if (overlapStart < overlapEnd) {
            const finalPadding = paddingEnabled ? paddingDuration : 0;
            nextClips.push({
              id: `${clip.id}-audible-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              fileId: clip.fileId,
              sourceStart: Math.max(0, overlapStart - finalPadding),
              sourceEnd: Math.min(
                activeFile.duration || 10000,
                overlapEnd + finalPadding,
              ),
              logicalStart: overlapStart,
              logicalEnd: overlapEnd,
            });
          }
        });
      });

      if (nextClips.length > 0) {
        setClips(nextClips);
        playerRef.current?.seekTo(0);
        setCurrentFrame(0);
        lastFrameRef.current = 0;
      } else {
        alert("No audible parts detected with these settings.");
      }
    } catch (err) {
      console.error("Silence trim error:", err);
      alert("Failed to trim silences. Check console for details.");
    }
  };

  useKeyboardShortcuts({
    undo,
    redo,
    onDeleteWords,
    selectedWordIds,
    setSelectedWordIds,
    playerRef,
    editedDurationInFrames,
    onFrameUpdate: setCurrentFrame,
  });

  useMountEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  });

  if (view === "management") {
    return (
      <div className="h-screen flex flex-col bg-[#011626] text-[#f1f2f3] overflow-hidden">
        <EditorHeader />
        <ClipManagement />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#011626] text-[#f1f2f3] overflow-hidden font-sans">
      <EditorHeader />

      <main className="flex-1 flex overflow-hidden">
        <PlayerSection />
        <TranscriptionSidebar />
      </main>

      <TimelineEditor
        key={activeTimelineId || "default"}
        transcription={transcription}
        clips={clips}
        onClipsChange={setClips}
        currentFrame={currentFrame}
        fps={VIDEO_FPS}
        paddingEnabled={paddingEnabled}
        onPaddingEnabledChange={setPaddingEnabled}
        paddingDuration={paddingDuration}
        onPaddingDurationChange={setPaddingDuration}
        onTrimSilences={onTrimSilences}
        isTrimmingSilences={isTrimmingSilences}
        onSplitAtPlayhead={onSplitAtPlayhead}
        zoom={zoom}
        onZoomChange={setZoom}
        onSeek={(frame) => {
          playerRef.current?.seekTo(frame);
          setCurrentFrame(frame);
          lastFrameRef.current = frame;
        }}
      />
    </div>
  );
};
