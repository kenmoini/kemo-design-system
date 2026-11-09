import type { Metadata } from 'next'
import { Heading, Link, Text } from '@kemo/ui'
import { PageHeader } from '@/components/page-header'
import { Section } from '@/components/section'
import { Stack } from '../../../../styled-system/jsx'

export const metadata: Metadata = { title: 'Typography' }

export default function TypographyPage() {
  return (
    <>
      <PageHeader title="Typography">Headings, body text and links, all set in DM Sans.</PageHeader>
      <Section title="Heading">
        <Stack gap="3">
          <Heading as="h3" textStyle="3xl">
            Heading 3xl
          </Heading>
          <Heading as="h3" textStyle="2xl">
            Heading 2xl
          </Heading>
          <Heading as="h3" textStyle="lg">
            Heading lg
          </Heading>
        </Stack>
      </Section>
      <Section title="Text">
        <Stack gap="3">
          <Text>
            Body text sets in DM Sans. The quick brown fox jumps over the lazy dog, 0123456789.
          </Text>
          <Text textStyle="sm" color="fg.muted">
            Muted small text for hints and captions.
          </Text>
        </Stack>
      </Section>
      <Section title="Link">
        <Text>
          Links look like this: <Link href="https://park-ui.com">Park UI documentation</Link>.
        </Text>
      </Section>
    </>
  )
}
