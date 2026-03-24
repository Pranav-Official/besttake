"use client";

import React, { useState } from "react";
import { useEditor } from "../../context/EditorContext";
import { Button } from "../Button";
import { ProjectMetadata } from "../../types/constants";

export const ProjectDashboard = () => {
  const { projectsList, loadProject, createNewProject, deleteProject } =
    useEditor();

  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const handleCreate = () => {
    if (newProjectName.trim()) {
      createNewProject(newProjectName.trim());
      setShowNewProjectModal(false);
      setNewProjectName("");
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#011626] p-8 overflow-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tightest text-white mb-2">
              My Projects
            </h1>
            <p className="text-[#9cb2d7]">
              Manage your video editing projects and drafts.
            </p>
          </div>
          <Button
            onClick={() => setShowNewProjectModal(true)}
            size="lg"
            className="px-8 shadow-xl shadow-black/20"
          >
            Create New Project
          </Button>
        </header>

        {projectsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-[#1d417c] rounded-3xl bg-[#022540]/30">
            <div className="w-16 h-16 bg-[#1d417c]/50 rounded-2xl flex items-center justify-center mb-6">
              <svg
                className="w-8 h-8 text-[#9cb2d7]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <p className="text-[#9cb2d7] font-medium mb-8">
              No projects found. Create your first one!
            </p>
            <Button onClick={() => setShowNewProjectModal(true)}>
              Get Started
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectsList.map((project: ProjectMetadata) => (
              <div
                key={project.id}
                className="group relative bg-[#022540] border border-[#1d417c] rounded-2xl p-6 transition-all hover:border-[#9cb2d7] hover:shadow-2xl hover:shadow-black/40 hover:-translate-y-1 cursor-pointer"
                onClick={() => loadProject(project.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-[#1d417c]/50 rounded-lg flex items-center justify-center text-[#9cb2d7]">
                    <svg
                      className="w-5 h-5"
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
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        confirm("Are you sure you want to delete this project?")
                      ) {
                        deleteProject(project.id);
                      }
                    }}
                    className="p-2 text-[#9cb2d7]/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-[#9cb2d7] transition-colors">
                  {project.name}
                </h3>
                <p className="text-xs text-[#9cb2d7]/50 font-mono uppercase tracking-widest">
                  Updated {new Date(project.lastModified).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#022540] border border-[#1d417c] rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-black text-white mb-6">New Project</h2>
            <div className="mb-8">
              <label className="block text-xs font-bold text-[#9cb2d7] uppercase tracking-widest mb-2">
                Project Name
              </label>
              <input
                autoFocus
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="My Awesome Video"
                className="w-full bg-[#011626] border border-[#1d417c] rounded-xl px-4 py-3 text-white placeholder-[#9cb2d7]/30 focus:outline-none focus:border-[#9cb2d7] transition-colors"
              />
            </div>
            <div className="flex gap-4">
              <Button
                variant="secondary"
                onClick={() => setShowNewProjectModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} className="flex-1">
                Create Project
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
