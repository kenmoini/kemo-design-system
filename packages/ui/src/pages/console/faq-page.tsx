'use client'
import { Box, Grid, HStack, Stack, styled } from '../../../styled-system/jsx'
import { Button, Heading, Link } from '../../components/ui'
import { PageHeader } from '../../layouts/app-shell'
import { FaqIndex } from './faq-index'
import type { FaqPageProps } from './types'
import { useCurrentSection } from './use-current-section'

/**
 * An FAQ page for the inside of an `AppShell`: a topic index (sticky on `lg`, a scrollable row below)
 * beside always-open answers, each question linkable at `#q-{id}`.
 */
export function FaqPage({ title, description, topics, action, linkComponent }: FaqPageProps) {
  const currentSection = useCurrentSection(topics.map((topic) => `topic-${topic.id}`))
  const currentId = topics.find((topic) => `topic-${topic.id}` === currentSection)?.id
  // Without a host link the action is a bare anchor: Park's `Link` recipe would override the button's.
  const HostLink = linkComponent

  return (
    <Stack gap="6">
      <PageHeader
        title={title ?? 'Frequently asked questions'}
        context={description}
        actions={
          action &&
          (action.href !== undefined ? (
            <Button asChild variant="outline">
              {HostLink ? (
                <HostLink href={action.href}>{action.label}</HostLink>
              ) : (
                <a href={action.href}>{action.label}</a>
              )}
            </Button>
          ) : (
            <Button variant="outline" onClick={action.onSelect}>
              {action.label}
            </Button>
          ))
        }
      />
      <Grid
        gridTemplateColumns={{ base: '1fr', lg: '12rem minmax(0, 44rem)' }}
        gap="8"
        alignItems="start"
      >
        <FaqIndex topics={topics} currentId={currentId} />
        <Stack gap="10" minW="0">
          {topics.map((topic) => (
            // `scrollMarginTop` (and the h3's) lands anchor jumps below the host's sticky top bar.
            <styled.section
              key={topic.id}
              id={`topic-${topic.id}`}
              aria-labelledby={`topic-${topic.id}-label`}
              scrollMarginTop="20"
            >
              <Heading
                as="h2"
                id={`topic-${topic.id}-label`}
                textStyle="lg"
                fontWeight="semibold"
                mb="4"
              >
                {topic.label}
              </Heading>
              <Stack gap="6">
                {topic.questions.map((q) => (
                  <Box key={q.id}>
                    <HStack gap="2" alignItems="baseline">
                      <Heading
                        as="h3"
                        id={`q-${q.id}`}
                        textStyle="md"
                        fontWeight="medium"
                        scrollMarginTop="20"
                      >
                        {q.question}
                      </Heading>
                      <Link
                        href={`#q-${q.id}`}
                        aria-label="Link to this question"
                        variant="plain"
                        color="fg.subtle"
                        _hover={{ color: 'fg.muted' }}
                      >
                        #
                      </Link>
                    </HStack>
                    {/* A `div`, not `Text`: answers may hold paragraphs or lists. */}
                    <Box color="fg.muted" mt="1.5">
                      {q.answer}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </styled.section>
          ))}
        </Stack>
      </Grid>
    </Stack>
  )
}
