"use client";

import React from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const isFull = variant === "full";

  return (
    <div className={cn("flex flex-col", isFull ? "h-full w-full" : "space-y-3")}>
      {(label || description) && !isFull && (
        <div className="space-y-1">
          {label && <label className="text-sm font-medium text-muted-foreground">{label}</label>}
          {description && <p className="text-xs text-muted-foreground italic">{description}</p>}
        </div>
      )}
      
      <div className={cn(
        "relative bg-[#1e1e1e] flex flex-col",
        isFull ? "flex-1 w-full" : "border rounded-lg overflow-hidden"
      )}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#1e1e1e]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground/40 uppercase tracking-wider">
              {language}
            </span>
          </div>
          {onRun && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/5"
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
            theme="vs-dark"
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

