'use client'
import {
  Button,
  defaultSchemaRegistry,
  deploymentSchema,
  type Option,
  PageHeader,
  ResourceYamlTab,
  schemaFor,
  SelectField,
} from '@kemo/ui'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Grid, Stack } from '../../../styled-system/jsx'
import { useDeploymentsDemo } from '@/components/deployments/deployments-demo'
import { clusters, namespaceOf, starterTemplate, withNamespace } from '@/lib/mock-deployments'

const schema = schemaFor(defaultSchemaRegistry, 'apps/v1', 'Deployment') ?? deploymentSchema

const clusterOptions: Option[] = clusters.map((c) => ({ value: c.id, label: c.label }))

/**
 * Create a Deployment (`/deployments/new`): pick the cluster (the first in the list's scope to
 * start with) and the namespace, which the YAML's `metadata.namespace` mirrors both ways, edit the
 * starter template, then Create adds it and opens its page.
 */
export function DeploymentCreateDemo() {
  const { state, create } = useDeploymentsDemo()
  const router = useRouter()

  // Until a cluster is picked, the first one in scope (the saved scope arrives after hydration).
  const [picked, setPicked] = useState<string>()
  const cluster = picked ?? state.scope.clusters[0] ?? clusters[0]!.id
  const namespaces = useMemo(
    () => clusters.find((c) => c.id === cluster)?.namespaces ?? [],
    [cluster],
  )
  const namespaceOptions = useMemo<Option[]>(
    () => namespaces.map((ns) => ({ value: ns, label: ns })),
    [namespaces],
  )

  // The starter names the cluster's first namespace; the draft is everything typed or picked since.
  const [draft, setDraft] = useState<string>()
  const yamlText = useMemo(
    () => withNamespace(starterTemplate, namespaces[0] ?? 'default'),
    [namespaces],
  )
  const text = draft ?? yamlText
  const typed = namespaceOf(text)
  const namespace = typed && namespaces.includes(typed) ? typed : ''

  const pickCluster = (next: string) => {
    setPicked(next)
    const offered = clusters.find((c) => c.id === next)?.namespaces ?? []
    // A namespace the new cluster doesn't have moves to its first one.
    if (draft !== undefined && !(typed && offered.includes(typed))) {
      setDraft(withNamespace(draft, offered[0] ?? 'default'))
    }
  }

  return (
    <Stack gap="6">
      <PageHeader
        title="Create deployment"
        context="An apps/v1 Deployment: choose where it runs, then edit the YAML."
        actions={
          <Button asChild variant="outline">
            <NextLink href="/deployments">Cancel</NextLink>
          </Button>
        }
      />
      <ResourceYamlTab
        mode="create"
        yamlText={yamlText}
        draft={draft}
        onDraftChange={setDraft}
        schema={schema}
        onSave={async (saved) => {
          const id = await create(cluster, saved)
          router.push(`/deployments/${id}`)
        }}
        fileName="new-deployment.yaml"
        cleanText={() => text}
        createControls={
          <Grid columns={{ base: 1, md: 2 }} gap="4" maxW="3xl">
            <SelectField
              label="Cluster"
              required
              options={clusterOptions}
              value={cluster}
              onChange={(next) => {
                if (next) pickCluster(next)
              }}
            />
            <SelectField
              label="Namespace"
              required
              options={namespaceOptions}
              value={namespace}
              placeholder="Choose a namespace"
              error={typed && !namespace ? `${typed} isn't a namespace of ${cluster}` : undefined}
              onChange={(next) => {
                if (next) setDraft(withNamespace(text, next))
              }}
            />
          </Grid>
        }
      />
    </Stack>
  )
}
