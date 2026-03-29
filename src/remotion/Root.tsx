import { Composition, CalculateMetadataFunction } from "remotion";
import {
  COMP_NAME,
  defaultMyCompProps,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  TCompositionProps,
} from "../types/constants";
import { Main } from "./MyComp/Main";
import { NextLogo } from "./MyComp/NextLogo";

const calculateMetadata: CalculateMetadataFunction<TCompositionProps> = async ({
  props,
}) => {
  const clips = props.clips || [];
  const dimensions = props.dimensions || {
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
  };

  if (clips.length === 0) {
    return {
      durationInFrames: 300,
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  const totalDuration = clips.reduce((acc, clip) => {
    return acc + (clip.sourceEnd - clip.sourceStart);
  }, 0);

  return {
    durationInFrames: Math.max(1, Math.ceil(totalDuration * VIDEO_FPS)),
    width: dimensions.width,
    height: dimensions.height,
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id={COMP_NAME}
        component={Main}
        durationInFrames={600} // This is the default, overridden by calculateMetadata
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={defaultMyCompProps}
        calculateMetadata={calculateMetadata}
      />
      <Composition
        id="NextLogo"
        component={NextLogo}
        durationInFrames={300}
        fps={30}
        width={140}
        height={140}
        defaultProps={{
          outProgress: 0,
        }}
      />
    </>
  );
};
