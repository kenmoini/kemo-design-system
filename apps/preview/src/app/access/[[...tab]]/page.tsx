import { accessTabs } from '@kemo/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AccessDemo } from '@/components/access/access-demo'

interface AccessRouteProps {
  params: Promise<{ tab?: string[] }>
}

export function generateStaticParams() {
  return [{ tab: [] }, ...accessTabs.map((t) => ({ tab: [t.id] }))]
}

/** The tab a URL names: none is the overview; an unknown tab, or anything below one, is a 404. */
async function resolveTab(params: AccessRouteProps['params']) {
  const { tab } = await params
  const id = tab?.[0] ?? 'overview'
  const match = accessTabs.find((t) => t.id === id)
  if (!match || (tab?.length ?? 0) > 1) notFound()
  return match
}

export async function generateMetadata({ params }: AccessRouteProps): Promise<Metadata> {
  const { label } = await resolveTab(params)
  return { title: `Access · ${label}` }
}

export default async function AccessRoute({ params }: AccessRouteProps) {
  const { id } = await resolveTab(params)
  return <AccessDemo tab={id} />
}
