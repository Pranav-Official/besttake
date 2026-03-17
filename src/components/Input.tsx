import React, { useCallback } from "react";
import { cn } from "../lib/utils";

export interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  text: string;
  setText: React.Dispatch<React.SetStateAction<string>>;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  text,
  setText,
  disabled,
  error,
  className,
  type = "text",
  placeholder = "Type something...",
  ...props
}) => {
  const onChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setText(e.currentTarget.value);
    },
    [setText],
  );

  return (
    <div className="w-full flex flex-col gap-geist-quarter">
      <input
        {...props}
        type={type}
        autoComplete="off"
        placeholder={placeholder}
        className={cn(
          "leading-[1.7] block w-full rounded-geist bg-background py-geist-half px-geist text-foreground text-sm border transition-colors duration-150 ease-in-out outline-none",
          error
            ? "border-red focus:border-red"
            : "border-unfocused-border focus:border-primary",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className,
        )}
        disabled={disabled}
        value={text}
        onChange={onChange}
      />
      {error && <span className="text-xs text-red mt-1">{error}</span>}
    </div>
  );
};
