import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "../lib/utils";

export interface DropdownOption {
  label: string;
  value: string;
}

export interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  disabled,
  label,
  placeholder = "Select an option...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const toggleDropdown = useCallback(() => {
    if (!disabled) setIsOpen((prev) => !prev);
  }, [disabled]);

  const handleOptionClick = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
    },
    [onChange],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className="flex flex-col gap-geist-quarter w-full relative"
      ref={dropdownRef}
    >
      {label && (
        <span className="text-[10px] font-medium text-[#9cb2d7]/70 uppercase tracking-wider">
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        className={cn(
          "flex items-center justify-between w-full h-8 px-3 bg-[#011626] border border-[#1d417c] rounded-md text-xs text-[#f1f2f3] transition-all duration-150 ease-in-out cursor-pointer hover:border-[#9cb2d7]",
          isOpen ? "border-[#9cb2d7] ring-1 ring-[#9cb2d7]/50" : "",
          disabled && "opacity-50 cursor-not-allowed",
          !selectedOption && "text-[#9cb2d7]/60",
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={cn(
            "w-4 h-4 transition-transform duration-200 ml-2",
            isOpen && "rotate-180",
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 w-full mb-2 bg-[#022540] border border-[#1d417c] rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-1">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
                className={cn(
                  "flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors text-left",
                  option.value === value
                    ? "bg-[#9cb2d7] text-[#011626] font-medium"
                    : "text-[#f1f2f3] hover:bg-white/10",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
