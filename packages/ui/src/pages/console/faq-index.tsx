import { Box, styled } from '../../../styled-system/jsx'
import { Link } from '../../components/ui'
import type { FaqTopic } from './types'

export interface FaqIndexProps {
  topics: FaqTopic[]
  /** The topic id marked current (`aria-current`, medium weight, and a start border on `lg` or a leading square below it). */
  currentId?: string
}

/** The topic index: a sticky column on `lg` and up, a horizontally scrollable row below it. */
export function FaqIndex({ topics, currentId }: FaqIndexProps) {
  return (
    <styled.nav aria-label="Topics" position={{ lg: 'sticky' }} top={{ lg: '20' }} minW="0">
      {/* `listStyle: none` drops the implicit list role in Safari/VoiceOver; set it back. */}
      <styled.ul
        role="list"
        listStyle="none"
        display="flex"
        flexDirection={{ base: 'row', lg: 'column' }}
        overflowX={{ base: 'auto', lg: 'visible' }}
        // Room for the links' focus rings, which the scrolling row would otherwise clip.
        p={{ base: '1', lg: '0' }}
        gap="1"
      >
        {topics.map(({ id, label }) => {
          const current = id === currentId
          return (
            <li key={id}>
              <Link
                href={`#topic-${id}`}
                aria-current={current ? 'true' : undefined}
                display="flex"
                textStyle="sm"
                px="3"
                py="1.5"
                whiteSpace={{ base: 'nowrap', lg: 'normal' }}
                borderInlineStartWidth={{ lg: '2px' }}
                borderColor={current ? 'fg.default' : 'transparent'}
                color={current ? 'fg.default' : 'fg.muted'}
                fontWeight={current ? 'medium' : 'normal'}
                textDecoration="none"
                _hover={{ color: 'fg.default' }}
              >
                {current ? (
                  <Box
                    data-current-glyph=""
                    aria-hidden="true"
                    display={{ base: 'inline-block', lg: 'none' }}
                    flexShrink="0"
                    w="1.5"
                    h="1.5"
                    mt="1.5"
                    me="2"
                    bg="fg.default"
                  />
                ) : null}
                {label}
              </Link>
            </li>
          )
        })}
      </styled.ul>
    </styled.nav>
  )
}
