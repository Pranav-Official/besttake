import { z } from "zod";

export const COMP_NAME = "MyComp";

export const WordTranscriptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  start: z.number(), // in seconds
  end: z.number(), // in seconds
  clipId: z.string().optional(), // Added to track which clip a word belongs to in unified timeline
});

export const SourceFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  thumbnailUrl: z.string().optional(), // Added
  serverUrl: z.string().optional(),
  transcription: z.array(WordTranscriptionSchema),
  width: z.number(),
  height: z.number(),
  duration: z.number(),
});

export const ClipSchema = z.object({
  id: z.string(),
  fileId: z.string(), // Added to reference source file
  sourceStart: z.number(), // in seconds (includes padding)
  sourceEnd: z.number(), // in seconds (includes padding)
  logicalStart: z.number().optional(), // in seconds (unpadded)
  logicalEnd: z.number().optional(), // in seconds (unpadded)
});

export const TimelineSchema = z.object({
  id: z.string(),
  name: z.string(),
  clips: z.array(ClipSchema),
});

export const CompositionProps = z.object({
  title: z.string(),
  videoSrc: z.string().optional(),
  sourceFiles: z.array(SourceFileSchema).optional(), // Added
  transcription: z.array(WordTranscriptionSchema).optional(),
  clips: z.array(ClipSchema).optional(),
});

export type WordTranscription = z.infer<typeof WordTranscriptionSchema>;
export type SourceFile = z.infer<typeof SourceFileSchema>;
export type Clip = z.infer<typeof ClipSchema>;
export type Timeline = z.infer<typeof TimelineSchema>;
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
