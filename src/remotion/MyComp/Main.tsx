import {
  AbsoluteFill,
  OffthreadVideo,
  Series,
  useVideoConfig,
  staticFile,
  delayRender,
  continueRender,
} from "remotion";
import { z } from "zod";
import { CompositionProps, VIDEO_FPS } from "../../types/constants";
import { useState, useEffect } from "react";

export const Main = ({
  sourceFiles = [],
  clips = [],
}: z.infer<typeof CompositionProps>) => {
  const { fps } = useVideoConfig();
  const [handle] = useState(() => delayRender("Loading video metadata"));
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Ensure all source files are "ready" if needed, though OffthreadVideo handles most of this.
    // We'll signal ready once the component mounts and props are stable.
    setIsReady(true);
    continueRender(handle);
  }, [handle]);

  if (!isReady) return null;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Series>
        {clips.map((clip, index) => {
          const sourceFile = sourceFiles.find((f) => f.id === clip.fileId);
          if (!sourceFile) return null;

          const duration = clip.sourceEnd - clip.sourceStart;
          const targetUrl = sourceFile.serverUrl || sourceFile.url;
          const resolvedVideoSrc = targetUrl.startsWith("/")
            ? staticFile(targetUrl)
            : targetUrl;

          // Use Math.round for frame-accurate transitions in Series
          const durationInFrames = Math.max(1, Math.round(duration * fps));
          const startFrom = Math.round(clip.sourceStart * fps);
          const endAt = Math.round(clip.sourceEnd * fps);

          return (
            <Series.Sequence
              key={`${clip.id}-${index}`}
              durationInFrames={durationInFrames}
              premountFor={fps}
            >
              <OffthreadVideo
                src={resolvedVideoSrc}
                startFrom={startFrom}
                endAt={endAt}
                pauseWhenBuffering
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </Series.Sequence>
          );
        })}
      </Series>

      {clips.length === 0 && (
        <AbsoluteFill className="items-center justify-center bg-[#011626]">
          <p className="text-[#9cb2d7] font-bold">No clips in sequence</p>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
