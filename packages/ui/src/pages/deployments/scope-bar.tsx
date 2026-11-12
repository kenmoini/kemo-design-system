'use client'
import { useMemo } from 'react'
import { Box, HStack } from '../../../styled-system/jsx'
import type { ClusterOption, ScopeValue } from '../../lib/kubernetes'
import type { Option } from '../../widgets'
import { MultiSelectField } from '../access'
import { scopedNamespaces } from './helpers'

export interface ScopeBarProps {
  clusters: ClusterOption[]
  /** The chosen clusters and namespaces (ids); `[]` means "All". */
  value: ScopeValue
  onChange: (value: ScopeValue) => void
}

/**
 * The scope row above the Deployments list: two multi-select pickers, Clusters and Namespaces,
 * that read "All clusters" / "All namespaces" when nothing is chosen and show up to two chips and
 * "+N" otherwise. The namespaces offered are those of the chosen clusters; choosing clusters drops
 * namespaces that are no longer offered. The pickers stack below `md`.
 */
export function ScopeBar({ clusters, value, onChange }: ScopeBarProps) {
  const clusterOptions = useMemo<Option[]>(
    () => clusters.map((cluster) => ({ value: cluster.id, label: cluster.label })),
    [clusters],
  )
  const namespaceOptions = useMemo<Option[]>(
    () =>
      scopedNamespaces(clusters, value.clusters).map((namespace) => ({
        value: namespace,
        label: namespace,
      })),
    [clusters, value.clusters],
  )

  const changeClusters = (next: string[]) => {
    const offered = scopedNamespaces(clusters, next)
    onChange({
      clusters: next,
      namespaces: value.namespaces.filter((namespace) => offered.includes(namespace)),
    })
  }

  return (
    <HStack
      gap="4"
      flexWrap="wrap"
      flexDirection={{ base: 'column', md: 'row' }}
      alignItems={{ base: 'stretch', md: 'flex-start' }}
    >
      <Box w={{ base: 'full', md: '80' }}>
        <MultiSelectField
          label="Clusters"
          options={clusterOptions}
          value={value.clusters}
          onChange={changeClusters}
          placeholder="All clusters"
          maxChips={2}
        />
      </Box>
      <Box w={{ base: 'full', md: '80' }}>
        <MultiSelectField
          label="Namespaces"
          options={namespaceOptions}
          value={value.namespaces}
          onChange={(namespaces) => onChange({ clusters: value.clusters, namespaces })}
          placeholder="All namespaces"
          maxChips={2}
        />
      </Box>
    </HStack>
  )
}
