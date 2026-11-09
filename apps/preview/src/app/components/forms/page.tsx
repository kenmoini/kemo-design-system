import { Checkbox, Field, Input, PasswordInput } from '@kemo/ui'
import { PageHeader } from '@/components/page-header'
import { Section } from '@/components/section'
import { Grid, HStack } from '../../../../styled-system/jsx'

export default function FormsPage() {
  return (
    <>
      <PageHeader title="Forms">
        Fields with text and password inputs in their default, invalid and disabled states, and
        checkboxes.
      </PageHeader>
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
    </>
  )
}
