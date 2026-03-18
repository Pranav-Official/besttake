"use client";

import React, { useMemo } from "react";
import { Player } from "@remotion/player";
import { useEditor } from "../../context/EditorContext";
import { Main } from "../../remotion/MyComp/Main";
import { VIDEO_FPS } from "../../types/constants";
import { Button } from "../Button";
import { usePlayerFrame } from "../../hooks/use-player-frame";

export const PlayerSection = () => {
  const {
    videoSrc,
    dimensions,
    editedDurationInFrames,
    currentFrame,
    setCurrentFrame,
    playerRef,
    lastFrameRef,
    transcription,
    clips,
    undo,
    redo,
    canUndo,
    canRedo,
    isUnsupportedCodec,
    setIsUnsupportedCodec,
    isTranscribing,
    selectedRatio,
  } = useEditor();

  usePlayerFrame(
    playerRef,
    (newFrame) => {
      setCurrentFrame(newFrame);
      lastFrameRef.current = newFrame;
    },
    [videoSrc, selectedRatio, isUnsupportedCodec, dimensions],
  );

  const inputProps = useMemo(() => {
    return {
      title: "Speech Based Editor",
      videoSrc,
      transcription,
      clips,
    };
  }, [videoSrc, transcription, clips]);

  return (
    <section className="w-3/5 border-r border-[#1d417c] flex flex-col bg-black/20 relative">
      {isUnsupportedCodec && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-10 text-center">
          <div className="max-w-xs">
            <div className="mb-4 inline-flex p-3 rounded-full bg-red/20 text-red">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2 text-white">
              Unsupported Video Track
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              Your browser cannot decode HEVC (H.265).
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsUnsupportedCodec(false)}
            >
              Try anyway
            </Button>
          </div>
        </div>
      )}

      {isTranscribing && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#011626]/70 backdrop-blur-sm p-10 text-center">
          <div className="max-w-xs flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <h3 className="text-xl font-bold mb-2">Transcribing video...</h3>
            <p className="text-[#9cb2d7]/70">
              Generating word-level timestamps with AI.
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 relative flex items-center justify-center bg-black">
        <Player
          key={`${videoSrc}-${dimensions.width}x${dimensions.height}`}
          ref={playerRef}
          component={Main}
          inputProps={inputProps}
          durationInFrames={editedDurationInFrames}
          fps={VIDEO_FPS}
          compositionHeight={dimensions.height}
          compositionWidth={dimensions.width}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          controls={false}
          autoPlay={false}
          loop={false}
        />
      </div>

      <div className="h-20 bg-[#022540] border-t border-[#1d417c] flex flex-col justify-center px-6 shrink-0 gap-2">
        <div className="w-full flex items-center gap-3">
          <span className="text-[10px] font-mono text-[#9cb2d7]/50 w-12 text-right">
            {Math.floor(currentFrame / VIDEO_FPS / 60)}:
            {String(Math.floor((currentFrame / VIDEO_FPS) % 60)).padStart(
              2,
              "0",
            )}
          </span>
          <input
            type="range"
            min={0}
            max={editedDurationInFrames}
            value={currentFrame}
            onChange={(e) => {
              const frame = parseInt(e.target.value, 10);
              playerRef.current?.seekTo(frame);
              setCurrentFrame(frame);
              lastFrameRef.current = frame;
            }}
            className="flex-1 h-1 bg-[#1d417c] rounded-full appearance-none cursor-pointer accent-[#7ead70]"
          />
          <span className="text-[10px] font-mono text-[#9cb2d7]/50 w-12 text-right">
            {Math.floor(editedDurationInFrames / VIDEO_FPS / 60)}:
            {String(
              Math.floor((editedDurationInFrames / VIDEO_FPS) % 60),
            ).padStart(2, "0")}
          </span>
        </div>

        <div className="flex items-center justify-center gap-6 relative">
          <div className="absolute left-0 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={!canUndo}
              className="p-1 h-auto text-[#9cb2d7] disabled:opacity-20"
              title="Undo (Ctrl+Z)"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M3 10h10a8 8 0 018 8v2M3 10l5 5m-5-5l5-5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                ></path>
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={redo}
              disabled={!canRedo}
              className="p-1 h-auto text-[#9cb2d7] disabled:opacity-20"
              title="Redo (Ctrl+Y)"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M21 10H11a8 8 0 00-8 8v2m18-10l-5 5m5-5l-5-5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                ></path>
              </svg>
            </Button>
          </div>
          <button
            className="text-[#9cb2d7] hover:text-[#f1f2f3] transition-colors"
            onClick={() =>
              playerRef.current?.seekTo(
                Math.max(0, currentFrame - 30 * VIDEO_FPS),
              )
            }
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18V6h2v12H6zm3.5-6L19 6v12l-9.5-6z"></path>
            </svg>
          </button>
          <button
            className="w-10 h-10 bg-[#1d417c] hover:bg-[#9cb2d7] hover:text-[#011626] rounded-full flex items-center justify-center text-[#f1f2f3] transition-all"
            onClick={() =>
              playerRef.current?.isPlaying()
                ? playerRef.current?.pause()
                : playerRef.current?.play()
            }
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"></path>
            </svg>
          </button>
          <button
            className="text-[#9cb2d7] hover:text-[#f1f2f3] transition-colors"
            onClick={() =>
              playerRef.current?.seekTo(
                Math.min(editedDurationInFrames, currentFrame + 30 * VIDEO_FPS),
              )
            }
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 6l9.5 6L5 18V6zm11 0h2v12h-2V6z"></path>
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
};
