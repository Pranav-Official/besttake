import React, { useMemo } from "react";

export const ProgressBar: React.FC<{
  progress: number;
}> = ({ progress }) => {
  const fill: React.CSSProperties = useMemo(() => {
    return {
      width: `${progress * 100}%`,
    };
  }, [progress]);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-primary uppercase tracking-widest">
          Rendering Progress
        </span>
        <span className="text-xs font-bold text-primary">
          {Math.round(progress * 100)}%
        </span>
      </div>
      <div className="w-full h-3 rounded-full bg-unfocused-border overflow-hidden">
        <div
          className="bg-primary h-full rounded-full transition-all ease-in-out duration-300 shadow-[0_0_10px_rgba(156,178,215,0.4)]"
          style={fill}
        ></div>
      </div>
    </div>
  );
};
