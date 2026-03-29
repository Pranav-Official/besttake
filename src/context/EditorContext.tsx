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
  SourceFile,
  Timeline,
} from "../types/constants";
import { useTimelineHistory } from "../hooks/use-timeline-history";

export type EditorView = "management" | "editor";

interface EditorContextType {
  // State
  view: EditorView;
  sourceFiles: SourceFile[];
  videoSrc: string | undefined; // Still used for preview/single video compatibility if needed
  serverVideoUrl: string | undefined;
  transcription: WordTranscription[]; // This will now be the CONCATENATED transcription in editor mode

  timelines: Timeline[];
  activeTimelineId: string;
  clips: Clip[];

  currentFrame: number;
  zoom: number; // Added zoom state
  selectedRatio: AspectRatio;
  nativeDimensions: { width: number; height: number };
  isTranscribing: boolean;
  isUnsupportedCodec: boolean;
  paddingEnabled: boolean;
  paddingDuration: number;
  selectedWordIds: Set<string>;
  activeFileId: string | null;
  activeLibraryItem: {
    id: string;
    name: string;
    url: string;
    filename: string;
  } | null;

  // Ref
  playerRef: React.RefObject<PlayerRef | null>;
  lastFrameRef: React.MutableRefObject<number>;

  // Derived
  dimensions: { width: number; height: number };
  editedDurationInFrames: number;
  originalCurrentTime: number;
  deletedWordIds: Set<string>;

  // Actions
  setView: (view: EditorView) => void;
  setSourceFiles: (
    files: SourceFile[] | ((prev: SourceFile[]) => SourceFile[]),
  ) => void;
  setVideoSrc: (src: string | undefined) => void;
  setServerVideoUrl: (url: string | undefined) => void;
  setTranscription: (t: WordTranscription[]) => void;

  setActiveTimelineId: (id: string) => void;
  addTimeline: (timeline: Timeline) => void;
  removeTimeline: (id: string) => void; // Added remove timeline
  setClips: (c: Clip[] | ((prev: Clip[]) => Clip[])) => void;

  setCurrentFrame: (frame: number) => void;
  setZoom: (zoom: number) => void; // Added zoom setter
  setSelectedRatio: (ratio: AspectRatio) => void;
  setNativeDimensions: (dim: { width: number; height: number }) => void;
  setIsTranscribing: (val: boolean) => void;
  setIsUnsupportedCodec: (val: boolean) => void;
  setPaddingEnabled: (val: boolean) => void;
  setPaddingDuration: (val: number) => void;
  setSelectedWordIds: (ids: Set<string>) => void;
  setActiveFileId: (id: string | null) => void;
  setActiveLibraryItem: (
    item: { id: string; name: string; url: string; filename: string } | null,
  ) => void;

  // History

  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider = ({ children }: { children: ReactNode }) => {
  const [view, setView] = useState<EditorView>("management");
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isUnsupportedCodec, setIsUnsupportedCodec] = useState(false);
  const [paddingEnabled, setPaddingEnabled] = useState(true);
  const [paddingDuration, setPaddingDuration] = useState(0.5);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(
    new Set(),
  );
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeLibraryItem, setActiveLibraryItem] = useState<{
    id: string;
    name: string;
    url: string;
    filename: string;
  } | null>(null);

  const {
    timelines,
    activeTimelineId,
    setActiveTimelineId,
    addTimeline,
    removeTimeline,
    clips,
    setClips,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useTimelineHistory([{ id: "original", name: "Original", clips: [] }]);

  const [currentFrame, setCurrentFrame] = useState(0);
  const [zoom, setZoom] = useState(50); // Global zoom state
  const lastFrameRef = useRef(0);

  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>("original");
  const [nativeDimensions, setNativeDimensions] = useState({
    width: 1920,
    height: 1080,
  });

  const playerRef = useRef<PlayerRef>(null);

  // Derive active file and related sources (Pattern 1: Derive State)
  const activeFile = useMemo(
    () => sourceFiles.find((f) => f.id === activeFileId),
    [activeFileId, sourceFiles],
  );
  const videoSrc = activeFile?.url;
  const serverVideoUrl = activeFile?.serverUrl;

  // Derived: unifiedTranscription
  const unifiedTranscription = useMemo(() => {
    if (view === "management") return [];

    const result: WordTranscription[] = [];
    let accumulatedTime = 0;

    clips.forEach((clip) => {
      const sourceFile = sourceFiles.find((f) => f.id === clip.fileId);
      if (!sourceFile) return;

      const duration = clip.sourceEnd - clip.sourceStart;
      const lStart = clip.logicalStart ?? clip.sourceStart;
      const lEnd = clip.logicalEnd ?? clip.sourceEnd;

      const wordsInClip = sourceFile.transcription.filter(
        (w) => w.start >= lStart - 0.01 && w.end <= lEnd + 0.01,
      );

      wordsInClip.forEach((w) => {
        result.push({
          ...w,
          id: `word-${clip.id}-${w.id}`, // Use clip.id for stability
          clipId: clip.id,
          start: w.start - clip.sourceStart + accumulatedTime,
          end: w.end - clip.sourceStart + accumulatedTime,
        });
      });

      accumulatedTime += duration;
    });

    return result;
  }, [view, clips, sourceFiles]);

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
    const baseHeight = 1080;
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
    return new Set<string>();
  }, []);

  const value: EditorContextType = {
    view,
    sourceFiles,
    videoSrc,
    serverVideoUrl,
    transcription: unifiedTranscription,
    timelines,
    activeTimelineId,
    clips,
    currentFrame,
    zoom,
    selectedRatio,
    nativeDimensions,
    isTranscribing,
    isUnsupportedCodec,
    paddingEnabled,
    paddingDuration,
    selectedWordIds,
    activeFileId,
    activeLibraryItem,
    playerRef,
    lastFrameRef,
    dimensions,
    editedDurationInFrames,
    originalCurrentTime,
    deletedWordIds,
    setView,
    setSourceFiles,
    setVideoSrc: () => {}, // mock
    setServerVideoUrl: () => {}, // mock
    setTranscription: () => {}, // No-op for now, needs refactor if used
    setActiveTimelineId,
    addTimeline,
    removeTimeline,
    setClips,
    setCurrentFrame,
    setZoom,
    setSelectedRatio,
    setNativeDimensions,
    setIsTranscribing,
    setIsUnsupportedCodec,
    setPaddingEnabled,
    setPaddingDuration,
    setSelectedWordIds,
    setActiveFileId,
    setActiveLibraryItem,
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
