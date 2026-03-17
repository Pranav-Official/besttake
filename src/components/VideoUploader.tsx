import React, { useCallback, useState } from "react";
import { Button } from "./Button";
import { InputContainer } from "./Container";
import { cn } from "../lib/utils";
import { Badge } from "./Badge";

interface VideoUploaderProps {
  onUpload: (videoSrc: string, file: File) => void;
  disabled?: boolean;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  onUpload,
  disabled,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("video/")) {
        const url = URL.createObjectURL(file);
        onUpload(url, file);
      }
    },
    [disabled, onUpload],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith("video/")) {
        const url = URL.createObjectURL(file);
        onUpload(url, file);
      }
    },
    [onUpload],
  );

  return (
    <InputContainer
      className={cn(
        "relative flex flex-col items-center justify-center border-dashed border-2 py-16 transition-all duration-300 ease-in-out",
        isDragging
          ? "border-primary bg-primary/10"
          : "border-unfocused-border bg-[#0a2639]/50",
        disabled && "opacity-50 cursor-not-allowed",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="video/*"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        onChange={handleFileSelect}
        disabled={disabled}
      />

      <div className="flex flex-col items-center text-center">
        <div className="mb-6 p-4 rounded-full bg-primary/20 text-primary">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Upload your video</h3>
        <p className="text-subtitle mb-8 max-w-sm">
          Drag and drop your video file here or click to browse. We'll
          automatically transcribe it for you.
        </p>
        <div className="flex gap-4">
          <Badge variant="primary">MP4</Badge>
          <Badge variant="secondary">MOV</Badge>
          <Badge variant="accent">WebM</Badge>
        </div>

        <div className="mt-8">
          <Button variant="primary" disabled={disabled}>
            Select File
          </Button>
        </div>
      </div>
    </InputContainer>
  );
};
