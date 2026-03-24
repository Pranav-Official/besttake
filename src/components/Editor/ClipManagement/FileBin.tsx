"use client";

import { useState } from "react";
import { useEditor } from "../../../context/EditorContext";
import { VideoUploader } from "../../VideoUploader";
import { useVideoUpload } from "../../../hooks/use-video-upload";
import { SourceFile } from "../../../types/constants";
import { cn } from "../../../lib/utils";
import { useLibrary } from "../../../hooks/use-library";
import { LibraryThumbnail } from "./LibraryThumbnail";

export const FileBin = () => {
  const {
    sourceFiles,
    activeFileId,
    setActiveFileId,
    activeLibraryItem,
    setActiveLibraryItem,
    setClips,
    setSourceFiles,
  } = useEditor();
  const { onUpload, onLibrarySelect } = useVideoUpload();
  const { library, isLoading, deleteFile } = useLibrary();
  const [activeTab, setActiveTab] = useState<"project" | "library">("project");

  const handleTabChange = (tab: "project" | "library") => {
    setActiveTab(tab);
    if (tab === "project") {
      setActiveLibraryItem(null);
    }
  };

  const handleDeleteFromLibrary = async (filename: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this file from the server permanently?",
      )
    )
      return;
    try {
      await deleteFile(filename);
      // Also remove from project if it's there
      setSourceFiles((prev) =>
        prev.filter((f) => f.serverUrl !== `/uploads/${filename}`),
      );
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  };

  const removeFromProject = (fileId: string) => {
    setSourceFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (activeFileId === fileId) {
      setActiveFileId(null);
    }
  };

  const addClipToSequence = (file: SourceFile) => {
    setClips((prev) => [
      ...prev,
      {
        id: `clip-${file.id}-${Date.now()}`,
        fileId: file.id,
        sourceStart: 0,
        sourceEnd: file.duration,
        logicalStart: 0,
        logicalEnd: file.duration,
      },
    ]);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#022540] border-b border-[#1d417c]">
      <div className="p-4 border-b border-[#1d417c] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#9cb2d7]">
            Media Bin
          </h2>
          <div className="flex bg-[#011626]/60 p-1 rounded-md border border-[#1d417c]">
            <button
              onClick={() => handleTabChange("project")}
              className={cn(
                "px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition-all",
                activeTab === "project"
                  ? "bg-[#1d417c] text-white"
                  : "text-[#9cb2d7]/50 hover:text-[#9cb2d7]",
              )}
            >
              Project
            </button>
            <button
              onClick={() => handleTabChange("library")}
              className={cn(
                "px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition-all",
                activeTab === "library"
                  ? "bg-[#1d417c] text-white"
                  : "text-[#9cb2d7]/50 hover:text-[#9cb2d7]",
              )}
            >
              Library
            </button>
          </div>
        </div>
        <span className="text-[10px] text-[#9cb2d7]/50">
          {activeTab === "project"
            ? `${sourceFiles.length} project files`
            : `${library.length} server files`}
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
        {activeTab === "project" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {/* Uploader Card */}
            <div className="aspect-video">
              <VideoUploader onUpload={onUpload} />
            </div>

            {sourceFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => setActiveFileId(file.id)}
                className={`relative aspect-video rounded-lg border-2 overflow-hidden cursor-pointer transition-all group ${
                  activeFileId === file.id
                    ? "border-[#9cb2d7] bg-[#1d417c]/30"
                    : "border-[#1d417c] bg-[#011626]/40 hover:border-[#1d417c]/80"
                }`}
              >
                {file.thumbnailUrl ? (
                  <img
                    src={file.thumbnailUrl}
                    alt={file.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    {file.transcription.length === 0 ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-[#9cb2d7] border-t-transparent rounded-full animate-spin" />
                        <span className="text-[8px] text-[#9cb2d7] font-bold uppercase tracking-widest">
                          Transcribing
                        </span>
                      </div>
                    ) : (
                      <svg
                        className="w-8 h-8 text-[#9cb2d7]/50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </div>
                )}

                {/* Overlay for Transcribing state if thumbnail exists */}
                {file.thumbnailUrl && file.transcription.length === 0 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-[#9cb2d7] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-[10px] font-medium truncate text-white">
                    {file.name}
                  </p>
                  <p className="text-[8px] text-[#9cb2d7]">
                    {Math.floor(file.duration / 60)}:
                    {String(Math.floor(file.duration % 60)).padStart(2, "0")}
                  </p>
                </div>

                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromProject(file.id);
                    }}
                    className="w-6 h-6 bg-red-500/80 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95"
                    title="Remove from project"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addClipToSequence(file);
                    }}
                    className="w-6 h-6 bg-[#9cb2d7] text-[#011626] rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95"
                    title="Add to sequence"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {isLoading ? (
              <div className="col-span-full py-20 flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-[#1d417c] border-t-[#9cb2d7] rounded-full animate-spin" />
                <span className="text-xs text-[#9cb2d7] uppercase tracking-widest font-bold">
                  Scanning Server...
                </span>
              </div>
            ) : library.length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <p className="text-[#9cb2d7]/50 text-sm">
                  No files found on server.
                </p>
              </div>
            ) : (
              library.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setActiveLibraryItem(item);
                    setActiveFileId(null);
                  }}
                  className={cn(
                    "relative aspect-video rounded-lg border-2 overflow-hidden group cursor-pointer transition-all",
                    activeLibraryItem?.id === item.id
                      ? "border-[#9cb2d7] bg-[#1d417c]/30"
                      : "border-[#1d417c] bg-[#011626]/40 hover:border-[#1d417c]/80",
                  )}
                >
                  <LibraryThumbnail url={item.url} name={item.name} />

                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-[10px] font-medium truncate text-white">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-[8px] text-[#9cb2d7]">
                        {(item.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                      {item.hasTranscription && (
                        <span className="text-[8px] bg-green-500/20 text-green-400 px-1 rounded border border-green-500/30">
                          CACHED
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLibrarySelect(item);
                      }}
                      className="px-3 py-1.5 bg-[#9cb2d7] text-[#011626] text-[10px] font-bold uppercase rounded shadow-lg hover:scale-105 transition-transform"
                    >
                      Import
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFromLibrary(item.filename);
                      }}
                      className="p-1.5 bg-red-500/80 text-white rounded shadow-lg hover:scale-105 transition-transform"
                      title="Delete from server"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
