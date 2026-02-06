'use client'

import React from 'react'
import { codeToHtml } from 'shiki'
import { useTheme } from 'next-themes'

import { cn } from '@/lib/utils'

export type CodeBlockProps = {
  children?: React.ReactNode
  className?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  return (
    <div
      className={cn(
        'not-prose flex w-full flex-col overflow-clip rounded-xl border border-border bg-card text-card-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

CodeBlock.displayName = 'CodeBlock'

export type CodeBlockCodeProps = {
  code: string
  language?: string
  theme?: string
  className?: string
} & React.HTMLProps<HTMLDivElement>

const shikiLanguageMap: Record<string, string> = {
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  py: 'python',
  md: 'markdown',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
}

function resolveLanguage(language: string) {
  return shikiLanguageMap[language] ?? language
}

function CodeBlockCode({
  code,
  language = 'tsx',
  theme,
  className,
  ...props
}: CodeBlockCodeProps) {
  const { resolvedTheme } = useTheme()
  const [highlightedHtml, setHighlightedHtml] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true

    async function highlight() {
      try {
        if (!code) {
          if (mounted) setHighlightedHtml('<pre><code></code></pre>')
          return
        }

        const effectiveTheme = theme || (resolvedTheme === 'dark' ? 'github-dark' : 'github-light')
        const html = await codeToHtml(code, {
          lang: resolveLanguage(language),
          theme: effectiveTheme,
        })
        if (mounted) {
          setHighlightedHtml(html)
        }
      } catch {
        if (mounted) {
          setHighlightedHtml(null)
        }
      }
    }

    highlight()

    return () => {
      mounted = false
    }
  }, [code, language, resolvedTheme, theme])

  const classNames = cn(
    'w-full overflow-x-auto text-[13px] [&>pre]:min-w-full [&>pre]:px-4 [&>pre]:py-4 [&_pre]:text-foreground',
    className,
  )

  return highlightedHtml ? (
    <div
      className={classNames}
      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      {...props}
    />
  ) : (
    <div className={classNames} {...props}>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  )
}

export type CodeBlockGroupProps = React.HTMLAttributes<HTMLDivElement>

function CodeBlockGroup({ children, className, ...props }: CodeBlockGroupProps) {
  return (
    <div className={cn('flex items-center justify-between', className)} {...props}>
      {children}
    </div>
  )
}

export { CodeBlockGroup, CodeBlockCode, CodeBlock }
