"use client";

import { Player, PlayerRef } from "@remotion/player";
import { parseMedia } from "@remotion/media-parser";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  CompositionProps,
  VIDEO_FPS,
  WordTranscription,
} from "../../../types/constants";
import { Main } from "../../remotion/MyComp/Main";
import { VideoUploader } from "../../components/VideoUploader";
import { generateMockTranscription } from "../../helpers/mock-transcription";
import { Button } from "../../components/Button";
import { Dropdown } from "../../components/Dropdown";
import { TranscriptionView } from "../../components/TranscriptionView";
import { TimelineEditor } from "../../components/TimelineEditor";
import { useHistory } from "../../hooks/useHistory";

type AspectRatio = "original" | "16:9" | "9:16" | "1:1";

const EditorPage: React.FC = () => {
  const playerRef = useRef<PlayerRef>(null);
  const [videoSrc, setVideoSrc] = useState<string | undefined>(undefined);
  const [transcription, setTranscription] = useState<WordTranscription[]>([]);

  const {
    state: deletedWordIds,
    set: setDeletedWordIds,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<Set<string>>(new Set());

  const [currentFrame, setCurrentFrame] = useState(0);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(
    new Set(),
  );

  const editedDurationInFrames = useMemo(() => {
    if (transcription.length === 0) return 300;

    let totalDurationInSeconds = 0;
    transcription.forEach((word) => {
      if (!deletedWordIds.has(word.id)) {
        totalDurationInSeconds += word.end - word.start;
      }
    });

    return Math.max(1, Math.ceil(totalDurationInSeconds * VIDEO_FPS));
  }, [transcription, deletedWordIds]);

  const originalCurrentTime = useMemo(() => {
    if (transcription.length === 0) return currentFrame / VIDEO_FPS;

    let accumulatedTime = 0;
    const targetEditedTime = currentFrame / VIDEO_FPS;

    for (const word of transcription) {
      if (!deletedWordIds.has(word.id)) {
        const duration = word.end - word.start;
        if (targetEditedTime <= accumulatedTime + duration) {
          return word.start + (targetEditedTime - accumulatedTime);
        }
        accumulatedTime += duration;
      }
    }
    return accumulatedTime;
  }, [currentFrame, transcription, deletedWordIds]);

  // Dynamic Video Metadata
  const [nativeDimensions, setNativeDimensions] = useState({
    width: 1280,
    height: 720,
  });
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>("original");
  const [isUnsupportedCodec, setIsUnsupportedCodec] = useState(false);

  useEffect(() => {
    return () => {
      if (videoSrc && videoSrc.startsWith("blob:")) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [videoSrc]);

  // Prevent back and reload
  useEffect(() => {
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
  }, []);

  const onUpload = useCallback(
    async (src: string) => {
      if (videoSrc && videoSrc.startsWith("blob:")) {
        URL.revokeObjectURL(videoSrc);
      }

      const fetchMetadata = async (videoUrl: string) => {
        try {
          const meta = await parseMedia({
            src: videoUrl,
            fields: { width: true, height: true, durationInSeconds: true },
          });
          return {
            width: Math.max(1, meta.width),
            height: Math.max(1, meta.height),
            durationInSeconds: meta.durationInSeconds,
          };
        } catch {
          return new Promise<{
            width: number;
            height: number;
            durationInSeconds: number;
          }>((resolve, reject) => {
            const video = document.createElement("video");
            video.preload = "metadata";
            video.onloadedmetadata = () => {
              resolve({
                width: Math.max(1, video.videoWidth),
                height: Math.max(1, video.videoHeight),
                durationInSeconds: video.duration || 1,
              });
            };
            video.onerror = () =>
              reject(new Error("Manual metadata load failed"));
            video.src = videoUrl;
          });
        }
      };

      try {
        setIsUnsupportedCodec(false);
        const metadata = await fetchMetadata(src);

        if (metadata.width <= 1 || metadata.height <= 1) {
          setIsUnsupportedCodec(true);
        }

        setNativeDimensions({ width: metadata.width, height: metadata.height });
        setVideoSrc(src);
        setTranscription(
          generateMockTranscription(metadata.durationInSeconds ?? 20),
        );
        setDeletedWordIds(new Set());
      } catch (err) {
        console.error("Critical error loading video metadata:", err);
        setNativeDimensions({ width: 1280, height: 720 });
        setVideoSrc(src);
        setTranscription(generateMockTranscription(20));
        setDeletedWordIds(new Set());
      }
    },
    [videoSrc, setDeletedWordIds],
  );

  const getEditedTime = useCallback(
    (originalStartTime: number) => {
      let accumulatedEditedTime = 0;
      for (const word of transcription) {
        if (word.start >= originalStartTime) return accumulatedEditedTime;
        if (!deletedWordIds.has(word.id)) {
          accumulatedEditedTime += word.end - word.start;
        }
      }
      return accumulatedEditedTime;
    },
    [transcription, deletedWordIds],
  );

  const onWordClick = useCallback(
    (originalStartTime: number) => {
      if (playerRef.current) {
        const editedTime = getEditedTime(originalStartTime);
        const frame = Math.floor(editedTime * VIDEO_FPS);
        playerRef.current.seekTo(frame);
        setCurrentFrame(frame);
      }
    },
    [getEditedTime],
  );

  const onToggleWordDelete = useCallback(
    (wordId: string) => {
      setDeletedWordIds((prev) => {
        const next = new Set(prev);
        if (next.has(wordId)) next.delete(wordId);
        else next.add(wordId);
        return next;
      });
    },
    [setDeletedWordIds],
  );

  const onDeleteWords = useCallback(
    (wordIds: string[]) => {
      setDeletedWordIds((prev) => {
        const next = new Set(prev);
        wordIds.forEach((id) => next.add(id));
        return next;
      });
    },
    [setDeletedWordIds],
  );

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
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, selectedWordIds, onDeleteWords]);

  const dimensions = useMemo(() => {
    const baseHeight = 720;
    let w, h;

    if (selectedRatio === "original") {
      w = nativeDimensions.width;
      h = nativeDimensions.height;
    } else if (selectedRatio === "16:9") {
      w = Math.round(baseHeight * (16 / 9));
      h = baseHeight;
    } else if (selectedRatio === "9:16") {
      w = Math.round(baseHeight * (9 / 16));
      h = baseHeight;
    } else if (selectedRatio === "1:1") {
      w = baseHeight;
      h = baseHeight;
    } else {
      w = nativeDimensions.width;
      h = nativeDimensions.height;
    }

    return { width: Math.max(1, w), height: Math.max(1, h) };
  }, [nativeDimensions, selectedRatio]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onFrameUpdate = (e: any) => {
      setCurrentFrame(e.detail.frame);
    };

    player.addEventListener("frameupdate", onFrameUpdate);
    return () => player.removeEventListener("frameupdate", onFrameUpdate);
  }, [videoSrc, selectedRatio, isUnsupportedCodec, dimensions]);

  const inputProps: z.infer<typeof CompositionProps> = useMemo(() => {
    return {
      title: "Speech Based Editor",
      videoSrc,
      transcription,
      deletedWordIds: Array.from(deletedWordIds),
    };
  }, [videoSrc, transcription, deletedWordIds]);

  const ratioOptions = [
    { label: "Original", value: "original" },
    { label: "16:9", value: "16:9" },
    { label: "9:16", value: "9:16" },
    { label: "1:1", value: "1:1" },
  ];

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
      <header className="h-12 border-b border-[#1d417c] bg-[#022540] flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-6">
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
          <nav className="flex gap-4 text-xs font-medium text-[#9cb2d7]/70">
            <button className="hover:text-[#f1f2f3]">File</button>
            <button className="hover:text-[#f1f2f3] text-[#f1f2f3] border-b-2 border-[#9cb2d7]">
              Edit
            </button>
            <button className="hover:text-[#f1f2f3]">View</button>
            <button className="hover:text-[#f1f2f3]">Export</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-32">
            <Dropdown
              options={ratioOptions}
              value={selectedRatio}
              onChange={(v) => setSelectedRatio(v as AspectRatio)}
            />
          </div>
          <button className="bg-[#9cb2d7] hover:bg-opacity-90 text-[#011626] text-xs px-4 py-1.5 rounded-md font-semibold">
            Export Video
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
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

          <div className="flex-1 relative flex items-center justify-center bg-black">
            <Player
              key={`${videoSrc}-${selectedRatio}`}
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
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
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
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z"></path>
                </svg>
              </button>
              <button
                className="text-[#9cb2d7] hover:text-[#f1f2f3] transition-colors"
                onClick={() =>
                  playerRef.current?.seekTo(
                    Math.min(
                      editedDurationInFrames,
                      currentFrame + 30 * VIDEO_FPS,
                    ),
                  )
                }
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M5 6l9.5 6L5 18V6zm11 0h2v12h-2V6z"></path>
                </svg>
              </button>
            </div>
          </div>
        </section>

        <section className="w-2/5 flex flex-col bg-[#022540]">
          <TranscriptionView
            transcription={transcription}
            currentTime={originalCurrentTime}
            onWordClick={onWordClick}
            onDeleteWords={(ids) => {
              onDeleteWords(ids);
              setSelectedWordIds(new Set());
            }}
            onToggleWordDelete={onToggleWordDelete}
            deletedWordIds={deletedWordIds}
            selectedWordIds={selectedWordIds}
            onSelectionChange={setSelectedWordIds}
          />
        </section>
      </main>

      <TimelineEditor
        transcription={transcription}
        deletedWordIds={deletedWordIds}
        currentFrame={currentFrame}
        fps={VIDEO_FPS}
        onSeek={(frame) => {
          playerRef.current?.seekTo(frame);
          setCurrentFrame(frame);
        }}
      />
    </div>
  );
};

export default EditorPage;
