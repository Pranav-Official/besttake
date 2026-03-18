import {
  AbsoluteFill,
  Video,
  Series,
  useVideoConfig,
  staticFile,
} from "remotion";
import { z } from "zod";
import { CompositionProps } from "../../types/constants";

export const Main = ({
  sourceFiles = [],
  clips = [],
}: z.infer<typeof CompositionProps>) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Series>
        {clips.map((clip) => {
          const sourceFile = sourceFiles.find((f) => f.id === clip.fileId);
          if (!sourceFile) return null;

          const duration = clip.sourceEnd - clip.sourceStart;
          const targetUrl = sourceFile.serverUrl || sourceFile.url;
          const resolvedVideoSrc = targetUrl.startsWith("/")
            ? staticFile(targetUrl)
            : targetUrl;

          return (
            <Series.Sequence
              key={`${clip.id}-${clip.sourceStart}`}
              durationInFrames={Math.max(1, Math.ceil(duration * fps))}
              // PREMOUNTING is key to avoid black frames!
              premountFor={fps}
            >
              <Video
                src={resolvedVideoSrc}
                startFrom={Math.floor(clip.sourceStart * fps)}
                endAt={Math.ceil(clip.sourceEnd * fps)}
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
