import React from "react";
import { cn } from "../lib/utils";

export const InputContainer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "border border-unfocused-border p-8 rounded-[20px] bg-[#0a2639]/50 shadow-[0_10px_30px_rgba(0,0,0,0.1)] flex flex-col",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
