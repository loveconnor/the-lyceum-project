import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DocsLayout } from '@/components/DocsLayout'
import { getDocPage, hrefToRouteSegments } from '@/lib/docs'
import { navigation } from '@/lib/navigation'

type DocsRouteParams = { slug: string[] }

function getDocLinks() {
  return navigation
    .flatMap((section) => section.links)
    .filter((link) => link.href.startsWith('/docs/'))
}

export async function generateStaticParams() {
  return getDocLinks().map((link) => ({
    slug: hrefToRouteSegments(link.href).slice(1),
  }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<DocsRouteParams>
}): Promise<Metadata> {
  const { slug } = await params
  const doc = await getDocPage(['docs', ...slug])

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

export default async function DocsSlugPage({
  params,
}: {
  params: Promise<DocsRouteParams>
}) {
  const { slug } = await params
  const doc = await getDocPage(['docs', ...slug])

  if (!doc) {
    notFound()
  }

  return <DocsLayout title={doc.title} content={doc.content} tableOfContents={doc.tableOfContents} />
}
