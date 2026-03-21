"use client";

import { useEditor } from "../../../context/EditorContext";
import { FileBin } from "./FileBin";
import { ClipOrdering } from "./ClipOrdering";
import { Player } from "@remotion/player";
import { Main } from "../../../remotion/MyComp/Main";
import { VIDEO_FPS, SourceFile } from "../../../types/constants";

export const ClipManagement = () => {
  const { sourceFiles, activeFileId, activeLibraryItem, dimensions } =
    useEditor();

  const activeFile = sourceFiles.find((f) => f.id === activeFileId);

  // Use either activeFile (project) or activeLibraryItem (server library) for preview
  const previewFile =
    activeFile ||
    (activeLibraryItem
      ? {
          id: activeLibraryItem.filename,
          name: activeLibraryItem.name,
          url: activeLibraryItem.url,
          serverUrl: activeLibraryItem.url,
          duration: 300, // Default duration for preview if unknown
          width: 1920,
          height: 1080,
          transcription: [],
        }
      : null);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#011626]">
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Side: Bin */}
        <div className="flex-1 flex flex-col min-w-0">
          <FileBin />
        </div>

        {/* Right Side: Preview Player */}
        <div className="w-[400px] border-l border-[#1d417c] bg-black/20 flex flex-col shrink-0">
          <div className="p-4 border-b border-[#1d417c] shrink-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#9cb2d7]">
              Preview {activeLibraryItem && !activeFile && "(Library)"}
            </h2>
          </div>
          <div className="flex-1 flex items-center justify-center bg-black p-4">
            {previewFile ? (
              <Player
                key={previewFile.id}
                component={Main}
                inputProps={{
                  title: "Preview",
                  sourceFiles: activeFile
                    ? sourceFiles
                    : ([previewFile] as SourceFile[]),
                  clips: [
                    {
                      id: "preview",
                      fileId: previewFile.id,
                      sourceStart: 0,
                      sourceEnd: previewFile.duration,
                    },
                  ],
                }}
                durationInFrames={Math.ceil(previewFile.duration * VIDEO_FPS)}
                fps={VIDEO_FPS}
                compositionHeight={dimensions.height}
                compositionWidth={dimensions.width}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                controls
              />
            ) : (
              <div className="text-[#9cb2d7]/30 text-xs text-center px-10">
                Select a file from the bin to preview it here.
              </div>
            )}
          </div>
          {previewFile && (
            <div className="p-4 bg-[#022540] border-t border-[#1d417c]">
              <p className="text-xs font-bold text-white truncate mb-1">
                {previewFile.name}
              </p>
              <p className="text-[10px] text-[#9cb2d7] uppercase font-mono">
                {previewFile.width}x{previewFile.height} •{" "}
                {previewFile.duration.toFixed(2)}s
              </p>
            </div>
          )}
        </div>
      </div>

      <ClipOrdering />
    </div>
  );
};
