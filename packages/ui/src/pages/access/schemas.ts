import { z } from 'zod'
import type { AccessSettingsValues, AuditForwardingValues } from './types'

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
    .regex(
      /^[a-z]+(?:-[a-z]+)*\.[a-z]+(?:-[a-z]+)*$/,
      'Use the form resource.action, e.g. deployments.create.',
    ),
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

/** A required URL: "{empty}" when blank, "{invalid}" when it does not parse. */
function urlField(empty: string, invalid: string, protocol?: RegExp) {
  return z
    .string()
    .trim()
    .min(1, empty)
    .pipe(z.url({ protocol, error: invalid }))
}

export const auditForwardingSchema = z.object({
  destination: z.enum(['splunk', 'syslog', 's3', 'webhook'], 'Choose a destination.'),
  format: z.enum(['json', 'cef'], 'Choose a format.'),
  endpoint: urlField('Enter the endpoint URL.', 'Enter a valid URL.').refine(
    (url) => /^(https?|tcp|udp|tls|s3):/i.test(url),
    'Use an http(s), tcp, udp, tls or s3 URL.',
  ),
  token: z.string().trim().min(1, 'Enter the token.'),
  include: z
    .array(z.enum(['signins', 'admin', 'api']))
    .min(1, 'Choose at least one kind of event.'),
  failedOnly: z.boolean(),
  enabled: z.boolean(),
}) satisfies z.ZodType<AuditForwardingValues>

/** The OIDC provider form's values; `clientSecret` is blank on Edit unless it changes. */
export const oidcProviderSchema = z.object({
  name: nameField,
  issuer: urlField(
    'Enter the issuer URL.',
    'Enter a valid URL, e.g. https://acme.okta.com.',
    /^https?$/,
  ),
  clientId: z.string().trim().min(1, 'Enter the client id.'),
  clientSecret: z.string().trim().min(1, 'Enter the client secret.'),
  scopes: z.array(z.string().trim().min(1)),
  groupClaim: z.string().trim(),
  autoCreateUsers: z.boolean(),
})

export type OidcProviderValues = z.infer<typeof oidcProviderSchema>

/** What Edit submits: `clientSecret` only when a new one was typed (absent keeps the current one). */
export type OidcProviderEditValues = Omit<OidcProviderValues, 'clientSecret'> & {
  clientSecret?: string
}

/** `oidcProviderSchema` for Edit: the secret may stay blank, and then leaves the values. */
export const oidcProviderEditSchema = oidcProviderSchema
  .extend({ clientSecret: z.string().trim() })
  .transform(({ clientSecret, ...values }): OidcProviderEditValues =>
    clientSecret === '' ? values : { ...values, clientSecret },
  )

/** The Add provider form's starting values. */
export const oidcProviderDefaults: OidcProviderValues = {
  name: '',
  issuer: '',
  clientId: '',
  clientSecret: '',
  scopes: ['openid', 'profile', 'email', 'groups'],
  groupClaim: 'groups',
  autoCreateUsers: true,
}

const portMessage = 'Use a port from 1 to 65535.'

export const accessSettingsSchema = z
  .object({
    passwordSignIn: z.boolean(),
    requireMfaForAdmins: z.boolean(),
    accessTokenMinutes: z.literal([15, 30, 60, 120], 'Choose a lifetime.'),
    refreshTokenDays: z.literal([7, 30, 90], 'Choose a lifetime.'),
    idleTimeoutHours: z.literal([1, 8, 24], 'Choose a timeout.'),
    serviceTokenMaxDays: z.literal([30, 90, 365], 'Choose a lifetime.'),
    requireVerifiedEmail: z.boolean(),
    smtp: z.object({
      host: z.string().trim(),
      port: z
        .number('Enter a port number.')
        .int('Use a whole number.')
        .min(1, portMessage)
        .max(65535, portMessage),
      username: z.string().trim(),
      password: z.string(),
      from: z.string().trim(),
    }),
  })
  .refine((values) => !values.requireVerifiedEmail || values.smtp.from !== '', {
    path: ['smtp', 'from'],
    error: 'Enter the address emails come from.',
    // Zod skips refinements once a field fails to parse (an empty port, say); this one only reads
    // two fields that always parse, so it runs anyway and both messages show at once.
    when: () => true,
  }) satisfies z.ZodType<AccessSettingsValues>
