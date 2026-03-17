import { AbsoluteFill, Video, Series, useVideoConfig } from "remotion";
import { z } from "zod";
import { CompositionProps } from "../../../types/constants";

export const Main = ({
  videoSrc,
  transcription = [],
  clips = [],
}: z.infer<typeof CompositionProps>) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: videoSrc ? "black" : "#011626" }}>
      {videoSrc ? (
        <AbsoluteFill>
          <Series>
            {clips.map((clip) => {
              const duration = clip.sourceEnd - clip.sourceStart;
              return (
                <Series.Sequence
                  key={`${clip.id}-${clip.sourceStart}`}
                  durationInFrames={Math.max(1, Math.ceil(duration * fps))}
                  // PREMOUNTING is key to avoid black frames!
                  premountFor={fps}
                >
                  <Video
                    src={videoSrc}
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

          {clips.length === 0 && transcription.length > 0 && (
            <AbsoluteFill className="items-center justify-center bg-[#011626]">
              <p className="text-[#ef4444] font-bold">All content deleted</p>
            </AbsoluteFill>
          )}
        </AbsoluteFill>
      ) : (
        <AbsoluteFill className="items-center justify-center">
          <p className="text-[#9cb2d7]">No video source</p>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
