import React from "react";
import { cn } from "../lib/utils";

export interface ChipProps {
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  onClick,
  active,
  disabled,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-geist-half h-7 rounded-full border text-xs font-medium transition-all duration-150 ease-in-out inline-flex items-center",
        active
          ? "bg-primary text-background border-primary"
          : "bg-transparent text-foreground border-unfocused-border hover:border-primary hover:text-primary",
        disabled &&
          "opacity-50 cursor-not-allowed border-unfocused-border hover:text-foreground hover:border-unfocused-border",
      )}
    >
      {label}
    </button>
  );
};
