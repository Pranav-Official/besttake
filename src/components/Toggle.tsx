import React from "react";
import { cn } from "../lib/utils";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled,
  label,
}) => {
  return (
    <label
      className={cn(
        "flex items-center gap-geist-half cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <div className="relative inline-flex items-center group">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
        />
        <div
          className={cn(
            "w-10 h-5 bg-unfocused-border rounded-full transition-colors duration-200 ease-in-out group-hover:border-primary border border-transparent",
            checked && "bg-primary border-primary",
            "after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:duration-200",
            checked && "after:translate-x-full after:left-[calc(100%-18px)]",
          )}
        ></div>
      </div>
      {label && (
        <span className="text-sm font-medium text-foreground">{label}</span>
      )}
    </label>
  );
};
