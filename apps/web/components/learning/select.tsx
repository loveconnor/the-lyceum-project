"use client";

import type { ComponentRenderProps } from "./types";
import {
  baseClass,
  getCustomClass,
  getOpenSelect,
  setOpenSelectValue,
  getSelectValue,
  setSelectValueForKey,
} from "./utils";

export function Select({ element }: ComponentRenderProps) {
  const { props, key } = element;
  const customClass = getCustomClass(props);
  const options = (props.options as string[]) || [];
  const selectedValue = getSelectValue(key);
  const isOpen = getOpenSelect() === key;

  return (
    <div className={`relative ${baseClass} ${customClass}`}>
      {props.label ? (
        <label className="text-[10px] text-muted-foreground block mb-0.5 text-left">
          {props.label as string}
        </label>
      ) : null}
      <div
        onClick={() => setOpenSelectValue(isOpen ? null : key)}
        className="h-7 w-full bg-background border border-border rounded px-2 text-xs flex items-center justify-between cursor-pointer hover:border-foreground/30 transition-colors"
      >
        <span
          className={
            selectedValue ? "text-foreground" : "text-muted-foreground/50"
          }
        >
          {selectedValue || (props.placeholder as string) || "Select..."}
        </span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
      </div>
      {isOpen && options.length > 0 && (
        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-background border border-border rounded shadow-lg overflow-hidden">
          {options.map((opt, i) => (
            <div
              key={i}
              onClick={() => {
                setSelectValueForKey(key, opt);
                setOpenSelectValue(null);
              }}
              className={`px-2 py-1.5 text-xs text-left cursor-pointer hover:bg-muted transition-colors ${selectedValue === opt ? "bg-muted" : ""}`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
