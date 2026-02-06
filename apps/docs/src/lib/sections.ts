import slugify from '@sindresorhus/slugify'

export type Subsection = {
  id: string
  title: string
  children?: undefined
}

export type Section = {
  id: string
  title: string
  children: Array<Subsection>
}

function normalizeHeading(text: string) {
  return text
    .replace(/\s+#+\s*$/, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~]/g, '')
    .replace(/<[^>]+>/g, '')
    .trim()
}

export function collectSectionsFromMarkdown(markdown: string) {
  const sections: Array<Section> = []
  const lines = markdown.split('\n')

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/)
    if (!match) continue

    const level = match[1].length
    const title = normalizeHeading(match[2])
    if (!title) continue

    const id = slugify(title)
    if (level === 2) {
      sections.push({ id, title, children: [] })
      continue
    }

    if (level === 3 && sections.length > 0) {
      sections[sections.length - 1].children.push({ id, title })
    }
  }

  return sections
}
