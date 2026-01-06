"use client";

import React from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/ui/custom/prompt/markdown";
import { useTheme } from "next-themes";

// Helper function to convert literal \n to actual newlines
const convertNewlines = (text: string | undefined) => {
  if (!text) return "";
  return text.replace(/\\n/g, "\n");
};

interface CodeEditorWidgetProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  isRunning?: boolean;
  readOnly?: boolean;
  height?: string;
  label?: string;
  description?: string;
  variant?: "card" | "full";
}

export function CodeEditorWidget({
  language,
  value,
  onChange,
  onRun,
  isRunning = false,
  readOnly = false,
  height = "400px",
  label,
  description,
  variant = "card"
}: CodeEditorWidgetProps) {
  const { theme } = useTheme();
  const isFull = variant === "full";

  return (
    <div className={cn("flex flex-col", isFull ? "h-full w-full" : "space-y-3")}>
      {(label || description) && !isFull && (
        <div className="space-y-1">
          {label && <label className="text-sm font-medium text-muted-foreground">{label}</label>}
          {description && (
            <div className="text-xs text-muted-foreground italic">
              <Markdown>{convertNewlines(description)}</Markdown>
            </div>
          )}
        </div>
      )}
      
      <div className={cn(
        "relative flex flex-col",
        theme === "light" ? "bg-zinc-50" : "bg-[#1e1e1e]",
        isFull ? "flex-1 w-full" : "border rounded-lg overflow-hidden"
      )}>
        <div className={cn(
          "flex items-center justify-between px-4 py-2 border-b",
          theme === "light" ? "border-border bg-zinc-100/50" : "border-white/5 bg-[#1e1e1e]"
        )}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground/40 uppercase ">
              {language}
            </span>
          </div>
          {onRun && (
            <Button 
              size="sm" 
              variant="ghost" 
              className={cn(
                "h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground",
                theme === "light" ? "hover:bg-zinc-200" : "hover:bg-white/5"
              )}
              onClick={onRun}
              disabled={isRunning}
            >
              {isRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current mr-1.5" />
              )}
              Run Tests
            </Button>
          )}
        </div>
        
        <div className="flex-1" style={{ height: isFull ? "100%" : height }}>
          <Editor
            height="100%"
            language={language}
            theme={theme === "light" ? "light" : "vs-dark"}
            value={value}
            onChange={(val) => onChange(val || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              roundedSelection: false,
              scrollBeyondLastLine: false,
              readOnly: readOnly,
              automaticLayout: true,
              padding: { top: 16, bottom: 16 },
              domReadOnly: readOnly,
            }}
          />
        </div>
      </div>
    </div>
  );
}

