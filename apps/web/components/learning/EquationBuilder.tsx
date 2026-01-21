"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Copy, Check, Undo2, AlertCircle } from "lucide-react";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

const MathPreview = ({ latex }: { latex: string }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if ((window as unknown as { katex?: unknown }).katex) {
      setIsLoaded(true);
      return;
    }

    const link = document.createElement("link");
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js";
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const katex = (window as unknown as { katex?: { render: Function } }).katex;
    if (isLoaded && containerRef.current && katex) {
      try {
        katex.render(
          latex || "\\text{\\small Start typing...}",
          containerRef.current,
          {
            throwOnError: false,
            displayMode: true,
          },
        );
      } catch (e) {
        console.error("KaTeX render error", e);
      }
    }
  }, [latex, isLoaded]);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground pl-1">
        Preview
      </span>
      <div className="min-h-[4rem] flex items-center justify-center bg-background border border-border rounded-md overflow-x-auto p-4">
        <div ref={containerRef} className="text-foreground" />
        {!isLoaded && (
          <span className="text-xs text-muted-foreground">
            Loading renderer...
          </span>
        )}
      </div>
    </div>
  );
};

const TOKEN_TYPES = {
  OPERATOR: "operator",
  OPERAND: "operand",
  OPEN_PAREN: "open_paren",
  CLOSE_PAREN: "close_paren",
  FUNCTION: "function",
  RELATION: "relation",
};

const getTokenType = (token: string) => {
  if (["+", "-", "*", "/", "^", "\\cdot"].includes(token))
    return TOKEN_TYPES.OPERATOR;
  if (["=", "<", ">", "\\le", "\\ge"].includes(token))
    return TOKEN_TYPES.RELATION;
  if (token === "(") return TOKEN_TYPES.OPEN_PAREN;
  if (token === ")") return TOKEN_TYPES.CLOSE_PAREN;
  if (["\\sin", "\\cos", "\\tan", "\\log"].includes(token))
    return TOKEN_TYPES.FUNCTION;
  return TOKEN_TYPES.OPERAND;
};

const canPlaceToken = (lastToken: string | undefined, newToken: string) => {
  const newType = getTokenType(newToken);

  if (!lastToken) {
    return (
      [
        TOKEN_TYPES.OPERAND,
        TOKEN_TYPES.OPEN_PAREN,
        TOKEN_TYPES.FUNCTION,
      ].includes(newType) || newToken === "-"
    );
  }

  const lastType = getTokenType(lastToken);

  switch (lastType) {
    case TOKEN_TYPES.OPERAND:
    case TOKEN_TYPES.CLOSE_PAREN:
      return [
        TOKEN_TYPES.OPERATOR,
        TOKEN_TYPES.RELATION,
        TOKEN_TYPES.CLOSE_PAREN,
      ].includes(newType);
    case TOKEN_TYPES.OPERATOR:
    case TOKEN_TYPES.RELATION:
    case TOKEN_TYPES.OPEN_PAREN:
      return [
        TOKEN_TYPES.OPERAND,
        TOKEN_TYPES.OPEN_PAREN,
        TOKEN_TYPES.FUNCTION,
      ].includes(newType);
    case TOKEN_TYPES.FUNCTION:
      return [TOKEN_TYPES.OPEN_PAREN, TOKEN_TYPES.OPERAND].includes(newType);
    default:
      return true;
  }
};

type EquationBuilderProps = {
  tokens?: string[] | null;
  slots?: number | null;
  instructions?: string | null;
  showPreview?: boolean;
  allowCopy?: boolean;
  className?: string[];
};

export function EquationBuilder({ element }: ComponentRenderProps) {
  const props = element.props as EquationBuilderProps;
  const customClass = getCustomClass(props);
  const tokens = Array.isArray(props.tokens) ? props.tokens : [];
  const slots = typeof props.slots === "number" ? props.slots : 8;
  const instructions =
    props.instructions ??
    "Select tokens to build an equation. Click a token to remove it.";
  const showPreview = props.showPreview ?? true;
  const allowCopy = props.allowCopy ?? true;

  const [equation, setEquation] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filledSlots = equation.length;
  const isFull = filledSlots >= slots;
  const lastToken = equation[equation.length - 1];

  const handleAddToken = (token: string) => {
    if (isFull) {
      triggerError("Max length reached");
      return;
    }

    if (!canPlaceToken(lastToken, token)) {
      triggerError("Invalid placement");
      return;
    }

    setEquation((prev) => [...prev, token]);
    setError(null);
  };

  const handleRemoveToken = (index: number) => {
    setEquation((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const handleClear = () => {
    setEquation([]);
    setError(null);
  };

  const handleUndo = () => {
    setEquation((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleCopy = () => {
    const latex = equation.join(" ");
    const textArea = document.createElement("textarea");
    textArea.value = latex;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        triggerError("Copy failed");
      }
    } catch (err) {
      console.error("Copy error", err);
      triggerError("Copy error");
    }

    document.body.removeChild(textArea);
  };

  const triggerError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 1500);
  };

  const slotsUI = useMemo(() => {
    const ui = [];
    for (let i = 0; i < slots; i++) {
      const token = equation[i];
      const isFilled = i < filledSlots;
      const isActive = i === filledSlots;

      ui.push(
        <div
          key={i}
          onClick={() => isFilled && handleRemoveToken(i)}
          className={`relative flex items-center justify-center w-8 h-10 rounded text-sm transition-all duration-150 select-none ${
            isFilled
              ? "bg-muted text-foreground border border-border cursor-pointer hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600"
              : isActive
                ? "bg-background border-2 border-foreground shadow-sm z-10"
                : "bg-muted/40 border border-border"
          }`}
        >
          {isFilled ? (
            <span className="font-semibold font-mono">
              {token ? (token === "*" ? "×" : token.replace("\\", "")) : ""}
            </span>
          ) : isActive ? (
            <div className="w-1 h-3 bg-foreground animate-pulse" />
          ) : (
            <span className="text-[9px] font-medium text-muted-foreground">
              {i + 1}
            </span>
          )}
        </div>,
      );
    }
    return ui;
  }, [equation, slots, filledSlots]);

  return (
    <div className={`${baseClass} ${customClass} w-full max-w-2xl mx-auto`}>
      <div className="flex items-center justify-between gap-3 mb-4 w-full">
        <div className="text-xs text-muted-foreground">{instructions}</div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={equation.length === 0}
            className="h-7 px-2 text-muted-foreground rounded border border-border hover:text-foreground transition-colors disabled:opacity-50"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={equation.length === 0}
            className="h-7 px-2 text-muted-foreground rounded border border-border hover:text-rose-600 hover:border-rose-200 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {allowCopy ? (
            <button
              type="button"
              onClick={handleCopy}
              className="h-7 px-2 rounded border border-border text-xs font-medium text-foreground hover:bg-muted/30 transition-colors"
            >
              <span className="inline-flex items-center gap-1">
                {copied ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copied ? "Copied" : "Copy LaTeX"}
              </span>
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mb-3 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      ) : null}

      <div className="border border-border rounded-md overflow-hidden">
        <div className="bg-muted/30 border-b border-border p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Construction Sequence
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {filledSlots}/{slots}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 min-h-[3rem]">{slotsUI}</div>
        </div>

        <div className="p-4 space-y-4">
          {showPreview ? <MathPreview latex={equation.join(" ")} /> : null}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4 space-y-2">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Values
              </h4>
              <div className="grid grid-cols-4 gap-1.5">
                {tokens
                  .filter((t) => getTokenType(t) === TOKEN_TYPES.OPERAND)
                  .map((token) => {
                    const allowed = canPlaceToken(lastToken, token);
                    return (
                      <button
                        key={token}
                        className={`h-8 rounded text-xs font-medium transition-colors duration-150 border flex items-center justify-center ${
                          allowed
                            ? "bg-background border-border text-foreground hover:bg-muted/30"
                            : "bg-muted/30 border-transparent text-muted-foreground/50 cursor-not-allowed"
                        }`}
                        onClick={() => handleAddToken(token)}
                        disabled={!allowed || isFull}
                      >
                        {token}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="md:col-span-5 space-y-2">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Operators
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {tokens
                  .filter((t) =>
                    ["+", "-", "*", "/", "^", "\\cdot"].includes(t),
                  )
                  .map((token) => {
                    const allowed = canPlaceToken(lastToken, token);
                    return (
                      <button
                        key={token}
                        className={`h-8 w-8 rounded text-sm font-medium transition-colors flex items-center justify-center ${
                          allowed
                            ? "bg-muted text-foreground hover:bg-muted/60"
                            : "bg-background text-muted-foreground/50 cursor-not-allowed"
                        }`}
                        onClick={() => handleAddToken(token)}
                        disabled={!allowed || isFull}
                      >
                        {token === "*" ? "×" : token === "\\cdot" ? "·" : token}
                      </button>
                    );
                  })}
              </div>

              <div className="grid grid-cols-3 gap-1.5 mt-2">
                {tokens
                  .filter((t) => getTokenType(t) === TOKEN_TYPES.FUNCTION)
                  .map((token) => {
                    const allowed = canPlaceToken(lastToken, token);
                    return (
                      <button
                        key={token}
                        className={`h-7 rounded text-[11px] font-serif italic border flex items-center justify-center ${
                          allowed
                            ? "bg-background border-border text-muted-foreground hover:text-foreground"
                            : "bg-transparent border-transparent text-muted-foreground/50 cursor-not-allowed"
                        }`}
                        onClick={() => handleAddToken(token)}
                        disabled={!allowed || isFull}
                      >
                        {token.replace("\\", "")}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="md:col-span-3 space-y-2">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Logic
              </h4>
              <div className="grid grid-cols-2 gap-1.5">
                {tokens
                  .filter((t) => ["(", ")", "=", "<", ">"].includes(t))
                  .map((token) => {
                    const allowed = canPlaceToken(lastToken, token);
                    return (
                      <button
                        key={token}
                        className={`h-8 rounded text-xs font-mono transition-colors flex items-center justify-center ${
                          allowed
                            ? "bg-foreground text-background hover:opacity-90"
                            : "bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
                        }`}
                        onClick={() => handleAddToken(token)}
                        disabled={!allowed || isFull}
                      >
                        {token}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
