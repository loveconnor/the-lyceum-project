import { promises as fs } from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'

import { collectSectionsFromMarkdown } from '@/lib/sections'

type Frontmatter = Record<string, unknown>

export type DocPage = {
  title?: string
  metadataTitle?: string
  description?: string
  content: string
  tableOfContents: ReturnType<typeof collectSectionsFromMarkdown>
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function extractFrontmatter(raw: string) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!match) {
    return { frontmatter: {} as Frontmatter, content: raw.trim() }
  }

  const parsed = yaml.load(match[1])
  const frontmatter = isObject(parsed) ? parsed : {}
  const content = raw.slice(match[0].length).trim()

  return { frontmatter, content }
}

function getFilePathFromRoute(routeSegments: string[]) {
  const safeSegments = routeSegments.filter(Boolean)
  if (safeSegments.some((segment) => segment.includes('..') || segment.includes('/'))) {
    return null
  }

  const root = path.join(process.cwd(), 'src', 'app')
  return safeSegments.length === 0
    ? path.join(root, 'page.md')
    : path.join(root, ...safeSegments, 'page.md')
}

export async function getDocPage(routeSegments: string[]): Promise<DocPage | null> {
  const filePath = getFilePathFromRoute(routeSegments)
  if (!filePath) {
    return null
  }

  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const { frontmatter, content } = extractFrontmatter(raw)

    const nextjs = isObject(frontmatter.nextjs) ? frontmatter.nextjs : undefined
    const metadata = isObject(nextjs?.metadata) ? nextjs.metadata : undefined

    return {
      title: typeof frontmatter.title === 'string' ? frontmatter.title : undefined,
      metadataTitle: typeof metadata?.title === 'string' ? metadata.title : undefined,
      description: typeof metadata?.description === 'string' ? metadata.description : undefined,
      content,
      tableOfContents: collectSectionsFromMarkdown(content),
    }
  } catch {
    return null
  }
}

export function hrefToRouteSegments(href: string) {
  return href
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean)
}
