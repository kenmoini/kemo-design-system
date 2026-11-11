import { z } from 'zod'

export const userSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(64, 'Use at most 64 characters.'),
  email: z.email('Enter a valid email.'),
  role: z.string().min(1, 'Choose a role.'),
  source: z.enum(['internal', 'oidc']),
  groups: z.array(z.string()),
  sendInvite: z.boolean(),
})

export type UserValues = z.infer<typeof userSchema>

/** The Add user form's starting values. */
export const userDefaults: UserValues = {
  name: '',
  email: '',
  role: '',
  source: 'internal',
  groups: [],
  sendInvite: true,
}

const nameField = z.string().trim().min(1, 'Enter a name.').max(64, 'Use at most 64 characters.')
const descriptionField = z.string().trim().max(240, 'Use at most 240 characters.')

export const groupSchema = z.object({
  name: nameField,
  description: descriptionField,
  roles: z.array(z.string()),
})

export type GroupValues = z.infer<typeof groupSchema>

export const groupDefaults: GroupValues = { name: '', description: '', roles: [] }

export const roleSchema = z.object({
  name: nameField,
  description: descriptionField,
  permissions: z.array(z.string()).min(1, 'Choose at least one permission.'),
})

export type RoleValues = z.infer<typeof roleSchema>

export const roleDefaults: RoleValues = { name: '', description: '', permissions: [] }

export const permissionActions = ['read', 'create', 'update', 'delete', 'admin'] as const

export const permissionSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[a-z]+\.[a-z]+$/, 'Use the form resource.action, e.g. deployments.create.'),
  resource: z.string().min(1, 'Choose a resource.'),
  action: z.enum(permissionActions, 'Choose an action.'),
  description: descriptionField,
})

export type PermissionValues = z.infer<typeof permissionSchema>

export const permissionDefaults: PermissionValues = {
  name: '',
  resource: '',
  action: 'read',
  description: '',
}

export const serviceAccountSchema = z.object({
  name: nameField,
  description: descriptionField,
  role: z.string().min(1, 'Choose a role.'),
  tokenLifetimeDays: z
    .number('Enter a number of days.')
    .int('Use a whole number of days.')
    .min(1, 'Use 1 to 365 days.')
    .max(365, 'Use 1 to 365 days.'),
})

export type ServiceAccountValues = z.infer<typeof serviceAccountSchema>

export const serviceAccountDefaults: ServiceAccountValues = {
  name: '',
  description: '',
  role: '',
  tokenLifetimeDays: 90,
}

export const oauthAppSchema = z
  .object({
    name: nameField,
    type: z.enum(['web', 'native', 'machine']),
    redirectUris: z.array(z.url('Enter a valid URL.')),
    scopes: z.array(z.string()),
    description: descriptionField,
  })
  .superRefine((values, ctx) => {
    if (values.type !== 'machine' && values.redirectUris.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['redirectUris'],
        message: 'Add at least one redirect URI.',
      })
    }
  })

export type OAuthAppValues = z.infer<typeof oauthAppSchema>

export const oauthAppDefaults: OAuthAppValues = {
  name: '',
  type: 'web',
  redirectUris: [],
  scopes: [],
  description: '',
}
