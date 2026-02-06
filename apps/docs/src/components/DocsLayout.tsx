import { DocsHeader } from '@/components/DocsHeader'
import { PrevNextLinks } from '@/components/PrevNextLinks'
import { TableOfContents } from '@/components/TableOfContents'
import { Markdown } from '@/components/ui/custom/prompt/markdown'
import { type Section } from '@/lib/sections'

export function DocsLayout({
  title,
  content,
  tableOfContents,
}: {
  title?: string
  content: string
  tableOfContents: Array<Section>
}) {
  return (
    <>
      <div className="max-w-2xl min-w-0 flex-auto px-4 py-16 lg:max-w-none lg:pr-0 lg:pl-8 xl:px-16">
        <article>
          <DocsHeader title={title} />
          <Markdown>{content}</Markdown>
        </article>
        <PrevNextLinks />
      </div>
      <TableOfContents tableOfContents={tableOfContents} />
    </>
  )
}
