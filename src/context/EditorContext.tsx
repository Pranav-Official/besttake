"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useMemo,
  ReactNode,
} from "react";
import { PlayerRef } from "@remotion/player";
import {
  Clip,
  WordTranscription,
  VIDEO_FPS,
  AspectRatio,
} from "../types/constants";
import { useHistory } from "../hooks/use-history";

interface EditorContextType {
  // State
  videoSrc: string | undefined;
  serverVideoUrl: string | undefined;
  transcription: WordTranscription[];
  clips: Clip[];
  currentFrame: number;
  selectedRatio: AspectRatio;
  nativeDimensions: { width: number; height: number };
  isTranscribing: boolean;
  isUnsupportedCodec: boolean;
  paddingEnabled: boolean;
  paddingDuration: number;
  selectedWordIds: Set<string>;

  // Ref
  playerRef: React.RefObject<PlayerRef | null>;
  lastFrameRef: React.MutableRefObject<number>;

  // Derived
  dimensions: { width: number; height: number };
  editedDurationInFrames: number;
  originalCurrentTime: number;
  deletedWordIds: Set<string>;

  // Actions
  setVideoSrc: (src: string | undefined) => void;
  setServerVideoUrl: (url: string | undefined) => void;
  setTranscription: (t: WordTranscription[]) => void;
  setClips: (c: Clip[] | ((prev: Clip[]) => Clip[])) => void;
  setCurrentFrame: (frame: number) => void;
  setSelectedRatio: (ratio: AspectRatio) => void;
  setNativeDimensions: (dim: { width: number; height: number }) => void;
  setIsTranscribing: (val: boolean) => void;
  setIsUnsupportedCodec: (val: boolean) => void;
  setPaddingEnabled: (val: boolean) => void;
  setPaddingDuration: (val: number) => void;
  setSelectedWordIds: (ids: Set<string>) => void;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider = ({ children }: { children: ReactNode }) => {
  const [videoSrc, setVideoSrc] = useState<string | undefined>(undefined);
  const [serverVideoUrl, setServerVideoUrl] = useState<string | undefined>(
    undefined,
  );
  const [transcription, setTranscription] = useState<WordTranscription[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isUnsupportedCodec, setIsUnsupportedCodec] = useState(false);
  const [paddingEnabled, setPaddingEnabled] = useState(true);
  const [paddingDuration, setPaddingDuration] = useState(0.5);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(
    new Set(),
  );

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

  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>("original");
  const [nativeDimensions, setNativeDimensions] = useState({
    width: 1280,
    height: 720,
  });

  const playerRef = useRef<PlayerRef>(null);

  // Derived: editedDurationInFrames
  const editedDurationInFrames = useMemo(() => {
    if (clips.length === 0) return 300;

    let totalDurationInSeconds = 0;
    clips.forEach((clip) => {
      totalDurationInSeconds += clip.sourceEnd - clip.sourceStart;
    });

    return Math.max(1, Math.ceil(totalDurationInSeconds * VIDEO_FPS));
  }, [clips]);

  // Derived: originalCurrentTime
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

  // Derived: dimensions
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

  // Derived: deletedWordIds
  const deletedWordIds = useMemo(() => {
    const ids = new Set<string>();
    transcription.forEach((word) => {
      const midpoint = (word.start + word.end) / 2;
      const isCovered = clips.some((clip) => {
        const lStart = clip.logicalStart ?? clip.sourceStart;
        const lEnd = clip.logicalEnd ?? clip.sourceEnd;
        return midpoint >= lStart - 0.01 && midpoint <= lEnd + 0.01;
      });
      if (!isCovered) ids.add(word.id);
    });
    return ids;
  }, [transcription, clips]);

  const value: EditorContextType = {
    videoSrc,
    serverVideoUrl,
    transcription,
    clips,
    currentFrame,
    selectedRatio,
    nativeDimensions,
    isTranscribing,
    isUnsupportedCodec,
    paddingEnabled,
    paddingDuration,
    selectedWordIds,
    playerRef,
    lastFrameRef,
    dimensions,
    editedDurationInFrames,
    originalCurrentTime,
    deletedWordIds,
    setVideoSrc,
    setServerVideoUrl,
    setTranscription,
    setClips,
    setCurrentFrame,
    setSelectedRatio,
    setNativeDimensions,
    setIsTranscribing,
    setIsUnsupportedCodec,
    setPaddingEnabled,
    setPaddingDuration,
    setSelectedWordIds,
    undo,
    redo,
    canUndo,
    canRedo,
  };

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
};
