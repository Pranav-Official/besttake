"use client";

import React from "react";
import { useEditor } from "../../context/EditorContext";
import { EditorHeader } from "./EditorHeader";
import { PlayerSection } from "./PlayerSection";
import { TranscriptionSidebar } from "./TranscriptionSidebar";
import { TimelineEditor } from "../TimelineEditor";
import { VIDEO_FPS } from "../../types/constants";
import { useKeyboardShortcuts } from "../../hooks/use-keyboard-shortcuts";
import { useSilenceDetection } from "../../hooks/use-silence-detection";
import { useEditorActions } from "../../hooks/use-editor-actions";
import { useVideoUpload } from "../../hooks/use-video-upload";
import { VideoUploader } from "../VideoUploader";
import { useMountEffect } from "../../hooks/use-mount-effect";
import Link from "next/link";

export const EditorLayout = () => {
  const {
    videoSrc,
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
  } = useEditor();

  const { onDeleteWords, onSplitAtPlayhead } = useEditorActions();
  const { onUpload } = useVideoUpload();
  const { mutateAsync: trimSilences, isPending: isTrimmingSilences } =
    useSilenceDetection();

  const onTrimSilences = async (
    noiseThreshold: number,
    minDuration: number,
  ) => {
    if (!serverVideoUrl) return;
    try {
      const audibleParts = await trimSilences({
        serverVideoUrl,
        noiseThreshold,
        minDuration,
      });
      const nextClips = audibleParts.map((part, i) => {
        const finalPadding = paddingEnabled ? paddingDuration : 0;
        return {
          id: `audible-${i}-${Date.now()}`,
          sourceStart: Math.max(0, part.startInSeconds - finalPadding),
          sourceEnd: Math.min(
            transcription[transcription.length - 1]?.end || 10000,
            part.endInSeconds + finalPadding,
          ),
          logicalStart: part.startInSeconds,
          logicalEnd: part.endInSeconds,
        };
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

  if (!videoSrc) {
    return (
      <div className="min-h-screen bg-[#011626] text-[#f1f2f3] flex flex-col">
        <header className="h-12 border-b border-[#1d417c] bg-[#022540] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#9cb2d7] rounded-md flex items-center justify-center">
              <svg
                className="w-4 h-4 text-[#011626]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                ></path>
              </svg>
            </div>
            <span className="font-bold tracking-tight">Best Take</span>
          </div>
          <Link href="/" className="text-xs text-[#9cb2d7] hover:underline">
            Back to Home
          </Link>
        </header>
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-xl">
            <VideoUploader onUpload={onUpload} />
          </div>
        </main>
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
        onSeek={(frame) => {
          playerRef.current?.seekTo(frame);
          setCurrentFrame(frame);
          lastFrameRef.current = frame;
        }}
      />
    </div>
  );
};
