import type { ClusterOption } from '../../lib/kubernetes'

// Plain helpers, kept out of the `'use client'` modules so a Server Component can import them.

/** The annotation the Overview's Created line reads "by {creator}" from, when a host stamps one. */
export const CREATED_BY_ANNOTATION = 'kemo.dev/created-by'

/** The namespaces of the chosen clusters (of every cluster when none is chosen), once each, sorted. */
export function scopedNamespaces(clusters: ClusterOption[], chosen: string[]): string[] {
  const inScope = chosen.length > 0 ? clusters.filter((c) => chosen.includes(c.id)) : clusters
  return [...new Set(inScope.flatMap((cluster) => cluster.namespaces))].sort()
}
