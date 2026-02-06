import { cn } from "@/lib/utils";
import React, { memo, useMemo } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { CodeBlock, CodeBlockCode } from "./code-block";
import { ReactFlowWidget, ReactFlowWidgetData } from "@/components/widgets/react-flow-widget";
import { ChartWidget, ChartWidgetData } from "@/components/widgets/chart-widget";
import { Chart3DWidget, Chart3DWidgetData } from "@/components/widgets/chart3d-widget";
import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export type MarkdownProps = {
  children: string;
  className?: string;
  components?: Partial<Components>;
};

const DEFAULT_COMPONENTS: Partial<Components> = {
  h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-3">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-semibold mt-2 mb-1">{children}</h4>,
  h5: ({ children }) => <h5 className="text-sm font-semibold mt-3 mb-2">{children}</h5>,
  h6: ({ children }) => <h6 className="text-sm font-semibold mt-3 mb-2">{children}</h6>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="list-disc list-inside my-3 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside my-3 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-7">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-muted-foreground/20 pl-4 italic my-4">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  hr: () => <hr className="my-6 border-border" />,
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="min-w-full border-collapse border border-border">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
  th: ({ children }) => (
    <th className="border border-border px-4 py-2 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-4 py-2">
      {children}
    </td>
  ),
  p: ({ children, node }) => {
    // Check if paragraph contains block-level elements
    const hasBlockChild = React.Children.toArray(children).some(
      (child) => {
        if (!React.isValidElement(child)) return false;
        
        // Check if it's a code element that's not inline (block code)
        if (child.type === 'code') {
          const className = (child.props as any).className || '';
          const childChildren = (child.props as any).children || '';
          const isInline = !className.includes('language-') && !String(childChildren).includes('\n');
          return !isInline;
        }
        
        // Check for common block-level component types
        const childType = child.type;
        if (typeof childType === 'function') {
          const displayName = (childType as any).displayName || childType.name || '';
          return displayName.includes('CodeBlock') || displayName.includes('Table');
        }
        // Check for HTML block elements
        return ['div', 'pre', 'table', 'blockquote', 'ul', 'ol', 'hr'].includes(String(childType));
      }
    );
    
    if (hasBlockChild) {
      return <div className="my-2">{children}</div>;
    }
    return <p className="mb-2 leading-7">{children}</p>;
  },
  code: ({ className, children, node, ...props }) => {
    // In react-markdown v9+, the 'inline' prop is removed.
    // We use heuristics to determine if it should be rendered inline or as a block.
    const match = /language-(\w+)/.exec(className || '');
    const isInline = !match && !String(children).includes('\n');

    if (isInline) {
      const content = String(children);
      // Check if this is actually a math expression (wrapped in $ signs)
      // These should be rendered as code but without the $ delimiters
      const isMath = content.startsWith('$') && content.endsWith('$') && content.length > 2;
      
      if (isMath) {
        // Strip the $ signs and render as code
        const mathContent = content.slice(1, -1);
        return (
          <code className={cn("bg-muted/60 text-foreground rounded px-1.5 py-0.5 font-mono border border-border/50", className)}>
            {mathContent}
          </code>
        );
      }
      
      return (
        <code className={cn("bg-muted/60 text-foreground rounded px-1.5 py-0.5 font-mono border border-border/50", className)}>
          {children}
        </code>
      );
    }

    // Detect language if not specified
    let language = match ? match[1] : null;
    const code = String(children ?? "").replace(/\n$/, "");
    
    // If no language specified, try to detect it from the code content
    if (!language) {
      const codeStr = code.toLowerCase();
      
      // Simple heuristics to detect common languages
      if (codeStr.includes('def ') || codeStr.includes('import ') && codeStr.includes('from ')) {
        language = "python";
      } else if (codeStr.includes('function ') || codeStr.includes('const ') || codeStr.includes('let ') || codeStr.includes('=>')) {
        language = "javascript";
      } else if (codeStr.includes('class ') && (codeStr.includes('public ') || codeStr.includes('private ') || codeStr.includes('static '))) {
        language = "java";
      } else if (codeStr.includes('#include') || codeStr.includes('std::')) {
        language = "cpp";
      } else if (codeStr.includes('package ') || codeStr.includes('func ')) {
        language = "go";
      } else {
        // Default to java as it's commonly used in educational content
        language = "java";
      }
    }

    // Return the CodeBlock directly without wrapper to avoid nesting issues
    return (
      <CodeBlock className={className}>
        <CodeBlockCode code={code} language={language} />
      </CodeBlock>
    );
  },
  pre: ({ children }) => <>{children}</>
};

function cleanJSONLikeString(jsonString: string) {
  let cleaned = jsonString.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  return cleaned
    .replace(/,\s*([\]}])/g, '$1')
    .replace(/\/\/.*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function sanitizeInvalidJsonEscapes(jsonString: string) {
  const validEscapeChars = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't']);
  let result = '';
  let inString = false;

  for (let i = 0; i < jsonString.length; i += 1) {
    const char = jsonString[i];

    if (char === '"' && (i === 0 || jsonString[i - 1] !== '\\')) {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString && char === '\\') {
      const next = jsonString[i + 1];

      if (!next) {
        result += '\\\\';
        continue;
      }

      if (next === 'u') {
        const hex = jsonString.slice(i + 2, i + 6);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          result += `\\u${hex}`;
          i += 5;
          continue;
        }

        // Invalid unicode escape (e.g. \underline) -> keep literal backslash.
        result += '\\\\';
        continue;
      }

      // For LaTeX-like commands such as \beta, \nabla, \frac, treat "\" as literal.
      const following = jsonString[i + 2] ?? '';
      const isCommandLike = /[A-Za-z]/.test(next) && /[A-Za-z]/.test(following);
      if (isCommandLike) {
        result += '\\\\';
        continue;
      }

      if (validEscapeChars.has(next)) {
        result += `\\${next}`;
        i += 1;
        continue;
      }

      // Invalid JSON escape (e.g. \m) -> keep literal backslash.
      result += '\\\\';
      continue;
    }

    result += char;
  }

  return result;
}

function robustParseJSON(jsonString: string) {
  const cleaned = cleanJSONLikeString(jsonString);
  const attempts = [cleaned, sanitizeInvalidJsonEscapes(cleaned), sanitizeInvalidJsonEscapes(jsonString)];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function MarkdownComponent({ children, className, components = DEFAULT_COMPONENTS }: MarkdownProps) {
  const mergedComponents = useMemo(
    () => ({
      ...DEFAULT_COMPONENTS,
      ...components
    }),
    [components]
  );

  // Pre-process content to extract Visual tags and replace with custom markers
  const { processedContent, visualComponents, chartComponents, chart3dComponents } = useMemo(() => {
    const visualTagPattern = /<Visual>([\s\S]*?)<\/Visual>/gi;
    const chartTagPattern = /<Chart>([\s\S]*?)<\/Chart>/gi;
    const chart3dTagPattern = /<Chart3D>([\s\S]*?)<\/Chart3D>/gi;
    const visuals: ReactFlowWidgetData[][] = [];
    const charts: ChartWidgetData[][] = [];
    const charts3d: Chart3DWidgetData[][] = [];
    // Ensure we always work with a string to avoid runtime errors
    const sourceText = typeof children === 'string' ? children : (children == null ? '' : String(children));
    
    // Fix common AI LaTeX typos
    // 1. Fix \cdotps -> \cdot\,\mathrm{ps} (common unit notation error)
    // 2. Fix \cdotp (invalid command) -> \cdot
    // 3. Fix \cdot followed by letter without space
    let processedText = sourceText
      .replace(/\\cdotps/g, '\\cdot\\,\\mathrm{ps}')  // Fix common unit typo
      .replace(/\\cdotp/g, '\\cdot')                    // Remove invalid 'p'
      .replace(/\\cdot([a-zA-Z])/g, '\\cdot\\,\\mathrm{$1}'); // Fix \cdot + letter

    // Process Visual tags
    let match;
    let offset = 0;

    // Reset the regex
    visualTagPattern.lastIndex = 0;
    
    while ((match = visualTagPattern.exec(processedText)) !== null) {
      try {
        const trimmedContent = match[1].trim();
        let visualData: ReactFlowWidgetData[];

        // Handle both array and single object formats
        if (trimmedContent.startsWith('[')) {
          visualData = robustParseJSON(trimmedContent);
        } else {
          visualData = [robustParseJSON(trimmedContent)];
        }

        visuals.push(visualData);
        
        // Replace the entire <Visual>...</Visual> with a unique marker
        const marker = `\n\n[REACTFLOW_VISUAL_${visuals.length - 1}]\n\n`;
        const startIdx = match.index - offset;
        const endIdx = startIdx + match[0].length;
        
        processedText = processedText.substring(0, startIdx) + marker + processedText.substring(endIdx);
        offset += match[0].length - marker.length;
        
      } catch (error) {
        console.error('Failed to parse Visual tag content:', error);
      }
    }

    // Process Chart tags
    chartTagPattern.lastIndex = 0;
    offset = 0;
    const tempText = processedText;
    
    while ((match = chartTagPattern.exec(tempText)) !== null) {
      try {
        const trimmedContent = match[1].trim();
        let chartData: ChartWidgetData[];

        // Handle both array and single object formats
        if (trimmedContent.startsWith('[')) {
          chartData = robustParseJSON(trimmedContent);
        } else {
          chartData = [robustParseJSON(trimmedContent)];
        }

        charts.push(chartData);
        
        // Replace the entire <Chart>...</Chart> with a unique marker
        const marker = `\n\n[D3_CHART_${charts.length - 1}]\n\n`;
        const startIdx = match.index - offset;
        const endIdx = startIdx + match[0].length;
        
        processedText = processedText.substring(0, startIdx) + marker + processedText.substring(endIdx);
        offset += match[0].length - marker.length;
        
      } catch (error) {
        console.error('Failed to parse Chart tag content:', error);
      }
    }

    // Process Chart3D tags
    chart3dTagPattern.lastIndex = 0;
    offset = 0;
    const tempText3d = processedText;
    
    while ((match = chart3dTagPattern.exec(tempText3d)) !== null) {
      try {
        const trimmedContent = match[1].trim();
        let chart3dData: Chart3DWidgetData[];

        // Handle both array and single object formats
        if (trimmedContent.startsWith('[')) {
          chart3dData = robustParseJSON(trimmedContent);
        } else {
          chart3dData = [robustParseJSON(trimmedContent)];
        }

        charts3d.push(chart3dData);
        
        // Replace the entire <Chart3D>...</Chart3D> with a unique marker
        const marker = `\n\n[3D_CHART_${charts3d.length - 1}]\n\n`;
        const startIdx = match.index - offset;
        const endIdx = startIdx + match[0].length;
        
        processedText = processedText.substring(0, startIdx) + marker + processedText.substring(endIdx);
        offset += match[0].length - marker.length;
        
      } catch (error) {
        console.error('Failed to parse Chart3D tag content:', error);
      }
    }

    return {
      processedContent: processedText,
      visualComponents: visuals,
      chartComponents: charts,
      chart3dComponents: charts3d,
    };
  }, [children]);

  // Pre-process content to convert code-like math expressions to code blocks
  // This prevents KaTeX from trying to parse programming operators like &&, ||
  // Only match clearly programming-specific operators, not mathematical ones
  const finalProcessedContent = useMemo(() => {
    const baseContent = typeof processedContent === 'string' ? processedContent : '';
    let processed = baseContent;
    const isLikelyParenthesizedMath = (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return false;

      const hasLatexCommand = /\\[a-zA-Z]+/.test(trimmed);
      const hasSubOrSup = /[_^]/.test(trimmed);
      const hasEquationOperator = /[=+*/^]|-(?=\d)/.test(trimmed);
      const hasDigit = /\d/.test(trimmed);

      // Remove LaTeX command names before counting natural-language words.
      const deLatex = trimmed.replace(/\\[a-zA-Z]+/g, " ");
      const plainText = deLatex
        .replace(/[$_^{}=+\-*/\\,.;:()[\]0-9]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const wordCount = plainText ? plainText.split(" ").length : 0;

      // Avoid wrapping prose-style parentheticals like "(e.g., give both ...)".
      if (wordCount >= 4) return false;
      if (hasLatexCommand) return true;
      if (hasSubOrSup) return true;
      if (hasEquationOperator && hasDigit) return true;
      return false;
    };
    
    // Convert [ math ] style display math to $$ math $$
    // This handles cases where AI uses square brackets for display math
    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (match, content) => {
      return `$$${content}$$`;
    });

    // Convert \( math \) style inline math to $ math $
    // Handle both double-escaped and single-escaped variants
    processed = processed
      .replace(/\\\\\(([\s\S]*?)\\\\\)/g, (match, content) => `$${content}$`)
      .replace(/\\\(([\s\S]*?)\\\)/g, (match, content) => `$${content}$`);

    // Pass 1: wrap simple parenthesized math with no nested parentheses.
    processed = processed.replace(
      /\(([^()\n]*?(?:_[A-Za-z{]|\\[a-zA-Z]+)[^()\n]*)\)/g,
      (match, content) => `$${content}$`
    );

    // Pass 2: wrap one-level nested parenthesized math, e.g. (\mathbf r(3)=...).
    // This catches expressions skipped by the no-nesting pass above.
    processed = processed.replace(
      /\(((?:[^()\n]+|\([^()\n]*\))+?)\)/g,
      (match, content) => (isLikelyParenthesizedMath(content) ? `$${content.trim()}$` : match)
    );
    
    // Also handle the case where square brackets are used without backslashes
    // Match [ followed by math content and closing ]
    // Only match if it contains math-like content (variables, operators, etc.)
    processed = processed.replace(/\[\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\s*[=+\-*/^_{}()\\]+\s*[a-zA-Z0-9_(){}\\]+)+[^[\]]*?)\s*\]/g, (match, content) => {
      // Check if this looks like math (has variables and operators)
      if (/[a-zA-Z_][a-zA-Z0-9_]*\s*[=+\-*/]/.test(content)) {
        return `$$${content}$$`;
      }
      return match;
    });
    
    // Match inline math expressions that contain programming-specific operators
    // Only match &&, ||, and !== (not != which could be factorial followed by =)
    // Avoid matching =, <, >, ! as these are common in math (equality, inequalities, factorial)
    const codeOperatorsPattern = /\$([^$\n]*?(?:&&|\|\||!==)[^$\n]*?)\$/g;
    
    processed = processed.replace(codeOperatorsPattern, (match, content) => {
      // Convert $code$ to `code` (backtick code block instead of math)
      return `\`$${content}$\``;
    });
    
    return processed;
  }, [processedContent]);

  // Custom component to replace visual markers
  const customComponents = useMemo(() => ({
    ...mergedComponents,
    p: ({ children, node }: any) => {
      // Check if this paragraph contains only a visual marker
      const childrenArray = React.Children.toArray(children);
      
      // Helper to check if text content matches marker pattern
      const isCompleteMarker = (text: string, pattern: RegExp) => {
        const trimmed = text.trim();
        return pattern.test(trimmed);
      };

      // Extract text content from children
      const textContent = childrenArray
        .map(child => {
          if (typeof child === 'string') return child;
          if (typeof child === 'number') return String(child);
          // Handle case where ReactMarkdown wraps text in other elements
          if (React.isValidElement(child) && child.props.children) {
             return React.Children.toArray(child.props.children).join('');
          }
          return '';
        })
        .join('');

      if (textContent) {
        const text = textContent.trim();
        
        // Check for ReactFlow visual marker
        const visualMatch = text.match(/^\[REACTFLOW_VISUAL_(\d+)\]$/);
        if (visualMatch) {
          const visualIndex = parseInt(visualMatch[1], 10);
          const visualData = visualComponents[visualIndex];
          
          if (visualData) {
            return (
              <div className="my-6 not-prose w-full h-[500px]">
                <ReactFlowWidget
                  visuals={visualData}
                  height="100%"
                  showNavigation={true}
                  showSidebar={false}
                  variant="card"
                />
              </div>
            );
          }
        }
        
        // Check for D3 Charts marker
        const chartMatch = text.match(/^\[D3_CHART_(\d+)\]$/);
        if (chartMatch) {
          const chartIndex = parseInt(chartMatch[1], 10);
          const chartData = chartComponents[chartIndex];
          
          if (chartData) {
            return (
              <div className="my-6 not-prose w-full h-[450px]">
                <ChartWidget
                  charts={chartData}
                  height="100%"
                  showNavigation={true}
                  showSidebar={false}
                  variant="card"
                />
              </div>
            );
          }
        }
        
        // Check for 3D Charts marker
        const chart3dMatch = text.match(/^\[3D_CHART_(\d+)\]$/);
        if (chart3dMatch) {
          const chart3dIndex = parseInt(chart3dMatch[1], 10);
          const chart3dData = chart3dComponents[chart3dIndex];
          
          if (chart3dData) {
            return (
              <div className="my-6 not-prose w-full h-[600px]">
                <Chart3DWidget
                  charts={chart3dData}
                  height="100%"
                  showNavigation={true}
                  showSidebar={false}
                  variant="card"
                />
              </div>
            );
          }
        }
      }

      // Default paragraph handling
      const defaultP = DEFAULT_COMPONENTS.p as any;
      if (defaultP) {
        return defaultP({ children, node });
      }
      
      return <p className="mb-2 leading-7">{children}</p>;
    },
  }), [mergedComponents, visualComponents, chartComponents, chart3dComponents]);

  return (
    <div className={cn("prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:overflow-x-auto break-words prose-code:before:content-none prose-code:after:content-none", className)}>
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm, 
          [remarkMath, { singleDollarTextMath: true }]
        ]}
        rehypePlugins={[rehypeKatex]}
        components={customComponents}>
        {finalProcessedContent}
      </ReactMarkdown>
    </div>
  );
}

type MarkdownRendererProps =
  | (ComponentRenderProps & { className?: string; components?: Partial<Components> })
  | MarkdownProps;

function MarkdownRenderer(props: MarkdownRendererProps) {
  if ((props as ComponentRenderProps).element) {
    const { element } = props as ComponentRenderProps;
    const content =
      (element.props?.content as string | undefined) ||
      (element.props?.children as string | undefined) ||
      "";
    const customClass = getCustomClass(element.props || {});
    const className = `${baseClass} ${customClass} ${(props as any).className || ""}`.trim();

    return (
      <MarkdownComponent
        className={className}
        components={(props as any).components || DEFAULT_COMPONENTS}
      >
        {content}
      </MarkdownComponent>
    );
  }

  const { children, className, components } = props as MarkdownProps;
  return (
    <MarkdownComponent className={className} components={components}>
      {children}
    </MarkdownComponent>
  );
}

const Markdown = memo(MarkdownRenderer);
Markdown.displayName = "Markdown";

export { Markdown };
