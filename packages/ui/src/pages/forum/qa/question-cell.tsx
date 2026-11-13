import { CheckIcon } from 'lucide-react'
import { css, cva } from '../../../../styled-system/css'
import { Box, HStack, styled } from '../../../../styled-system/jsx'
import type { LinkComponent } from '../../auth/types'
import { HostLink } from '../../blog/host-link'
import { answerCountOf, formatCount, isSolved, scoreOf } from '../content'
import { CategoryBadge, Count, RelativeTime, StatusBadge, TagBadge } from '../parts'
import type { ForumCategory, ForumTopic } from '../types'

export interface QuestionCellProps {
  topic: ForumTopic
  category?: ForumCategory
  href: string
  categoryHref?: string
  linkComponent?: LinkComponent
  now: string
  /** The heading level of the title: 2 under a page `h1`, 3 under a section `h2`. Default 3. */
  headingLevel?: 2 | 3
  trailing: 'time' | 'votes'
}

/** The plain link style of Q&A titles; shared by the front page and the question cell. */
export const titleLink = css({
  color: 'fg.default',
  textDecoration: 'none',
  _hover: { textDecoration: 'underline' },
  _focusVisible: { outline: '2px solid', outlineOffset: '2px', rounded: 'l1' },
})

const answerCell = cva({
  base: { borderWidth: '1px', borderRadius: 'l2', textAlign: 'center', w: '11', py: '1' },
  variants: {
    tone: {
      solved: { bg: 'green.2', borderColor: 'green.6', color: 'green.11' },
      some: { borderColor: 'border' },
      none: { borderColor: 'border', borderStyle: 'dashed', color: 'fg.subtle' },
    },
  },
})

/** One question: the answer-count cell beside the title and a meta line. */
export function QuestionCell({
  topic,
  category,
  href,
  categoryHref,
  linkComponent,
  now,
  trailing,
  headingLevel = 3,
}: QuestionCellProps) {
  const answers = answerCountOf(topic)
  const Title = headingLevel === 2 ? styled.h2 : styled.h3
  const solved = isSolved(topic)
  const tone = solved ? 'solved' : answers > 0 ? 'some' : 'none'
  const label = solved
    ? `${answers} ${answers === 1 ? 'answer' : 'answers'}, accepted`
    : answers > 0
      ? `${answers} ${answers === 1 ? 'answer' : 'answers'}`
      : 'No answers yet'
  const score = scoreOf(topic)
  return (
    <styled.li listStyle="none" borderBottomWidth="1px" borderColor="border">
      <Box as="article" display="grid" gridTemplateColumns="2.75rem 1fr" gap="3" py="3">
        <div role="img" aria-label={label} className={answerCell({ tone })}>
          <styled.b display="block" textStyle="md" fontWeight="semibold" lineHeight="1.2">
            {solved ? <CheckIcon size={12} aria-hidden="true" /> : null}
            <Count value={answers} />
          </styled.b>
          {/* Below the smallest text style (xs, 12px), which overflows the 2.75rem cell; the mockup
              draws this label at 9px under a 14px count. */}
          <styled.span display="block" fontSize="0.625rem" lineHeight="1rem">
            {answers === 1 ? 'answer' : 'answers'}
          </styled.span>
        </div>
        <Box minW="0">
          <Title textStyle="sm" fontWeight="semibold">
            <HostLink as={linkComponent} href={href} className={titleLink}>
              {topic.title}
            </HostLink>
          </Title>
          <HStack gap="2" flexWrap="wrap" mt="1" textStyle="xs" color="fg.subtle">
            {category ? (
              <CategoryBadge
                category={category}
                href={categoryHref}
                linkComponent={linkComponent}
              />
            ) : null}
            {topic.tags.map((tag) => (
              <TagBadge key={tag} tag={{ id: tag }} />
            ))}
            <StatusBadge topic={topic} />
            <span>
              {topic.author.name} ·{' '}
              {trailing === 'time' ? (
                <RelativeTime iso={topic.createdAt} now={now} />
              ) : (
                `${formatCount(score)} ${score === 1 ? 'vote' : 'votes'}`
              )}
            </span>
          </HStack>
        </Box>
      </Box>
    </styled.li>
  )
}
