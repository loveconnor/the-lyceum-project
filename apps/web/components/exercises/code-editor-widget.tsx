"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, CheckCircle2 } from "lucide-react";
import Editor from "@monaco-editor/react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface CodeEditorWidgetProps {
  language?: string;
  initialCode?: string;
  isCompleted: boolean;
  onComplete: () => void;
  onAttempt: () => void;
}

export function CodeEditorWidget({
  language = "java",
  initialCode = "",
  isCompleted,
  onComplete,
  onAttempt,
}: CodeEditorWidgetProps) {
  const { theme } = useTheme();
  const [code, setCode] = useState(initialCode);
  const [hasRun, setHasRun] = useState(false);

  const handleRun = () => {
    onAttempt();
    setHasRun(true);
    
    // For now, just mark as complete when they run code
    // In the future, this could actually execute and test the code
    if (code.trim().length > 50) { // Basic check that they wrote something substantial
      setTimeout(() => {
        onComplete();
      }, 500);
    }
  };

  return (
    <Card className="border-2">
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {language}
            </Badge>
            <span className="text-sm text-muted-foreground">Your Work</span>
          </div>
          <Button
            onClick={handleRun}
            disabled={isCompleted}
            size="sm"
            className={cn(
              "gap-2",
              isCompleted && "bg-green-600 hover:bg-green-600"
            )}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Code
              </>
            )}
          </Button>
        </div>
        
        <div className="relative">
          <Editor
            height="400px"
            language={language}
            value={code}
            onChange={(value) => setCode(value || "")}
            theme={theme === "light" ? "light" : "vs-dark"}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              readOnly: isCompleted,
            }}
          />
        </div>

        {hasRun && !isCompleted && code.trim().length <= 50 && (
          <div className="px-4 py-3 bg-muted/50 border-t">
            <p className="text-sm text-muted-foreground">
              Write a more complete solution and run again.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
