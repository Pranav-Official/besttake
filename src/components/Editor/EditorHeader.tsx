"use client";

import React, { useState } from "react";
import { useEditor } from "../../context/EditorContext";
import { Dropdown } from "../Dropdown";
import { AspectRatio } from "../../types/constants";
import { useRenderManager } from "../../hooks/use-render-manager";
import { RenderModal } from "../RenderModal";

export const EditorHeader = () => {
  const {
    videoSrc,
    selectedRatio,
    setSelectedRatio,
    serverVideoUrl,
    clips,
    dimensions,
  } = useEditor();

  const {
    startRender,
    isRendering,
    progress,
    status,
    error,
    downloadUrl,
    reset,
  } = useRenderManager();

  const [showRenderModal, setShowRenderModal] = useState(false);

  const ratioOptions = [
    { label: "Original", value: "original" },
    { label: "16:9", value: "16:9" },
    { label: "9:16", value: "9:16" },
    { label: "1:1", value: "1:1" },
  ];

  const handleExport = async () => {
    if (!serverVideoUrl) {
      alert("Local video path not found. Please re-upload the video.");
      return;
    }
    setShowRenderModal(true);
    try {
      await startRender({ serverVideoUrl, clips, dimensions });
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  return (
    <>
      <header className="h-12 border-b border-[#1d417c] bg-[#022540] flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#9cb2d7] rounded-md flex items-center justify-center">
              <svg
                className="w-4 h-4 text-[#011626]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                ></path>
              </svg>
            </div>
            <span className="font-bold tracking-tight">Best Take</span>
          </div>
          <nav className="flex gap-4 text-xs font-medium text-[#9cb2d7]/70">
            <button className="hover:text-[#f1f2f3]">File</button>
            <button className="hover:text-[#f1f2f3] text-[#f1f2f3] border-b-2 border-[#9cb2d7]">
              Edit
            </button>
            <button className="hover:text-[#f1f2f3]">View</button>
            <button className="hover:text-[#f1f2f3]">Export</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-32">
            <Dropdown
              options={ratioOptions}
              value={selectedRatio}
              onChange={(v) => setSelectedRatio(v as AspectRatio)}
            />
          </div>
          <button
            onClick={handleExport}
            disabled={isRendering || !videoSrc}
            className="bg-[#9cb2d7] hover:bg-opacity-90 disabled:opacity-50 text-[#011626] text-xs px-4 py-1.5 rounded-md font-semibold"
          >
            {isRendering ? "Exporting..." : "Export Video"}
          </button>
        </div>
      </header>

      <RenderModal
        isOpen={showRenderModal}
        progress={progress}
        status={status}
        error={error?.message || null}
        downloadUrl={downloadUrl}
        onClose={() => {
          setShowRenderModal(false);
          if (!isRendering) reset();
        }}
      />
    </>
  );
};
