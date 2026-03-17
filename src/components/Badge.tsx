import React from "react";
import { cn } from "../lib/utils";

export interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | "primary"
    | "secondary"
    | "accent"
    | "success"
    | "danger"
    | "warning";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
  className,
}) => {
  const variantStyles = {
    primary: "bg-primary/20 text-primary border-primary/30",
    secondary: "bg-secondary/20 text-foreground border-secondary/30",
    accent: "bg-accent/20 text-accent border-accent/30",
    success: "bg-green/20 text-green border-green/30",
    danger: "bg-red/20 text-red border-red/30",
    warning: "bg-yellow/20 text-yellow border-yellow/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
};
