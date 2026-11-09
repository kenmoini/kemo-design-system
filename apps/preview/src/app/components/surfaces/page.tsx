import type { Metadata } from 'next'
import { Alert, Button, Card, Skeleton, SkeletonCircle, SkeletonText, Text } from '@kemo/ui'
import { PageHeader } from '@/components/page-header'
import { Section } from '@/components/section'
import { HStack } from '../../../../styled-system/jsx'

export const metadata: Metadata = { title: 'Surfaces' }

export default function SurfacesPage() {
  return (
    <>
      <PageHeader title="Surfaces">
        Cards with a header, body and footer, an alert, and loading skeletons.
      </PageHeader>
      <Section title="Card">
        <Card.Root maxWidth="md">
          <Card.Header>
            <Card.Title>Team workspace</Card.Title>
            <Card.Description>Invite teammates and share projects.</Card.Description>
          </Card.Header>
          <Card.Body>
            <Text>Members get access to every project in the workspace.</Text>
          </Card.Body>
          <Card.Footer>
            <Button variant="outline">Cancel</Button>
            <Button>Invite</Button>
          </Card.Footer>
        </Card.Root>
      </Section>
      <Section title="Alert">
        <Alert.Root>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Heads up</Alert.Title>
            <Alert.Description>
              This alert uses the default status (info), drawn from the blue palette.
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      </Section>
      <Section title="Skeleton">
        <HStack gap="4" alignItems="flex-start" maxWidth="md">
          <SkeletonCircle boxSize="12" />
          <SkeletonText noOfLines={3} />
        </HStack>
        <Skeleton height="24" maxWidth="md" />
      </Section>
    </>
  )
}
