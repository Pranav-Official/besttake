"use client";

import { Player, PlayerRef } from "@remotion/player";
import { parseMedia } from "@remotion/media-parser";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  Clip,
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
import { RenderModal } from "../../components/RenderModal";

type AspectRatio = "original" | "16:9" | "9:16" | "1:1";

const EditorPage: React.FC = () => {
  const playerRef = useRef<PlayerRef>(null);
  const [videoSrc, setVideoSrc] = useState<string | undefined>(undefined);
  const [serverVideoUrl, setServerVideoUrl] = useState<string | undefined>(
    undefined,
  );
  const [transcription, setTranscription] = useState<WordTranscription[]>([]);

  const {
    state: clips,
    set: setClips,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<Clip[]>([]);

  const [currentFrame, setCurrentFrame] = useState(0);
  const lastFrameRef = useRef(0);

  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(
    new Set(),
  );

  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatus, setRenderStatus] = useState("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showRenderModal, setShowRenderModal] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic Video Metadata
  const [nativeDimensions, setNativeDimensions] = useState({
    width: 1280,
    height: 720,
  });
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>("original");
  const [isUnsupportedCodec, setIsUnsupportedCodec] = useState(false);

  const editedDurationInFrames = useMemo(() => {
    if (clips.length === 0) return 300;

    let totalDurationInSeconds = 0;
    clips.forEach((clip) => {
      totalDurationInSeconds += clip.sourceEnd - clip.sourceStart;
    });

    return Math.max(1, Math.ceil(totalDurationInSeconds * VIDEO_FPS));
  }, [clips]);

  const originalCurrentTime = useMemo(() => {
    if (clips.length === 0) return currentFrame / VIDEO_FPS;

    let accumulatedTime = 0;
    const targetEditedTime = currentFrame / VIDEO_FPS;

    for (const clip of clips) {
      const duration = clip.sourceEnd - clip.sourceStart;
      if (targetEditedTime <= accumulatedTime + duration) {
        return clip.sourceStart + (targetEditedTime - accumulatedTime);
      }
      accumulatedTime += duration;
    }
    return accumulatedTime;
  }, [currentFrame, clips]);

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
    return () => {
      if (videoSrc && videoSrc.startsWith("blob:")) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [videoSrc]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

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

  const handleExport = async () => {
    if (!serverVideoUrl) {
      alert("Local video path not found. Please re-upload the video.");
      return;
    }

    setIsRendering(true);
    setRenderProgress(0);
    setRenderStatus("Initiating export...");
    setRenderError(null);
    setDownloadUrl(null);
    setShowRenderModal(true);

    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoSrc: serverVideoUrl,
          clips,
          dimensions,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start render");
      }

      const { id } = await response.json();

      // Start polling
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/render?id=${id}`);
          if (!statusRes.ok) return;

          const data = await statusRes.json();
          setRenderProgress(data.progress);
          setRenderStatus(data.status);

          if (data.done) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsRendering(false);
            if (data.error) {
              setRenderError(data.error);
            } else {
              setDownloadUrl(data.url);
            }
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 1000);
    } catch (err) {
      console.error("Export error:", err);
      setRenderError((err as Error).message);
      setIsRendering(false);
    }
  };

  const [isTranscribing, setIsTranscribing] = useState(false);

  const onUpload = useCallback(
    async (src: string, file: File, serverUrl?: string) => {
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
        setServerVideoUrl(serverUrl);

        // REAL TRANSCRIPTION: Start transcription if we have a serverUrl
        if (serverUrl) {
          setIsTranscribing(true);
          try {
            const transcribeRes = await fetch("/api/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ videoSrc: serverUrl }),
            });

            if (!transcribeRes.ok) {
              throw new Error("Transcription failed");
            }

            const realTranscription = await transcribeRes.json();
            setTranscription(realTranscription);
          } catch (err) {
            console.error("Transcription failed, falling back to mock:", err);
            setTranscription(
              generateMockTranscription(metadata.durationInSeconds ?? 20),
            );
          } finally {
            setIsTranscribing(false);
          }
        } else {
          // Fallback if local disk upload failed
          setTranscription(
            generateMockTranscription(metadata.durationInSeconds ?? 20),
          );
        }

        setClips([
          {
            id: "initial-clip",
            sourceStart: 0,
            sourceEnd: metadata.durationInSeconds ?? 20,
          },
        ]);
      } catch (err) {
        console.error("Critical error loading video metadata:", err);
        setNativeDimensions({ width: 1280, height: 720 });
        setVideoSrc(src);
        setServerVideoUrl(serverUrl);
        setTranscription(generateMockTranscription(20));
        setClips([
          {
            id: "initial-clip",
            sourceStart: 0,
            sourceEnd: 20,
          },
        ]);
      }
    },
    [videoSrc, setClips],
  );

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
    [getEditedTime],
  );

  const onDeleteWords = useCallback(
    (wordIds: string[]) => {
      const wordsToCutIds = new Set(wordIds);
      const wordToIndex = new Map(transcription.map((w, i) => [w.id, i]));

      setClips((prev) => {
        const nextClips: Clip[] = [];

        prev.forEach((clip) => {
          // Identify all words from the original transcript that are within this clip
          const wordsInClip = transcription.filter(
            (w) => w.start >= clip.sourceStart && w.end <= clip.sourceEnd,
          );

          // Keep only those that aren't being deleted
          const remainingWords = wordsInClip.filter(
            (w) => !wordsToCutIds.has(w.id),
          );

          if (remainingWords.length === 0) return;

          let currentSegment: WordTranscription[] = [];

          remainingWords.forEach((word) => {
            const originalIndex = wordToIndex.get(word.id)!;
            const lastOriginalIndex =
              currentSegment.length > 0
                ? wordToIndex.get(currentSegment[currentSegment.length - 1].id)!
                : -1;

            // If contiguous in the original transcript, group them
            if (
              currentSegment.length > 0 &&
              originalIndex === lastOriginalIndex + 1
            ) {
              currentSegment.push(word);
            } else {
              // Finish previous segment and start new one
              if (currentSegment.length > 0) {
                nextClips.push({
                  id: `${clip.id}-${nextClips.length}`,
                  sourceStart: currentSegment[0].start,
                  sourceEnd: currentSegment[currentSegment.length - 1].end,
                });
              }
              currentSegment = [word];
            }
          });

          // Final segment
          if (currentSegment.length > 0) {
            nextClips.push({
              id: `${clip.id}-${nextClips.length}`,
              sourceStart: currentSegment[0].start,
              sourceEnd: currentSegment[currentSegment.length - 1].end,
            });
          }
        });

        return nextClips;
      });
    },
    [transcription, setClips],
  );

  const deletedWordIds = useMemo(() => {
    const ids = new Set<string>();
    transcription.forEach((word) => {
      const isCovered = clips.some(
        (clip) => word.start < clip.sourceEnd && word.end > clip.sourceStart,
      );
      if (!isCovered) ids.add(word.id);
    });
    return ids;
  }, [transcription, clips]);

  const onToggleWordDelete = useCallback(
    (wordId: string) => {
      const isDeleted = deletedWordIds.has(wordId);
      if (isDeleted) {
        return;
      }
      onDeleteWords([wordId]);
    },
    [deletedWordIds, onDeleteWords],
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
      // 4. Timeline Navigation (Arrows)
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
          return;
        }
        e.preventDefault();
        if (playerRef.current) {
          const step = e.shiftKey ? VIDEO_FPS : 1;
          const current = playerRef.current.getCurrentFrame();
          const nextFrame =
            e.key === "ArrowLeft"
              ? Math.max(0, current - step)
              : Math.min(editedDurationInFrames, current + step);

          playerRef.current.seekTo(nextFrame);
          setCurrentFrame(nextFrame);
          lastFrameRef.current = nextFrame;
        }
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, selectedWordIds, onDeleteWords, editedDurationInFrames]);

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

        if (word.end === clip.sourceEnd) {
          // No split needed at end
          return prev;
        }

        nextClips.splice(clipIndex, 1, leftClip, rightClip);
        return nextClips;
      });
    },
    [transcription, clips, setClips],
  );

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onFrameUpdate = (e: any) => {
      const newFrame = e.detail.frame;
      const isPlaying = playerRef.current?.isPlaying();

      if (isPlaying) {
        // Throttle updates during playback: only update every 3 frames (~10 times per second)
        // to avoid React's synchronous render limit at clip boundaries.
        if (Math.abs(newFrame - lastFrameRef.current) >= 3) {
          setCurrentFrame(newFrame);
          lastFrameRef.current = newFrame;
        }
      } else {
        // Full responsiveness when paused or seeking manually
        setCurrentFrame(newFrame);
        lastFrameRef.current = newFrame;
      }
    };

    player.addEventListener("frameupdate", onFrameUpdate);
    return () => player.removeEventListener("frameupdate", onFrameUpdate);
  }, [videoSrc, selectedRatio, isUnsupportedCodec, dimensions]);

  const inputProps: z.infer<typeof CompositionProps> = useMemo(() => {
    return {
      title: "Speech Based Editor",
      videoSrc,
      transcription,
      clips,
    };
  }, [videoSrc, transcription, clips]);

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
          <button
            onClick={handleExport}
            disabled={isRendering || !videoSrc}
            className="bg-[#9cb2d7] hover:bg-opacity-90 disabled:opacity-50 text-[#011626] text-xs px-4 py-1.5 rounded-md font-semibold"
          >
            {isRendering ? "Exporting..." : "Export Video"}
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

          {isTranscribing && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#011626]/70 backdrop-blur-sm p-10 text-center">
              <div className="max-w-xs flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <h3 className="text-xl font-bold mb-2">
                  Transcribing video...
                </h3>
                <p className="text-subtitle">
                  Generating word-level timestamps with AI.
                </p>
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
      </main>

      <TimelineEditor
        transcription={transcription}
        clips={clips}
        onClipsChange={setClips}
        currentFrame={currentFrame}
        fps={VIDEO_FPS}
        onSeek={(frame) => {
          playerRef.current?.seekTo(frame);
          setCurrentFrame(frame);
          lastFrameRef.current = frame;
        }}
      />

      <RenderModal
        isOpen={showRenderModal}
        progress={renderProgress}
        status={renderStatus}
        error={renderError}
        downloadUrl={downloadUrl}
        onClose={() => setShowRenderModal(false)}
      />
    </div>
  );
};

export default EditorPage;
