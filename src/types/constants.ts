import { z } from "zod";

export const COMP_NAME = "MyComp";

export const WordTranscriptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  start: z.number(), // in seconds
  end: z.number(), // in seconds
});

export const ClipSchema = z.object({
  id: z.string(),
  sourceStart: z.number(), // in seconds (includes padding)
  sourceEnd: z.number(), // in seconds (includes padding)
  logicalStart: z.number().optional(), // in seconds (unpadded)
  logicalEnd: z.number().optional(), // in seconds (unpadded)
});

export const CompositionProps = z.object({
  title: z.string(),
  videoSrc: z.string().optional(),
  transcription: z.array(WordTranscriptionSchema).optional(),
  clips: z.array(ClipSchema).optional(),
});

export type WordTranscription = z.infer<typeof WordTranscriptionSchema>;
export type Clip = z.infer<typeof ClipSchema>;
export type TCompositionProps = z.infer<typeof CompositionProps>;

export type AspectRatio = "original" | "16:9" | "9:16" | "1:1";

export const defaultMyCompProps: TCompositionProps = {
  title: "Speech Based Editor",
  videoSrc:
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  transcription: [],
};

export const DURATION_IN_FRAMES = 600; // Increased to 20s for demo
export const VIDEO_WIDTH = 1280;
export const VIDEO_HEIGHT = 720;
export const VIDEO_FPS = 30;
