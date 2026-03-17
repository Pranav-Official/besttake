import React, { forwardRef } from "react";
import { cn } from "../lib/utils";
import { Spinner } from "./Spinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  loading?: boolean;
  variant?: "primary" | "secondary" | "accent" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

const ButtonForward: React.ForwardRefRenderFunction<
  HTMLButtonElement,
  ButtonProps
> = (
  {
    children,
    loading,
    variant = "primary",
    size = "md",
    className,
    disabled,
    onClick,
    ...props
  },
  ref,
) => {
  const variantStyles = {
    primary:
      "bg-primary text-background border-primary hover:bg-background hover:text-primary",
    secondary:
      "bg-secondary text-foreground border-secondary hover:bg-background hover:text-secondary",
    accent:
      "bg-accent text-background border-accent hover:bg-background hover:text-accent",
    danger:
      "bg-red text-foreground border-red hover:bg-background hover:text-red",
    ghost: "bg-transparent text-foreground border-transparent hover:bg-white/5",
  };

  const sizeStyles = {
    sm: "px-geist-half h-8 text-xs",
    md: "px-geist h-10 text-sm",
    lg: "px-10 h-12 text-base",
  };

  return (
    <button
      ref={ref}
      className={cn(
        "border rounded-geist font-medium transition-all duration-150 ease-in-out inline-flex items-center justify-center appearance-none cursor-pointer",
        "disabled:bg-button-disabled disabled:text-disabled-text disabled:border-unfocused-border disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="mr-geist-quarter">
          <Spinner size={16} />
        </span>
      )}
      {children}
    </button>
  );
};

export const Button = forwardRef(ButtonForward);
