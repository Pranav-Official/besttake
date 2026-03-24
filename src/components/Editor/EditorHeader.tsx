"use client";

import { useState } from "react";
import { useEditor } from "../../context/EditorContext";
import { Dropdown } from "../Dropdown";
import { AspectRatio } from "../../types/constants";
import { useRenderManager } from "../../hooks/use-render-manager";
import { RenderModal } from "../RenderModal";

export const EditorHeader = () => {
  const {
    view,
    setView,
    activeProject,
    saveProject,
    selectedRatio,
    setSelectedRatio,
    sourceFiles,
    clips,
    dimensions,
  } = useEditor();

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await saveProject();
    setTimeout(() => setIsSaving(false), 1000);
  };

  const handleSaveAs = async () => {
    const newName = prompt(
      "Enter new project name:",
      `${activeProject?.name || "Project"} Copy`,
    );
    if (newName) {
      setIsSaving(true);
      await saveProject(true, newName);
      setTimeout(() => setIsSaving(false), 1000);
    }
  };

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
    setShowRenderModal(true);
    try {
      await startRender({ sourceFiles, clips, dimensions });
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  return (
    <>
      <header className="h-12 border-b border-[#1d417c] bg-[#022540] flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-6">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setView("dashboard")}
          >
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

          <div className="h-6 w-px bg-[#1d417c] mx-1" />

          <div className="flex items-center gap-3">
            {activeProject ? (
              <span className="text-xs font-bold text-white px-2 py-1 bg-[#1d417c]/50 rounded border border-[#1d417c]">
                {activeProject.name}
              </span>
            ) : (
              <span className="text-xs font-medium text-[#9cb2d7]/50 italic">
                No project active
              </span>
            )}
          </div>

          <nav className="flex gap-4 text-xs font-medium text-[#9cb2d7]/70">
            <button
              onClick={() => setView("dashboard")}
              className={`hover:text-[#f1f2f3] transition-colors ${view === "dashboard" ? "text-[#f1f2f3] border-b-2 border-[#9cb2d7]" : ""}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setView("management")}
              className={`hover:text-[#f1f2f3] transition-colors ${view === "management" ? "text-[#f1f2f3] border-b-2 border-[#9cb2d7]" : ""}`}
            >
              File Management
            </button>
            <button
              onClick={() => setView("editor")}
              className={`hover:text-[#f1f2f3] transition-colors ${view === "editor" ? "text-[#f1f2f3] border-b-2 border-[#9cb2d7]" : ""}`}
            >
              Editor
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-2">
            <button
              onClick={handleSave}
              disabled={!activeProject || isSaving}
              className="text-[#9cb2d7] hover:text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 transition-colors disabled:opacity-30"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleSaveAs}
              disabled={!activeProject || isSaving}
              className="text-[#9cb2d7] hover:text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 transition-colors disabled:opacity-30"
            >
              Save As
            </button>
          </div>

          <div className="w-32">
            <Dropdown
              options={ratioOptions}
              value={selectedRatio}
              onChange={(v) => setSelectedRatio(v as AspectRatio)}
            />
          </div>
          <button
            onClick={handleExport}
            disabled={isRendering || clips.length === 0}
            className="bg-[#9cb2d7] hover:bg-opacity-90 disabled:opacity-50 text-[#011626] text-xs px-4 py-1.5 rounded-md font-semibold transition-all"
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
