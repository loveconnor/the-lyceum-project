import { cn } from "@/lib/utils";
import React, { memo, useMemo } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { CodeBlock, CodeBlockCode } from "./code-block";

export type MarkdownProps = {
  children: string;
  className?: string;
  components?: Partial<Components>;
};

function extractLanguage(className?: string): string {
  if (!className) return "plaintext";
  const match = className.match(/language-(\w+)/);
  return match ? match[1] : "plaintext";
}

const DEFAULT_COMPONENTS: Partial<Components> = {
  p: ({ children }) => {
    const hasBlockChild = React.Children.toArray(children).some(
      (child) =>
        React.isValidElement(child) &&
        (child.type === "div" || child.type === "pre" || child.type === CodeBlock)
    );
    if (hasBlockChild) {
      return <div className="space-y-2">{children}</div>;
    }
    return <p className="mb-2 leading-7">{children}</p>;
  },
  code: ({ className, inline, children }) => {
    if (inline) {
      return (
        <code className={cn("bg-muted rounded-sm px-1 font-mono text-sm", className)}>
          {children}
        </code>
      );
    }

    const language = extractLanguage(className);
    const code = String(children ?? "").replace(/\n$/, "");

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
    <div className={cn("prose prose-neutral max-w-none", className)}>
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
