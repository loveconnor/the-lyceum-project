'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { memo, useMemo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import slugify from '@sindresorhus/slugify'

import { CodeBlock, CodeBlockCode } from '@/components/ui/custom/prompt/code-block'
import { cn } from '@/lib/utils'

export type MarkdownProps = {
  children: string
  className?: string
  components?: Partial<Components>
}

function getTextFromChildren(children: React.ReactNode): string {
  return React.Children.toArray(children)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return String(child)
      }
      if (React.isValidElement(child)) {
        return getTextFromChildren((child as React.ReactElement<{ children?: React.ReactNode }>).props.children)
      }
      return ''
    })
    .join('')
}

function MarkdownComponent({ children, className, components = {} }: MarkdownProps) {
  const mergedComponents = useMemo(() => {
    const heading = (tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6', cls: string) => {
      return ({
        children,
        id,
        className,
      }: {
        children?: React.ReactNode
        id?: string
        className?: string
      }) => {
        const title = getTextFromChildren(children)
        const headingId = id ?? slugify(title || tag)
        return React.createElement(tag, { id: headingId, className: cn(cls, className) }, children)
      }
    }

    const defaults: Partial<Components> = {
      h1: heading('h1', 'mt-4 mb-3 text-lg font-bold'),
      h2: heading('h2', 'mt-3 mb-2 text-base font-bold'),
      h3: heading('h3', 'mt-2 mb-1 text-sm font-bold'),
      h4: heading('h4', 'mt-2 mb-1 text-sm font-semibold'),
      h5: heading('h5', 'mt-3 mb-2 text-sm font-semibold'),
      h6: heading('h6', 'mt-3 mb-2 text-sm font-semibold'),
      strong: ({ children }) => <strong className="font-bold">{children}</strong>,
      em: ({ children }) => <em className="italic">{children}</em>,
      ul: ({ children }) => <ul className="my-3 list-inside list-disc space-y-1">{children}</ul>,
      ol: ({ children }) => <ol className="my-3 list-inside list-decimal space-y-1">{children}</ol>,
      li: ({ children }) => <li className="leading-7">{children}</li>,
      blockquote: ({ children }) => (
        <blockquote className="my-4 border-l-4 border-muted-foreground/20 pl-4 italic">{children}</blockquote>
      ),
      a: ({ href, children }) => (
        <a
          href={href}
          className="text-primary underline hover:text-primary/80"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      ),
      hr: () => <hr className="my-6 border-border" />,
      table: ({ children }) => (
        <div className="my-4 overflow-x-auto">
          <table className="min-w-full border-collapse border border-border">{children}</table>
        </div>
      ),
      thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
      tbody: ({ children }) => <tbody>{children}</tbody>,
      tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
      th: ({ children }) => <th className="border border-border px-4 py-2 text-left font-semibold">{children}</th>,
      td: ({ children }) => <td className="border border-border px-4 py-2">{children}</td>,
      p: ({ children }) => {
        const hasBlockChild = React.Children.toArray(children).some((child) => {
          if (!React.isValidElement(child)) return false

          if (child.type === 'code') {
            const childClassName = (child.props as any).className || ''
            const childChildren = (child.props as any).children || ''
            const isInline = !childClassName.includes('language-') && !String(childChildren).includes('\n')
            return !isInline
          }

          const childType = child.type
          if (typeof childType === 'function') {
            const displayName = (childType as any).displayName || childType.name || ''
            return displayName.includes('CodeBlock') || displayName.includes('Table')
          }
          return ['div', 'pre', 'table', 'blockquote', 'ul', 'ol', 'hr'].includes(String(childType))
        })

        if (hasBlockChild) {
          return <div className="my-2">{children}</div>
        }

        return <p className="mb-2 leading-7">{children}</p>
      },
      code: ({ className, children }) => {
        const match = /language-(\w+)/.exec(className || '')
        const isInline = !match && !String(children).includes('\n')

        if (isInline) {
          const content = String(children)
          const isMath = content.startsWith('$') && content.endsWith('$') && content.length > 2

          if (isMath) {
            return (
              <code
                className={cn(
                  'rounded border border-border/50 bg-muted/60 px-1.5 py-0.5 font-mono text-foreground',
                  className,
                )}
              >
                {content.slice(1, -1)}
              </code>
            )
          }

          return (
            <code
              className={cn(
                'rounded border border-border/50 bg-muted/60 px-1.5 py-0.5 font-mono text-foreground',
                className,
              )}
            >
              {children}
            </code>
          )
        }

        let language = match ? match[1] : null
        const code = String(children ?? '').replace(/\n$/, '')

        if (!language) {
          const codeStr = code.toLowerCase()
          if (codeStr.includes('def ') || (codeStr.includes('import ') && codeStr.includes('from '))) {
            language = 'python'
          } else if (
            codeStr.includes('function ') ||
            codeStr.includes('const ') ||
            codeStr.includes('let ') ||
            codeStr.includes('=>')
          ) {
            language = 'javascript'
          } else if (
            codeStr.includes('class ') &&
            (codeStr.includes('public ') || codeStr.includes('private ') || codeStr.includes('static '))
          ) {
            language = 'java'
          } else if (codeStr.includes('#include') || codeStr.includes('std::')) {
            language = 'cpp'
          } else if (codeStr.includes('package ') || codeStr.includes('func ')) {
            language = 'go'
          } else {
            language = 'java'
          }
        }

        return (
          <CodeBlock className={className}>
            <CodeBlockCode code={code} language={language} />
          </CodeBlock>
        )
      },
      pre: ({ children }) => <>{children}</>,
    }

    return {
      ...defaults,
      ...components,
    }
  }, [components])

  const finalProcessedContent = useMemo(() => {
    const sourceText = typeof children === 'string' ? children : children == null ? '' : String(children)
    let processed = sourceText
      .replace(/^'''/gm, '```')
      .replace(/'''$/gm, '```')
      .replace(/\n'''/g, '\n```')
      .replace(/\\cdotps/g, '\\cdot\\,\\mathrm{ps}')
      .replace(/\\cdotp/g, '\\cdot')
      .replace(/\\cdot([a-zA-Z])/g, '\\cdot\\,\\mathrm{$1}')

    const isLikelyParenthesizedMath = (content: string) => {
      const trimmed = content.trim()
      if (!trimmed) return false

      const hasLatexCommand = /\\[a-zA-Z]+/.test(trimmed)
      const hasSubOrSup = /[_^]/.test(trimmed)
      const hasEquationOperator = /[=+*/^]|-(?=\d)/.test(trimmed)
      const hasDigit = /\d/.test(trimmed)

      const deLatex = trimmed.replace(/\\[a-zA-Z]+/g, ' ')
      const plainText = deLatex
        .replace(/[$_^{}=+\-*/\\,.;:()[\]0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      const wordCount = plainText ? plainText.split(' ').length : 0

      if (wordCount >= 4) return false
      if (hasLatexCommand) return true
      if (hasSubOrSup) return true
      if (hasEquationOperator && hasDigit) return true
      return false
    }

    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_match, content) => `$$${content}$$`)
    processed = processed
      .replace(/\\\\\(([\s\S]*?)\\\\\)/g, (_match, content) => `$${content}$`)
      .replace(/\\\(([\s\S]*?)\\\)/g, (_match, content) => `$${content}$`)
    processed = processed.replace(/\(([^()\n]*?(?:_[A-Za-z{]|\\[a-zA-Z]+)[^()\n]*)\)/g, (_m, content) => `$${content}$`)
    processed = processed.replace(
      /\(((?:[^()\n]+|\([^()\n]*\))+?)\)/g,
      (match, content) => (isLikelyParenthesizedMath(content) ? `$${content.trim()}$` : match),
    )
    processed = processed.replace(
      /\[\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\s*[=+\-*/^_{}()\\]+\s*[a-zA-Z0-9_(){}\\]+)+[^[\]]*?)\s*\]/g,
      (match, content) => (/[a-zA-Z_][a-zA-Z0-9_]*\s*[=+\-*/]/.test(content) ? `$$${content}$$` : match),
    )

    const codeOperatorsPattern = /\$([^$\n]*?(?:&&|\|\||!==)[^$\n]*?)\$/g
    processed = processed.replace(codeOperatorsPattern, (_match, content) => `\`$${content}$\``)

    return processed
  }, [children])

  return (
    <div
      className={cn(
        'prose prose-neutral max-w-none break-words prose-headings:font-semibold prose-p:leading-relaxed prose-pre:overflow-x-auto prose-pre:border prose-pre:bg-muted prose-code:before:content-none prose-code:after:content-none dark:prose-invert',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
        rehypePlugins={[rehypeKatex]}
        components={mergedComponents}
      >
        {finalProcessedContent}
      </ReactMarkdown>
    </div>
  )
}

const Markdown = memo(MarkdownComponent)
Markdown.displayName = 'Markdown'

export { Markdown }
