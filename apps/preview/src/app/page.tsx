import { Heading, Text } from '@kemo/ui'
import { CenteredPage } from '@/components/centered-page'

export default function HomePage() {
  return (
    <CenteredPage>
      <Heading as="h1" textStyle="3xl">
        kemo-design-system preview
      </Heading>
      <Text color="fg.muted">
        Open the panel with the button in the bottom-right corner to move between pages and
        component groups.
      </Text>
    </CenteredPage>
  )
}
