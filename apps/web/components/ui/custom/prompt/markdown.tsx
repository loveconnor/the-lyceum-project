import { cn } from "@/lib/utils";
import React, { memo, useMemo } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { CodeBlock, CodeBlockCode } from "./code-block";

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

  return (
    <div className={cn("prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:overflow-x-auto break-words prose-code:before:content-none prose-code:after:content-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={mergedComponents}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

const Markdown = memo(MarkdownComponent);
Markdown.displayName = "Markdown";

export { Markdown };
