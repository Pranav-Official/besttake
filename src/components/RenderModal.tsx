import React from "react";
import { Button } from "./Button";

interface RenderModalProps {
  isOpen: boolean;
  progress: number;
  status: string;
  error?: string | null;
  onClose: () => void;
  downloadUrl?: string | null;
}

export const RenderModal: React.FC<RenderModalProps> = ({
  isOpen,
  progress,
  status,
  error,
  onClose,
  downloadUrl,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#022540] border border-[#1d417c] rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4 text-white">
            {error
              ? "Render Failed"
              : downloadUrl
                ? "Render Complete"
                : "Exporting Video"}
          </h3>

          {!error && !downloadUrl && (
            <div className="space-y-4">
              <div className="w-full bg-[#1d417c] h-3 rounded-full overflow-hidden">
                <div
                  className="bg-[#7ead70] h-full transition-all duration-300 ease-out"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-sm font-mono text-[#9cb2d7]">
                <span>{status}</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-6">
              {error}
            </div>
          )}

          {downloadUrl && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-16 h-16 bg-[#7ead70]/20 rounded-full flex items-center justify-center text-[#7ead70]">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-[#9cb2d7] text-center">
                Your video has been rendered successfully and is ready for
                download.
              </p>
              <a
                href={downloadUrl}
                download="exported-video.mp4"
                className="w-full"
              >
                <Button variant="primary" className="w-full">
                  Download Video
                </Button>
              </a>
            </div>
          )}
        </div>

        <div className="bg-[#011626]/50 p-4 flex justify-end border-t border-[#1d417c]">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={!downloadUrl && !error}
            className="text-[#9cb2d7]"
          >
            {downloadUrl || error ? "Close" : "Rendering..."}
          </Button>
        </div>
      </div>
    </div>
  );
};
