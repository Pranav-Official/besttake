"use client";

import { useEditor } from "../../../context/EditorContext";
import { VideoUploader } from "../../VideoUploader";
import { useVideoUpload } from "../../../hooks/use-video-upload";
import { SourceFile } from "../../../types/constants";

export const FileBin = () => {
  const { sourceFiles, activeFileId, setActiveFileId, setClips } = useEditor();
  const { onUpload } = useVideoUpload();

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
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#9cb2d7]">
          Media Bin
        </h2>
        <span className="text-[10px] text-[#9cb2d7]/50">
          {sourceFiles.length} files
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
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

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addClipToSequence(file);
                }}
                className="absolute top-2 right-2 w-6 h-6 bg-[#9cb2d7] text-[#011626] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110 active:scale-95"
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
          ))}
        </div>
      </div>
    </div>
  );
};
