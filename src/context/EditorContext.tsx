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
  Project,
  ProjectMetadata,
} from "../types/constants";
import { useHistory } from "../hooks/use-history";
import { useEffect, useCallback } from "react";

export type EditorView = "management" | "editor" | "dashboard";

interface EditorContextType {
  // State
  view: EditorView;
  activeProject: Project | null;
  projectsList: ProjectMetadata[];
  sourceFiles: SourceFile[];
  videoSrc: string | undefined; // Still used for preview/single video compatibility if needed
  serverVideoUrl: string | undefined;
  transcription: WordTranscription[]; // This will now be the CONCATENATED transcription in editor mode
  clips: Clip[];
  currentFrame: number;
  selectedRatio: AspectRatio;
  nativeDimensions: { width: number; height: number };
  isTranscribing: boolean;
  isUnsupportedCodec: boolean;
  paddingEnabled: boolean;
  paddingDuration: number;
  selectedWordIds: Set<string>;
  activeFileId: string | null;

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
  setActiveProject: (project: Project | null) => void;
  setSourceFiles: (
    files: SourceFile[] | ((prev: SourceFile[]) => SourceFile[]),
  ) => void;
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
  setActiveFileId: (id: string | null) => void;

  // Persistence Actions
  saveProject: (asNew?: boolean, newName?: string) => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  createNewProject: (name: string) => void;
  refreshProjectsList: () => Promise<void>;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider = ({ children }: { children: ReactNode }) => {
  const [view, setView] = useState<EditorView>("dashboard");
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projectsList, setProjectsList] = useState<ProjectMetadata[]>([]);
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
  const [videoSrc, setVideoSrc] = useState<string | undefined>(undefined);
  const [serverVideoUrl, setServerVideoUrl] = useState<string | undefined>(
    undefined,
  );
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isUnsupportedCodec, setIsUnsupportedCodec] = useState(false);
  const [paddingEnabled, setPaddingEnabled] = useState(true);
  const [paddingDuration, setPaddingDuration] = useState(0.5);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(
    new Set(),
  );
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  const {
    state: clips,
    set: setClips,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetHistory,
  } = useHistory<Clip[]>([]);

  const [currentFrame, setCurrentFrame] = useState(0);
  const lastFrameRef = useRef(0);

  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>("original");
  const [nativeDimensions, setNativeDimensions] = useState({
    width: 1280,
    height: 720,
  });

  const playerRef = useRef<PlayerRef>(null);

  // Persistence logic
  const refreshProjectsList = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjectsList(data);
      }
    } catch (err) {
      console.error("Failed to fetch projects list:", err);
    }
  }, []);

  const saveProject = useCallback(
    async (asNew?: boolean, newName?: string) => {
      if (!activeProject && !asNew) return;

      const projectId = asNew ? `proj-${Date.now()}` : activeProject!.id;
      const projectName =
        newName || (activeProject ? activeProject.name : "Untitled Project");

      const projectData: Project = {
        id: projectId,
        name: projectName,
        lastModified: Date.now(),
        sourceFiles,
        clips,
        aspectRatio: selectedRatio,
      };

      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projectData),
        });
        if (res.ok) {
          const result = await res.json();
          setActiveProject(result.project);
          refreshProjectsList();
        }
      } catch (err) {
        console.error("Failed to save project:", err);
      }
    },
    [activeProject, sourceFiles, clips, selectedRatio, refreshProjectsList],
  );

  const loadProject = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (res.ok) {
          const project = (await res.json()) as Project;
          setActiveProject(project);
          setSourceFiles(project.sourceFiles);
          setClips(project.clips);
          setSelectedRatio(project.aspectRatio);
          resetHistory(project.clips);
          setView("management");
        }
      } catch (err) {
        console.error("Failed to load project:", err);
      }
    },
    [setClips, resetHistory],
  );

  const deleteProject = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
        if (res.ok) {
          if (activeProject?.id === id) {
            setActiveProject(null);
            setView("dashboard");
          }
          refreshProjectsList();
        }
      } catch (err) {
        console.error("Failed to delete project:", err);
      }
    },
    [activeProject, refreshProjectsList],
  );

  const createNewProject = useCallback(
    (name: string) => {
      const newId = `proj-${Date.now()}`;
      const newProj: Project = {
        id: newId,
        name,
        lastModified: Date.now(),
        sourceFiles: [],
        clips: [],
        aspectRatio: "original",
      };
      setActiveProject(newProj);
      setSourceFiles([]);
      setClips([]);
      setSelectedRatio("original");
      resetHistory([]);
      setView("management");
      // Initial save
      fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProj),
      }).then(() => refreshProjectsList());
    },
    [setClips, resetHistory, refreshProjectsList],
  );

  // Initial fetch
  useEffect(() => {
    refreshProjectsList();
  }, [refreshProjectsList]);

  // Autosave
  useEffect(() => {
    if (!activeProject) return;

    const timer = setTimeout(() => {
      saveProject();
    }, 5000); // Autosave every 5 seconds if changes occur

    return () => clearTimeout(timer);
  }, [activeProject, sourceFiles, clips, selectedRatio, saveProject]);

  const [currentFrame, setCurrentFrame] = useState(0);
  const lastFrameRef = useRef(0);

  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>("original");
  const [nativeDimensions, setNativeDimensions] = useState({
    width: 1280,
    height: 720,
  });

  const playerRef = useRef<PlayerRef>(null);

  // Derived: unifiedTranscription
  const unifiedTranscription = useMemo(() => {
    if (view === "management") return [];

    const result: WordTranscription[] = [];
    let accumulatedTime = 0;

    clips.forEach((clip, clipIndex) => {
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
    return new Set<string>();
  }, []);

  const value: EditorContextType = {
    view,
    activeProject,
    projectsList,
    sourceFiles,
    videoSrc,
    serverVideoUrl,
    transcription: unifiedTranscription,
    clips,
    currentFrame,
    selectedRatio,
    nativeDimensions,
    isTranscribing,
    isUnsupportedCodec,
    paddingEnabled,
    paddingDuration,
    selectedWordIds,
    activeFileId,
    playerRef,
    lastFrameRef,
    dimensions,
    editedDurationInFrames,
    originalCurrentTime,
    deletedWordIds,
    setView,
    setActiveProject,
    setSourceFiles,
    setVideoSrc,
    setServerVideoUrl,
    setTranscription: () => {}, // No-op for now, needs refactor if used
    setClips,
    setCurrentFrame,
    setSelectedRatio,
    setNativeDimensions,
    setIsTranscribing,
    setIsUnsupportedCodec,
    setPaddingEnabled,
    setPaddingDuration,
    setSelectedWordIds,
    setActiveFileId,
    saveProject,
    loadProject,
    deleteProject,
    createNewProject,
    refreshProjectsList,
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
