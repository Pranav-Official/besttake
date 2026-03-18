"use client";

import { useEditor } from "../../../context/EditorContext";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Clip, SourceFile } from "../../../types/constants";

interface SortableClipProps {
  id: string;
  clip: Clip;
  sourceFile: SourceFile | undefined;
  index: number;
  onRemove: (id: string) => void;
  onMove: (index: number, direction: "left" | "right") => void;
  isFirst: boolean;
  isLast: boolean;
}

const SortableClip = ({
  id,
  clip,
  sourceFile,
  index,
  onRemove,
  onMove,
  isFirst,
  isLast,
}: SortableClipProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative min-w-[140px] max-w-[200px] h-28 bg-[#1d417c]/20 border border-[#9cb2d7]/20 rounded-lg overflow-hidden flex flex-col hover:border-[#9cb2d7]/50 transition-all shadow-lg shrink-0 cursor-default"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex-1 relative overflow-hidden bg-black/40 cursor-grab active:cursor-grabbing"
      >
        {sourceFile?.thumbnailUrl ? (
          <img
            src={sourceFile.thumbnailUrl}
            className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity"
            alt=""
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
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
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 p-2 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent">
          <span className="text-[10px] font-bold text-[#9cb2d7] truncate">
            {sourceFile?.name || "Missing File"}
          </span>
          <span className="text-[8px] text-[#9cb2d7]/50">
            {(clip.sourceEnd - clip.sourceStart).toFixed(2)}s
          </span>
        </div>
      </div>

      <div className="h-8 bg-[#022540] flex items-center justify-around border-t border-[#1d417c]/50 px-1">
        <button
          onClick={() => onMove(index, "left")}
          disabled={isFirst}
          className="text-[#9cb2d7]/50 hover:text-white disabled:opacity-10 transition-colors p-1"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
        <button
          onClick={() => onRemove(clip.id)}
          className="text-red-400/50 hover:text-red-400 transition-colors p-1"
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
              strokeWidth="2.5"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <button
          onClick={() => onMove(index, "right")}
          disabled={isLast}
          className="text-[#9cb2d7]/50 hover:text-white disabled:opacity-10 transition-colors p-1"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export const ClipOrdering = () => {
  const { clips, setClips, sourceFiles } = useEditor();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setClips((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const removeClip = (id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
  };

  const moveClip = (index: number, direction: "left" | "right") => {
    const nextIndex = direction === "left" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= clips.length) return;

    setClips((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[nextIndex];
      next[nextIndex] = temp;
      return next;
    });
  };

  return (
    <div className="h-52 bg-[#011626] border-t border-[#1d417c] flex flex-col shrink-0">
      <div className="px-4 py-2 border-b border-[#1d417c]/50 flex items-center justify-between shrink-0">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#9cb2d7]/70">
          Clip Sequence ({clips.length} clips)
        </h2>
        <span className="text-[10px] text-[#9cb2d7]/30 italic">
          Drag cards to reorder sequence
        </span>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar flex items-center px-4 gap-3">
        {clips.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[#9cb2d7]/30 text-xs italic">
            Sequence is empty. Add clips from the media bin above.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={clips.map((c) => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              {clips.map((clip, index) => {
                const sourceFile = sourceFiles.find(
                  (f) => f.id === clip.fileId,
                );
                return (
                  <SortableClip
                    key={clip.id}
                    id={clip.id}
                    clip={clip}
                    sourceFile={sourceFile}
                    index={index}
                    onRemove={removeClip}
                    onMove={moveClip}
                    isFirst={index === 0}
                    isLast={index === clips.length - 1}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};
