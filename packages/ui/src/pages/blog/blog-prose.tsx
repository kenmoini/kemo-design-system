import { TriangleAlertIcon } from 'lucide-react'
import { cva } from '../../../styled-system/css'
import { Box, HStack, Stack, styled } from '../../../styled-system/jsx'
import { Heading, Text } from '../../components/ui'
import { BlogCover } from './blog-cover'
import { tocOf } from './content'
import type { BlogBlock } from './types'

// A literal variant map keeps both tones statically extractable by Panda.
const calloutStyle = cva({
  base: { borderWidth: '1px', borderRadius: 'l2', p: '4', maxW: '68ch' },
  variants: {
    tone: {
      neutral: { borderColor: 'border' },
      warning: { borderColor: 'amber.7', bg: 'amber.2' },
    },
  },
})

const Quote = styled('blockquote', {
  base: {
    position: 'relative',
    pl: '5',
    maxW: '68ch',
    textStyle: 'xl',
    _before: {
      content: '""',
      position: 'absolute',
      insetBlock: '0',
      insetInlineStart: '0',
      w: '2px',
      bgGradient: 'auth',
    },
  },
})

const maxStats = 3

export function BlogProse({ blocks }: { blocks: BlogBlock[] }) {
  const ids = tocOf(blocks).map((entry) => entry.id)
  let headingIndex = 0

  return (
    <Stack maxW="40rem" gap="4" textStyle="md" lineHeight="1.7">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'paragraph':
            return (
              <styled.p key={index} maxW="68ch">
                {block.content}
              </styled.p>
            )
          case 'heading': {
            const id = ids[headingIndex++]
            return block.level === 2 ? (
              <Heading
                key={index}
                as="h2"
                id={id}
                textStyle="xl"
                scrollMarginTop="6"
                mt="4"
                letterSpacing="tight"
              >
                {block.text}
              </Heading>
            ) : (
              <Heading
                key={index}
                as="h3"
                id={id}
                textStyle="lg"
                scrollMarginTop="6"
                mt="4"
                letterSpacing="tight"
              >
                {block.text}
              </Heading>
            )
          }
          case 'list':
            return block.ordered ? (
              <styled.ol key={index} maxW="68ch" pl="6" listStyleType="decimal">
                {block.items.map((item, i) => (
                  <styled.li key={i} pl="1">
                    {item}
                  </styled.li>
                ))}
              </styled.ol>
            ) : (
              <styled.ul key={index} maxW="68ch" pl="6" listStyleType="disc">
                {block.items.map((item, i) => (
                  <styled.li key={i} pl="1">
                    {item}
                  </styled.li>
                ))}
              </styled.ul>
            )
          case 'quote':
            return (
              <Quote key={index}>
                {block.content}
                {block.cite ? (
                  <Text
                    as="cite"
                    display="block"
                    textStyle="sm"
                    color="fg.muted"
                    fontStyle="normal"
                  >
                    {block.cite}
                  </Text>
                ) : null}
              </Quote>
            )
          case 'code':
            return (
              <styled.figure key={index} display="flex" flexDirection="column" gap="2">
                {/* `.dark` gives the block a dark surface in both themes. */}
                <Box className="dark" colorScheme="dark" position="relative">
                  {block.language ? (
                    <Text
                      as="span"
                      textStyle="xs"
                      color="fg.muted"
                      position="absolute"
                      top="2"
                      right="3"
                    >
                      {block.language}
                    </Text>
                  ) : null}
                  <styled.pre
                    tabIndex={0}
                    aria-label={block.language ? `Code example, ${block.language}` : 'Code example'}
                    overflowX="auto"
                    fontFamily="mono"
                    textStyle="sm"
                    lineHeight="1.6"
                    bg="gray.2"
                    color="fg.default"
                    p="4"
                    pt={block.language ? '8' : '4'}
                    borderRadius="l2"
                  >
                    <code>{block.code}</code>
                  </styled.pre>
                </Box>
                {block.caption ? (
                  <styled.figcaption textStyle="sm" color="fg.muted">
                    {block.caption}
                  </styled.figcaption>
                ) : null}
              </styled.figure>
            )
          case 'callout': {
            const tone = block.tone ?? 'neutral'
            return (
              <Stack key={index} gap="1" className={calloutStyle({ tone })}>
                <HStack gap="2">
                  {tone === 'warning' ? <TriangleAlertIcon aria-hidden="true" size={16} /> : null}
                  <Text as="span" fontWeight="bold">
                    {block.label ?? (tone === 'warning' ? 'Warning' : 'Note')}
                  </Text>
                </HStack>
                <Box>{block.content}</Box>
              </Stack>
            )
          }
          case 'stats':
            return (
              <styled.dl
                key={index}
                display="grid"
                gridTemplateColumns={{ base: '1fr', sm: 'repeat(auto-fit, minmax(0, 1fr))' }}
                gap="3"
              >
                {block.items.slice(0, maxStats).map((item, i) => (
                  <Box
                    key={i}
                    display="flex"
                    flexDirection="column-reverse"
                    borderWidth="1px"
                    borderColor="border"
                    borderRadius="l2"
                    p="4"
                  >
                    <styled.dt textStyle="sm" color="fg.muted">
                      {item.label}
                    </styled.dt>
                    <styled.dd textStyle="2xl" fontWeight="semibold">
                      {item.value}
                    </styled.dd>
                  </Box>
                ))}
              </styled.dl>
            )
          case 'figure':
            return (
              <styled.figure key={index} display="flex" flexDirection="column" gap="2">
                <BlogCover cover={block.cover} aspectRatio="16 / 9" />
                {block.caption ? (
                  <styled.figcaption textStyle="sm" color="fg.muted">
                    {block.caption}
                  </styled.figcaption>
                ) : null}
              </styled.figure>
            )
        }
      })}
    </Stack>
  )
}
