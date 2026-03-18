"use client";

import { useEditor } from "../../../context/EditorContext";
import { FileBin } from "./FileBin";
import { ClipOrdering } from "./ClipOrdering";
import { Player } from "@remotion/player";
import { Main } from "../../../remotion/MyComp/Main";
import { VIDEO_FPS } from "../../../types/constants";

export const ClipManagement = () => {
  const { sourceFiles, activeFileId, dimensions } = useEditor();

  const activeFile = sourceFiles.find((f) => f.id === activeFileId);

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
              Preview
            </h2>
          </div>
          <div className="flex-1 flex items-center justify-center bg-black p-4">
            {activeFile ? (
              <Player
                key={activeFile.id}
                component={Main}
                inputProps={{
                  title: "Preview",
                  sourceFiles, // Pass sourceFiles here
                  clips: [
                    {
                      id: "preview",
                      fileId: activeFile.id,
                      sourceStart: 0,
                      sourceEnd: activeFile.duration,
                    },
                  ],
                }}
                durationInFrames={Math.ceil(activeFile.duration * VIDEO_FPS)}
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
          {activeFile && (
            <div className="p-4 bg-[#022540] border-t border-[#1d417c]">
              <p className="text-xs font-bold text-white truncate mb-1">
                {activeFile.name}
              </p>
              <p className="text-[10px] text-[#9cb2d7] uppercase font-mono">
                {activeFile.width}x{activeFile.height} •{" "}
                {activeFile.duration.toFixed(2)}s
              </p>
            </div>
          )}
        </div>
      </div>

      <ClipOrdering />
    </div>
  );
};
