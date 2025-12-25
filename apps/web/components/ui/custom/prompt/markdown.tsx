import { cn } from "@/lib/utils";
import React, { memo, useMemo } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { CodeBlock, CodeBlockCode } from "./code-block";
import { ReactFlowWidget, ReactFlowWidgetData } from "@/components/labs/widgets/react-flow-widget";

export type MarkdownProps = {
  children: string;
  className?: string;
  components?: Partial<Components>;
};

const DEFAULT_COMPONENTS: Partial<Components> = {
  h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
  h4: ({ children }) => <h4 className="text-base font-semibold mt-3 mb-2">{children}</h4>,
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

    const language = match ? match[1] : "plaintext";
    const code = String(children ?? "").replace(/\n$/, "");

    // Return the CodeBlock directly without wrapper to avoid nesting issues
    return (
      <CodeBlock className={className}>
        <CodeBlockCode code={code} language={language} />
      </CodeBlock>
    );
  },
  pre: ({ children }) => <>{children}</>
};

function MarkdownComponent({ children, className, components = DEFAULT_COMPONENTS }: MarkdownProps) {
  const mergedComponents = useMemo(
    () => ({
      ...DEFAULT_COMPONENTS,
      ...components
    }),
    [components]
  );

  // Pre-process content to extract Visual tags and replace with custom markers
  const { processedContent, visualComponents } = useMemo(() => {
    const visualTagPattern = /<Visual>([\s\S]*?)<\/Visual>/gi;
    const visuals: ReactFlowWidgetData[][] = [];
    let processedText = children;
    let match;
    let offset = 0;

    // Reset the regex
    visualTagPattern.lastIndex = 0;
    
    while ((match = visualTagPattern.exec(children)) !== null) {
      try {
        const trimmedContent = match[1].trim();
        let visualData: ReactFlowWidgetData[];

        // Handle both array and single object formats
        if (trimmedContent.startsWith('[')) {
          visualData = JSON.parse(trimmedContent);
        } else {
          visualData = [JSON.parse(trimmedContent)];
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

    return {
      processedContent: processedText,
      visualComponents: visuals,
    };
  }, [children]);

  // Pre-process content to convert code-like math expressions to code blocks
  // This prevents KaTeX from trying to parse programming operators like &&, ||
  // Only match clearly programming-specific operators, not mathematical ones
  const finalProcessedContent = useMemo(() => {
    let processed = processedContent;
    
    // Convert [ math ] style display math to $$ math $$
    // This handles cases where AI uses square brackets for display math
    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (match, content) => {
      return `$$${content}$$`;
    });
    
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
      
      if (childrenArray.length === 1 && typeof childrenArray[0] === 'string') {
        const text = childrenArray[0].trim();
        const match = text.match(/^\[REACTFLOW_VISUAL_(\d+)\]$/);
        
        if (match) {
          const visualIndex = parseInt(match[1], 10);
          const visualData = visualComponents[visualIndex];
          
          if (visualData) {
            return (
              <div className="my-6 not-prose w-full">
                <ReactFlowWidget
                  visuals={visualData}
                  height="500px"
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
  }), [mergedComponents, visualComponents]);

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

const Markdown = memo(MarkdownComponent);
Markdown.displayName = "Markdown";

export { Markdown };
