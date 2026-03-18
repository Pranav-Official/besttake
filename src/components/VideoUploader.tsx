import React, { useCallback, useState } from "react";
import { Button } from "./Button";
import { InputContainer } from "./Container";
import { cn } from "../lib/utils";
import { Badge } from "./Badge";

interface VideoUploaderProps {
  onUpload: (videoSrc: string, file: File, serverUrl?: string) => void;
  disabled?: boolean;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  onUpload,
  disabled,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && !uploading) setIsDragging(true);
    },
    [disabled, uploading],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        const localUrl = URL.createObjectURL(file);
        onUpload(localUrl, file, data.url);
      } catch (err) {
        console.error("Upload failed:", err);
        // Fallback to just local URL if server upload fails
        const localUrl = URL.createObjectURL(file);
        onUpload(localUrl, file);
      } finally {
        setUploading(false);
      }
    },
    [onUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled || uploading) return;

      const files = Array.from(e.dataTransfer.files);
      files.forEach((file) => {
        if (file.type.startsWith("video/")) {
          uploadFile(file);
        }
      });
    },
    [disabled, uploading, uploadFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      files.forEach((file) => {
        if (file.type.startsWith("video/")) {
          uploadFile(file);
        }
      });
    },
    [uploadFile],
  );

  return (
    <InputContainer
      className={cn(
        "relative flex flex-col items-center justify-center border-dashed border-2 py-16 transition-all duration-300 ease-in-out",
        isDragging
          ? "border-primary bg-primary/10"
          : "border-unfocused-border bg-[#0a2639]/50",
        (disabled || uploading) && "opacity-50 cursor-not-allowed",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="video/*"
        multiple
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
      />

      <div className="flex flex-col items-center text-center">
        {uploading ? (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <h3 className="text-xl font-bold mb-2">Saving to local disk...</h3>
            <p className="text-subtitle">
              This will enable high-power rendering.
            </p>
          </div>
        ) : (
          <>
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
              <Button variant="primary" disabled={disabled || uploading}>
                Select File
              </Button>
            </div>
          </>
        )}
      </div>
    </InputContainer>
  );
};
