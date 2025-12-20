"use client";

import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/ui/custom/prompt/markdown";

// Helper to wrap math notation in LaTeX delimiters
const wrapMath = (text: string): string => {
  if (!text) return text;
  // Wrap any $...$ pattern that isn't already wrapped
  return text.replace(/\$([^$]+)\$/g, (match, inner) => {
    // Already properly formatted
    if (match.startsWith('$') && match.endsWith('$')) {
      return match;
    }
    return `$${inner}$`;
  });
};

// Convert plain English math terms to LaTeX
const convertMathText = (text: string): string => {
  if (!text) return text;
  
  let converted = text;
  
  // Definite integrals: "integral from a to b" → "\int_a^b"
  converted = converted.replace(/integral\s+from\s+([^\s]+)\s+to\s+([^\s]+)/gi, '\\int_{$1}^{$2}');
  
  // Indefinite integral: "integral" → "\int"
  converted = converted.replace(/\bintegral\b/gi, '\\int');
  
  // Sum with bounds: "sum from i=1 to n" → "\sum_{i=1}^{n}"
  converted = converted.replace(/sum\s+from\s+([^\s]+)\s+to\s+([^\s]+)/gi, '\\sum_{$1}^{$2}');
  
  // Sum: "sum" → "\sum"
  converted = converted.replace(/\bsum\b/gi, '\\sum');
  
  // Product with bounds: "product from i=1 to n" → "\prod_{i=1}^{n}"
  converted = converted.replace(/product\s+from\s+([^\s]+)\s+to\s+([^\s]+)/gi, '\\prod_{$1}^{$2}');
  
  // Product: "product" → "\prod"
  converted = converted.replace(/\bproduct\b/gi, '\\prod');
  
  // Limit: "limit as x approaches a" → "\lim_{x \to a}"
  converted = converted.replace(/limit\s+as\s+([^\s]+)\s+approaches\s+([^\s]+)/gi, '\\lim_{$1 \\to $2}');
  
  // Square root: "sqrt(x)" → "\sqrt{x}"
  converted = converted.replace(/sqrt\s*\(([^)]+)\)/gi, '\\sqrt{$1}');
  
  // Derivative: "d/dx" → "\frac{d}{dx}"
  converted = converted.replace(/d\/d([a-zA-Z])/g, '\\frac{d}{d$1}');
  
  // Partial derivative: "partial/partial x" → "\frac{\partial}{\partial x}"
  converted = converted.replace(/partial\s*\/\s*partial\s+([a-zA-Z])/gi, '\\frac{\\partial}{\\partial $1}');
  
  // Infinity: "infinity" → "\infty"
  converted = converted.replace(/\binfinity\b/gi, '\\infty');
  
  return converted;
};

interface TextInputWidgetProps {
  label: string;
  description?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  minHeight?: string;
  showPreview?: boolean;
  previewWithMath?: (text: string) => string;
  mathMode?: boolean; // When true, renders each line as separate math expression
}

export function TextInputWidget({
  label,
  description,
  placeholder,
  value,
  onChange,
  minHeight = "200px",
  showPreview = true,
  previewWithMath,
  mathMode = false
}: TextInputWidgetProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      {description && (
        <div className="text-xs text-muted-foreground italic">
          <Markdown>{wrapMath(description)}</Markdown>
        </div>
      )}
      <Textarea 
        placeholder={placeholder}
        className="text-sm font-mono"
        style={{ minHeight }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {showPreview && value && (
        <div className="p-4 bg-muted/30 rounded-lg border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Preview:</p>
          <div className="prose prose-sm max-w-none">
            <Markdown>
              {mathMode && value.includes('\n')
                ? value.split('\n').map(line => line.trim() ? `$${convertMathText(line)}$` : '').filter(Boolean).join('  \n')
                : mathMode 
                  ? `$${convertMathText(value)}$`
                  : previewWithMath 
                    ? previewWithMath(convertMathText(value))
                    : `$${convertMathText(value)}$`
              }
            </Markdown>
          </div>
        </div>
      )}
    </div>
  );
}
