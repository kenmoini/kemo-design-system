'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Box, HStack, Stack } from '../../../styled-system/jsx'
import { Button, Heading, Text } from '../../components/ui'
import {
  FormError,
  SelectField,
  TagsField,
  TextareaField,
  TextField,
  useFormSubmit,
} from '../access/forms/form-fields'
import { HostLink } from '../blog/host-link'
import { vocabulary } from './content'
import { ForumLayout } from './forum-layout'
import type { ForumComposerPageProps, ForumVariant } from './types'

const guidance: Record<ForumVariant, string> = {
  boards: 'Pick the board that fits and give your topic a clear title.',
  discussions: 'Say what you are trying to do and what you have tried.',
  qa: 'Search first; if nothing fits, ask with the exact versions and what you expected.',
}

const composerSchema = z.object({
  title: z
    .string()
    .trim()
    .min(10, 'Use at least 10 characters.')
    .max(120, 'Keep the title under 120 characters.'),
  categoryId: z.string().min(1, 'Choose a category.'),
  tags: z.array(z.string()).max(5, 'Use at most five tags.'),
  body: z.string().trim().min(20, 'Write at least 20 characters.'),
})
type ComposerValues = z.infer<typeof composerSchema>

const normalizeTags = (tags: string[]) => [
  ...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
]

/** The shared "new topic" page: title, category, tags and body, then post or cancel. */
export function ForumComposerPage({
  categories,
  defaultCategoryId,
  cancelHref,
  onCreateTopic,
  ...chrome
}: ForumComposerPageProps) {
  const { variant, linkComponent } = chrome
  const words = vocabulary[variant]
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ComposerValues>({
    resolver: zodResolver(composerSchema),
    defaultValues: { title: '', categoryId: defaultCategoryId ?? '', tags: [], body: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const { submit, error } = useFormSubmit(onCreateTopic)

  return (
    <ForumLayout {...chrome} hidePrimary>
      <Box maxW="40rem" mx="auto" px={{ base: '4', md: '7' }} py="7">
        <Heading as="h1" textStyle="2xl">
          {words.composerHeading}
        </Heading>
        <Text color="fg.muted" mt="2" mb="6">
          {guidance[variant]}
        </Text>
        <form
          noValidate
          onSubmit={handleSubmit((values) =>
            submit({
              title: values.title.trim(),
              categoryId: values.categoryId,
              tags: values.tags,
              body: values.body.trim(),
            }),
          )}
        >
          <Stack gap="4">
            <TextField
              label={words.titleLabel}
              helper={variant === 'qa' ? 'End with a question mark.' : undefined}
              autoComplete="off"
              error={errors.title?.message}
              {...register('title')}
            />
            <Controller
              control={control}
              name="categoryId"
              render={({ field, fieldState }) => (
                <SelectField
                  ref={field.ref}
                  label="Category"
                  placeholder="Choose a category"
                  options={categories.map((c) => ({ value: c.id, label: c.label }))}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="tags"
              render={({ field, fieldState }) => (
                <TagsField
                  ref={field.ref}
                  label="Tags"
                  placeholder="Add a tag"
                  helper="Up to five, lower-case."
                  value={field.value}
                  onChange={(next) => field.onChange(normalizeTags(next))}
                  validate={(tag, value) =>
                    value.length < 5 && !value.includes(tag.trim().toLowerCase())
                  }
                  error={fieldState.error?.message}
                />
              )}
            />
            <TextareaField
              label="Body"
              rows={8}
              helper="Plain text. Blank line starts a new paragraph. Include the console version."
              error={errors.body?.message}
              {...register('body')}
            />
            <FormError message={error} />
            <HStack justify="flex-end" gap="3">
              <Button variant="outline" asChild>
                <HostLink as={linkComponent} href={cancelHref}>
                  Cancel
                </HostLink>
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {words.composerSubmit}
              </Button>
            </HStack>
          </Stack>
        </form>
      </Box>
    </ForumLayout>
  )
}
