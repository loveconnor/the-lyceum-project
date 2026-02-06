import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DocsLayout } from '@/components/DocsLayout'
import { getDocPage } from '@/lib/docs'

export async function generateMetadata(): Promise<Metadata> {
  const doc = await getDocPage([])
  if (!doc) {
    return {
      title: 'Lyceum Docs',
    }
  }

  return {
    title: doc.metadataTitle ?? doc.title ?? 'Lyceum Docs',
    description: doc.description ?? 'Documentation for The Lyceum Project learning platform.',
  }
}

export default async function HomePage() {
  const doc = await getDocPage([])
  if (!doc) {
    notFound()
  }

  return <DocsLayout title={doc.title} content={doc.content} tableOfContents={doc.tableOfContents} />
}
