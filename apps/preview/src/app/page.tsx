import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Field,
  Heading,
  IconButton,
  Input,
  Link,
  PasswordInput,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Text,
} from '@kemo/ui'
import type { ReactNode } from 'react'
import { Grid, HStack, Stack } from '../../styled-system/jsx'

const buttonVariants = ['solid', 'subtle', 'surface', 'outline', 'plain'] as const
const buttonSizes = ['xs', 'sm', 'md', 'lg'] as const

export default function GalleryPage() {
  return (
    <Stack gap="12">
      <Stack gap="2">
        <Heading as="h1" textStyle="4xl">
          Component gallery
        </Heading>
        <Text color="fg.muted">
          The @kemo/ui components the auth pages build on, in the theme: DM Sans, neutral palette,
          XS radii. Use the toggle to check dark mode.
        </Text>
      </Stack>
      <ButtonsSection />
      <IconButtonSection />
      <InputsSection />
      <CheckboxSection />
      <CardSection />
      <TypographySection />
      <AlertSection />
      <BadgeSection />
      <SkeletonSection />
    </Stack>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack as="section" gap="4">
      <Heading as="h2" textStyle="xl">
        {title}
      </Heading>
      {children}
    </Stack>
  )
}

function ButtonsSection() {
  return (
    <Section title="Buttons">
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
  )
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconButtonSection() {
  return (
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
  )
}

function InputsSection() {
  return (
    <Section title="Inputs">
      <Grid columns={{ base: 1, md: 3 }} gap="6">
        <Field.Root>
          <Field.Label>Email</Field.Label>
          <Input type="email" placeholder="you@example.com" />
          <Field.HelperText>We never share your email.</Field.HelperText>
        </Field.Root>
        <Field.Root invalid>
          <Field.Label>Email (invalid)</Field.Label>
          <Input type="email" defaultValue="not-an-email" />
          <Field.ErrorText>Enter a valid email address.</Field.ErrorText>
        </Field.Root>
        <Field.Root disabled>
          <Field.Label>Email (disabled)</Field.Label>
          <Input type="email" placeholder="you@example.com" />
          <Field.HelperText>Editing is turned off.</Field.HelperText>
        </Field.Root>
        <Field.Root>
          <Field.Label>Password</Field.Label>
          <PasswordInput placeholder="Your password" />
          <Field.HelperText>At least 12 characters.</Field.HelperText>
        </Field.Root>
        <Field.Root invalid>
          <Field.Label>Password (invalid)</Field.Label>
          <PasswordInput placeholder="Your password" />
          <Field.ErrorText>Password is required.</Field.ErrorText>
        </Field.Root>
        <Field.Root disabled>
          <Field.Label>Password (disabled)</Field.Label>
          <PasswordInput placeholder="Your password" />
          <Field.HelperText>Editing is turned off.</Field.HelperText>
        </Field.Root>
      </Grid>
    </Section>
  )
}

function CheckboxSection() {
  return (
    <Section title="Checkbox">
      <HStack gap="6">
        <Checkbox.Root>
          <Checkbox.HiddenInput />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Remember me</Checkbox.Label>
        </Checkbox.Root>
        <Checkbox.Root defaultChecked>
          <Checkbox.HiddenInput />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Accept the terms</Checkbox.Label>
        </Checkbox.Root>
      </HStack>
    </Section>
  )
}

function CardSection() {
  return (
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
  )
}

function TypographySection() {
  return (
    <Section title="Typography">
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
        <Text>
          Body text sets in DM Sans. The quick brown fox jumps over the lazy dog, 0123456789.
        </Text>
        <Text textStyle="sm" color="fg.muted">
          Muted small text for hints and captions.
        </Text>
        <Text>
          Links look like this: <Link href="https://park-ui.com">Park UI documentation</Link>.
        </Text>
      </Stack>
    </Section>
  )
}

function AlertSection() {
  return (
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
  )
}

function BadgeSection() {
  return (
    <Section title="Badge">
      <HStack gap="3">
        <Badge variant="solid">Solid</Badge>
        <Badge variant="surface">Surface</Badge>
        <Badge variant="subtle">Subtle</Badge>
        <Badge variant="outline">Outline</Badge>
      </HStack>
    </Section>
  )
}

function SkeletonSection() {
  return (
    <Section title="Skeleton">
      <HStack gap="4" alignItems="flex-start" maxWidth="md">
        <SkeletonCircle boxSize="12" />
        <SkeletonText noOfLines={3} />
      </HStack>
      <Skeleton height="24" maxWidth="md" />
    </Section>
  )
}
