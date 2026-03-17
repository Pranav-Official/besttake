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

type AspectRatio = "original" | "16:9" | "9:16" | "1:1";

const EditorPage: React.FC = () => {
  const playerRef = useRef<PlayerRef>(null);
  const [videoSrc, setVideoSrc] = useState<string | undefined>(undefined);
  const [transcription, setTranscription] = useState<WordTranscription[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);

  // Dynamic Video Metadata
  const [nativeDimensions, setNativeDimensions] = useState({
    width: 1280,
    height: 720,
  });
  const [durationInFrames, setDurationInFrames] = useState(300);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>("original");
  const [isUnsupportedCodec, setIsUnsupportedCodec] = useState(false);

  useEffect(() => {
    const { current } = playerRef;
    if (!current) {
      return;
    }

    const onFrameUpdate = (e: { detail: { frame: number } }) => {
      setCurrentFrame(e.detail.frame);
    };

    current.addEventListener("frameupdate", onFrameUpdate);

    return () => {
      current.removeEventListener("frameupdate", onFrameUpdate);
    };
  }, [videoSrc]);

  // Cleanup blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (videoSrc && videoSrc.startsWith("blob:")) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [videoSrc]);

  const onUpload = useCallback(async (src: string, file: File) => {
    // Revoke previous blob URL to prevent memory leaks
    if (videoSrc && videoSrc.startsWith("blob:")) {
      URL.revokeObjectURL(videoSrc);
    }

    const fetchMetadata = async (videoUrl: string) => {
      try {
        const meta = await parseMedia({
          src: videoUrl,
          fields: {
            width: true,
            height: true,
            durationInSeconds: true,
          },
        });
        return {
          width: Math.max(1, meta.width),
          height: Math.max(1, meta.height),
          durationInSeconds: meta.durationInSeconds,
        };
      } catch (remotionError) {
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

      const frames = Math.max(
        1,
        Math.floor((metadata.durationInSeconds ?? 20) * VIDEO_FPS),
      );

      setDurationInFrames(frames);
      setNativeDimensions({
        width: metadata.width,
        height: metadata.height,
      });
      setVideoSrc(src);

      const mockData = generateMockTranscription(
        metadata.durationInSeconds ?? 20,
      );
      setTranscription(mockData);
    } catch (err) {
      console.error("Critical error loading video metadata:", err);
      setDurationInFrames(600);
      setNativeDimensions({ width: 1280, height: 720 });
      setVideoSrc(src);
      setTranscription(generateMockTranscription(20));
    }
  }, []);

  const onWordClick = useCallback((startTime: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(startTime * VIDEO_FPS);
    }
  }, []);

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

    return {
      width: Math.max(1, w),
      height: Math.max(1, h),
    };
  }, [nativeDimensions, selectedRatio]);

  const inputProps: z.infer<typeof CompositionProps> = useMemo(() => {
    return {
      title: "Speech Based Editor",
      videoSrc,
      transcription,
    };
  }, [videoSrc, transcription]);

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
      {/* Header */}
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

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Video Viewport */}
        <section className="w-3/5 border-r border-[#1d417c] flex flex-col bg-black/20 relative">
          {/* Warning Overlay */}
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
                  Your browser can hear the audio but cannot decode the video
                  track. This usually means the video uses the{" "}
                  <b className="text-white">HEVC (H.265)</b> codec.
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
              durationInFrames={durationInFrames}
              fps={VIDEO_FPS}
              compositionHeight={dimensions.height}
              compositionWidth={dimensions.width}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
              controls={false}
              autoPlay={false}
              loop={false}
            />
            <div className="absolute top-4 left-4 text-xs font-mono bg-black/60 px-2 py-1 rounded text-[#9cb2d7]">
              {dimensions.width}p {VIDEO_FPS}fps
            </div>
          </div>

          {/* Video Controls */}
          <div className="h-20 bg-[#022540] border-t border-[#1d417c] flex flex-col justify-center px-6 shrink-0 gap-3">
            {/* Seekbar */}
            <div className="w-full flex items-center gap-3">
              <span className="text-xs font-mono text-[#9cb2d7] w-20 text-right shrink-0">
                {String(Math.floor(currentFrame / 3600)).padStart(2, "0")}:
                {String(Math.floor((currentFrame % 3600) / 60)).padStart(
                  2,
                  "0",
                )}
                :{String(Math.floor(currentFrame % 60)).padStart(2, "0")}
              </span>
              <input
                type="range"
                min={0}
                max={durationInFrames}
                value={currentFrame}
                onChange={(e) => {
                  const frame = parseInt(e.target.value, 10);
                  playerRef.current?.seekTo(frame);
                  setCurrentFrame(frame);
                }}
                className="flex-1 h-1 bg-[#1d417c] rounded-full appearance-none cursor-pointer accent-[#7ead70]"
              />
              <span className="text-xs font-mono text-[#9cb2d7] w-20 shrink-0">
                {String(Math.floor(durationInFrames / 3600)).padStart(2, "0")}:
                {String(Math.floor((durationInFrames % 3600) / 60)).padStart(
                  2,
                  "0",
                )}
                :{String(Math.floor(durationInFrames % 60)).padStart(2, "0")}
              </span>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-6">
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
                className="w-12 h-12 bg-[#1d417c] hover:bg-[#9cb2d7] hover:text-[#011626] rounded-full flex items-center justify-center text-[#f1f2f3] transition-all"
                onClick={() => {
                  if (playerRef.current?.isPlaying()) {
                    playerRef.current?.pause();
                  } else {
                    playerRef.current?.play();
                  }
                }}
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
                    Math.min(durationInFrames, currentFrame + 30 * VIDEO_FPS),
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

        {/* Right: Text Panel */}
        <section className="w-2/5 flex flex-col bg-[#022540]">
          <TranscriptionView
            transcription={transcription}
            currentFrame={currentFrame}
            fps={VIDEO_FPS}
            onWordClick={onWordClick}
          />
        </section>
      </main>
    </div>
  );
};

export default EditorPage;
