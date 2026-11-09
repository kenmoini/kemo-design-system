import { Badge, Button, IconButton, Text } from '@kemo/ui'
import { PlusIcon } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Section } from '@/components/section'
import { HStack, Stack } from '../../../../styled-system/jsx'

const buttonVariants = ['solid', 'subtle', 'surface', 'outline', 'plain'] as const
const buttonSizes = ['xs', 'sm', 'md', 'lg'] as const

export default function ButtonsPage() {
  return (
    <>
      <PageHeader title="Buttons">
        Every button variant at every size, the loading state, icon buttons and badges.
      </PageHeader>
      <Section title="Button">
        <Stack gap="3">
          {buttonVariants.map((variant) => (
            <HStack key={variant} gap="3" flexWrap="wrap">
              <Text width="20" textStyle="sm" color="fg.muted">
                {variant}
              </Text>
              {buttonSizes.map((size) => (
                <Button key={size} variant={variant} size={size}>
                  Button {size}
                </Button>
              ))}
            </HStack>
          ))}
          <HStack gap="3">
            <Text width="20" textStyle="sm" color="fg.muted">
              loading
            </Text>
            <Button loading loadingText="Saving">
              Save
            </Button>
          </HStack>
        </Stack>
      </Section>
      <Section title="Icon button">
        <HStack gap="3">
          <IconButton aria-label="Add (solid)">
            <PlusIcon />
          </IconButton>
          <IconButton aria-label="Add (outline)" variant="outline">
            <PlusIcon />
          </IconButton>
          <IconButton aria-label="Add (plain)" variant="plain">
            <PlusIcon />
          </IconButton>
        </HStack>
      </Section>
      <Section title="Badge">
        <HStack gap="3">
          <Badge variant="solid">Solid</Badge>
          <Badge variant="surface">Surface</Badge>
          <Badge variant="subtle">Subtle</Badge>
          <Badge variant="outline">Outline</Badge>
        </HStack>
      </Section>
    </>
  )
}
