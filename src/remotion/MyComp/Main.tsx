import { fontFamily, loadFont } from "@remotion/google-fonts/Inter";
import {
  AbsoluteFill,
  Video,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { CompositionProps } from "../../../types/constants";
import { NextLogo } from "./NextLogo";
import { Rings } from "./Rings";
import { TextFade } from "./TextFade";

loadFont("normal", {
  subsets: ["latin"],
  weights: ["400", "700"],
});

export const Main = ({
  title,
  videoSrc,
  transcription,
}: z.infer<typeof CompositionProps>) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // const currentTime = frame / fps;

  const transitionStart = 2 * fps;
  const transitionDuration = 1 * fps;

  const logoOut = spring({
    fps,
    frame,
    config: {
      damping: 200,
    },
    durationInFrames: transitionDuration,
    delay: transitionStart,
  });

  // const activeWord = transcription?.find(
  //   (word) => currentTime >= word.start && currentTime <= word.end,
  // );

  return (
    <AbsoluteFill
      style={{ backgroundColor: videoSrc ? "transparent" : "#011626" }}
    >
      {videoSrc ? (
        <AbsoluteFill style={{ backgroundColor: "black" }}>
          <Video
            src={videoSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              backgroundColor: "black",
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill className="bg-white">
          <Sequence durationInFrames={transitionStart + transitionDuration}>
            <Rings outProgress={logoOut}></Rings>
            <AbsoluteFill className="justify-center items-center">
              <NextLogo outProgress={logoOut}></NextLogo>
            </AbsoluteFill>
          </Sequence>
          <Sequence from={transitionStart + transitionDuration / 2}>
            <TextFade>
              <h1
                className="text-[70px] font-bold text-black"
                style={{
                  fontFamily,
                }}
              >
                {title}
              </h1>
            </TextFade>
          </Sequence>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
