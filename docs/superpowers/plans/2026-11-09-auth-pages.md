# Auth Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `AuthLayout` and four presentational auth pages (Sign in, Create account, Reset password, Complete profile) in `@kemo/ui`, in the chosen "Nightfall" look, and wire the preview routes to them with mock behaviour.

**Architecture:** A shell component renders the gradient page and a permanently open, non-modal, forced-dark Park `Drawer` with fixed slots (logo, brand, title, description, form, extras, footer). Four page components compose the shell with react-hook-form + zod forms and inject every behaviour through props. The preview app's auth routes become thin client wrappers over the real pages with a mock auth module.

**Tech Stack:** React 19, Panda CSS 2.5 (`@kemo/ui` design system), Park UI / Ark UI 5 (Drawer, Field, Input, PasswordInput, Checkbox, Button, Alert, Heading, Text, Link), react-hook-form 7.91 + zod 4.6 + `@hookform/resolvers`, Vitest + Testing Library, Next.js 16 preview, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-auth-pages-design.md`

## Global Constraints

- Gradient token value, verbatim: `linear-gradient(115deg, rgba(255,255,255,.06) 0%, rgba(255,255,255,0) 28%), linear-gradient(135deg, #4a0f26 0%, #5d1f7e 48%, #140b2a 100%)` as `tokens.gradients.auth`; consumed with Panda's gradient utility (`bgGradient: 'auth'`), never `bgImage`.
- Drawer: Park `Drawer`, `placement="start"`, `size="lg"` on desktop and `full` below `md`; props `open`, `modal={false}`, `closeOnEscape={false}`, `closeOnInteractOutside={false}`, `lazyMount={false}`, `unmountOnExit={false}`; no `Trigger`, `Backdrop`, `CloseTrigger`. Forced dark via `className="dark"` on `Drawer.Positioner` (Park's `_dark` is `.dark &`, a descendant selector). Positioner `pointerEvents: 'none'`, Content `pointerEvents: 'auto'`.
- Spacing: `gap="12"` (3rem) after the header row, `gap="8"` (2rem) after the title/description block; footer `marginTop: 'auto'`.
- Copy and validation messages exactly as the spec's "Page components" and "Validation" sections (quoted again in each task).
- Inside `packages/ui/src`: relative `styled-system` imports only (`../../../styled-system/...` from `src/pages/auth/`); no `~/`; no hand edits to synced Park files; Park components only plus `styled`/patterns from the generated `styled-system/jsx`.
- All page components and `AuthLayout` start with `'use client'`. Preview route files stay Server Components that render a client wrapper.
- Prettier `semi: false, singleQuote: true, printWidth: 100, trailingComma: 'all'`; root `pnpm lint` has `--max-warnings 0`; Panda ESLint plugin active (tokens only; no dynamic styling; the gradient string lives only in the token file).
- Every task ends green on: `pnpm --filter @kemo/ui lib`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`. Preview tasks also: `pnpm build` and `pnpm test:e2e` (sandbox disabled for build/e2e; a user `next dev` may hold :3000, so run Playwright against a production build on another port with a scratch config outside the repo).
- One commit per task on `main`, conventional messages as given.

## Review Focus

1. Host in light theme: the drawer must still render dark (text light on dark glass). Pinned in Task 7 e2e `auth drawer stays dark in a light host theme`.
2. Keyboard user on Sign in: Tab order is identifier → password → show/hide → Sign in → provider buttons → links; Escape does nothing. Pinned in Task 7 e2e `escape does not dismiss the auth drawer` and Task 3 unit test on focus order.
3. Submit while already submitting (double click): `onSubmit` is called once and the button is disabled. Pinned in Task 3 unit test `disables the button while submitting`.
4. A host passes `error` and the user edits a field: the alert stays until the host clears it (spec: host-driven), and field errors re-validate on change after the first submit. Pinned in Task 3 unit test `re-validates a field on change after first submit`.
5. Narrow viewport (375px): the drawer takes the full width and the form is reachable without horizontal scroll. Pinned in Task 7 e2e `auth drawer fills a narrow viewport`.

---

### Task 1: Gradient token and `AuthLayout`

**Files:**

- Create: `packages/ui/src/theme/tokens/gradients.ts`, `packages/ui/src/pages/auth/auth-layout.tsx`, `packages/ui/src/pages/auth/types.ts`, `packages/ui/src/pages/auth/index.ts`
- Modify: `packages/ui/panda.config.ts` (add `gradients` to `theme.extend.tokens`), `packages/ui/src/index.ts` (add `export * from './pages/auth'`), `packages/ui/src/theme/theme.test.ts`
- Test: `packages/ui/src/pages/auth/auth-layout.test.tsx`

**Interfaces:**

- Produces `gradients` (`defineTokens.gradients({ auth: { value: '<verbatim string>' } })`).
- Produces in `types.ts`: `export type LinkComponent = ComponentType<{ href: string; className?: string; children: ReactNode }>`; `export interface AuthProvider { id: string; label: string; icon?: ReactNode; onSelect: () => void }`; `export interface AuthShellProps { logo?: ReactNode; brand: string; footer?: ReactNode; linkComponent?: LinkComponent }`.
- Produces `AuthLayout(props: AuthLayoutProps)` where `AuthLayoutProps = AuthShellProps & { title: string; description?: string; children: ReactNode; extras?: ReactNode }`. Renders: `GradientBackdrop` (`styled('div')` with `position: 'fixed', inset: 0, bgGradient: 'auth'`), then `Drawer.Root` (props per Global Constraints) → `Drawer.Positioner className="dark" pointerEvents="none"` → `Drawer.Content pointerEvents="auto"` with glass styling (`bg: 'black.a9'`, `backdropFilter: 'auto'`, `backdropBlur: 'xl'`, `borderInlineEndWidth: '1px'`, `borderColor: 'white.a3'`, `color: 'fg.default'`) containing one `Stack` (`h: 'full'`, `px: '8'`, `py: '7'`): header row (`HStack`: logo slot + `Text textStyle="sm" color="fg.muted"` brand), spacer `12`, title block (`Drawer.Title asChild` → `Heading as="h1" textStyle="xl" fontWeight="semibold" letterSpacing="tight"`; `Drawer.Description asChild` → `Text color="fg.muted"` when `description`), spacer `8`, `children`, `extras` (when present, `mt: '4'`), footer (`marginTop: 'auto'`, `Text textStyle="xs" color="fg.subtle"`). Sizes: `size={{ base: 'full', md: 'lg' }}` if the recipe accepts responsive variants; otherwise `size="lg"` plus a `md`-breakpoint `maxW` override on Content.
- Produces `index.ts` re-exporting `AuthLayout`, types, and (later tasks) the pages and schemas.

- [ ] **Step 1: Write the failing tests.** In `theme.test.ts` add: `expect(token('gradients.auth')).toContain('linear-gradient(135deg, #4a0f26 0%')`. In `auth-layout.test.tsx`:

```tsx
it('renders slots in order with the title as the h1', () => {
  render(
    <AuthLayout
      logo={<span data-testid="logo" />}
      brand="Acme Console"
      title="Sign in"
      description="Sign in to continue."
      extras={<a href="/x">extra</a>}
      footer={<span>© 2026 Acme</span>}
    >
      <input aria-label="form" />
    </AuthLayout>,
  )
  const order = [
    screen.getByTestId('logo'),
    screen.getByText('Acme Console'),
    screen.getByRole('heading', { level: 1, name: 'Sign in' }),
    screen.getByText('Sign in to continue.'),
    screen.getByLabelText('form'),
    screen.getByText('extra'),
    screen.getByText('© 2026 Acme'),
  ]
  for (let i = 1; i < order.length; i++)
    expect(
      order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
})
it('is a non-modal dialog with no close affordance', () => {
  render(
    <AuthLayout brand="Acme" title="Sign in">
      <input aria-label="form" />
    </AuthLayout>,
  )
  const dialog = screen.getByRole('dialog', { name: 'Sign in' })
  expect(dialog).not.toHaveAttribute('aria-modal', 'true')
  expect(screen.queryByRole('button', { name: /close/i })).toBeNull()
})
```

- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui test`. Expected: FAIL (token missing; module not found).
- [ ] **Step 3: Implement** `gradients.ts`, wire it into `panda.config.ts`, write `types.ts`, `auth-layout.tsx`, `index.ts`, the `src/index.ts` export. Keep `AuthLayout` free of form logic.
- [ ] **Step 4: Generate and test.** Run: `pnpm --filter @kemo/ui lib && pnpm --filter @kemo/ui test`. Expected: PASS; `panda codegen` reports no unknown-token diagnostic for `bgGradient: 'auth'` (if it does, switch to `background: 'token(gradients.auth)'` and note it in the report).
- [ ] **Step 5: Checks.** Run: `pnpm typecheck && pnpm lint && pnpm format:check`. Expected: exit 0.
- [ ] **Step 6: Commit** `feat(ui): add AuthLayout shell with Nightfall gradient token`.

---

### Task 2: Shared form pieces

**Files:**

- Create: `packages/ui/src/pages/auth/form-alert.tsx`, `text-field.tsx`, `password-field.tsx`, `provider-buttons.tsx`, `auth-link.tsx`
- Modify: `packages/ui/src/pages/auth/index.ts` (export `ProviderButtons`, `AuthLink`; the field pieces stay internal)
- Test: `packages/ui/src/pages/auth/form-pieces.test.tsx`

**Interfaces:**

- `FormAlert({ message }: { message?: string | null })` → renders nothing when empty; otherwise `Alert.Root status="error"` with `Alert.Indicator`, `Alert.Content`, `Alert.Description` = message, `role="alert"`.
- `TextField(props: { label: string; error?: string; helperText?: string; readOnly?: boolean; required?: boolean } & ComponentProps<typeof Input>)` → `Field.Root invalid={!!error} readOnly required` + `Field.Label` + `Input` (spread rest, incl. RHF `register()` output) + `Field.HelperText` + `Field.ErrorText`.
- `PasswordField` same shape over `PasswordInput`.
- `ProviderButtons({ providers, verb }: { providers?: AuthProvider[]; verb: 'Continue' | 'Sign up' })` → one `Button variant="subtle" width="full"` per provider, text `${verb} with ${label}`, `icon` or a neutral circle (`styled('span')` 14px round `bg: 'fg.default'`) leading; renders nothing for an empty list.
- `AuthLink({ href, linkComponent, children }: { href: string; linkComponent?: LinkComponent; children: ReactNode })` → Park `Link`; when `linkComponent` is given renders `<Link asChild><LinkComponent href>…</LinkComponent></Link>`.

- [ ] **Step 1: Write the failing tests**: `FormAlert` renders nothing for `null` and an alert with the message otherwise; `TextField` with `error="Enter your email."` sets `aria-invalid="true"` on the textbox and shows the text; `readOnly` makes the textbox read-only; `ProviderButtons` renders "Continue with GitHub" and calls `onSelect` on click, renders nothing for `[]`; `AuthLink` with a custom `linkComponent` renders that component's element with the href.
- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run form-pieces`. Expected: FAIL.
- [ ] **Step 3: Implement** the five files per Interfaces.
- [ ] **Step 4: Test and checks.** Run: `pnpm --filter @kemo/ui lib && pnpm test && pnpm typecheck && pnpm lint && pnpm format:check`. Expected: PASS / exit 0.
- [ ] **Step 5: Commit** `feat(ui): add shared auth form pieces`.

---

### Task 3: `SignInPage`

**Files:**

- Create: `packages/ui/src/pages/auth/schemas.ts` (start with `signInSchema`), `packages/ui/src/pages/auth/sign-in-page.tsx`
- Modify: `index.ts` (export `SignInPage`, `signInSchema`, `SignInValues`)
- Test: `packages/ui/src/pages/auth/sign-in-page.test.tsx`

**Interfaces:**

- `signInSchema = z.object({ identifier: z.string().min(1, 'Enter your email or username.'), password: z.string().min(1, 'Enter your password.') })`; `SignInValues = z.infer<typeof signInSchema>`.
- `SignInPage(props: AuthShellProps & { onSubmit: (values: SignInValues) => void | Promise<void>; isSubmitting?: boolean; error?: string | null; providers?: AuthProvider[]; links: { register: string; forgotPassword: string } })`. Form via `useForm<SignInValues>({ resolver: zodResolver(signInSchema), mode: 'onSubmit', reValidateMode: 'onChange' })`. Layout: `AuthLayout` with `title="Welcome back"`, `description="Sign in to continue."`; body: `FormAlert`, `TextField label="Email or username" autoComplete="username"`, `PasswordField label="Password" autoComplete="current-password"`, `Button type="submit" width="full" loading={submitting}` "Sign in" (`submitting = isSubmitting ?? formState.isSubmitting`); extras: `ProviderButtons verb="Continue"`, then `Text`: "New here? " + `AuthLink` "Create an account", and `AuthLink` "Forgot your password?".

- [ ] **Step 1: Write the failing tests** (`@testing-library/user-event`):
  - `shows field errors on empty submit`: click "Sign in" → both messages visible; `onSubmit` not called.
  - `submits typed values`: type `ken`, `hunter2hunter2`, click → `onSubmit` called with `{ identifier: 'ken', password: 'hunter2hunter2' }`.
  - `shows the host error and keeps it while editing`: `error="Something went wrong. Try again."` → `getByRole('alert')` has the text; after typing into the identifier field the alert is still present (the host clears it, not the form).
  - `disables the button while submitting`: `onSubmit` returns a pending promise; after one click the button is disabled and a second click does not call `onSubmit` again (call count 1).
  - `re-validates a field on change after first submit`: empty submit → error; type into identifier → its error disappears while the password error stays.
  - `renders providers and links`: with `providers=[{ id: 'github', label: 'GitHub', onSelect }]`, "Continue with GitHub" present and clickable; links have `href` `/register` and `/forgot-password`.
  - `tab order`: identifier → password → show-password button → Sign in (use `userEvent.tab()` and `toHaveFocus`).
- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run sign-in`. Expected: FAIL.
- [ ] **Step 3: Implement** `schemas.ts` (sign-in part) and `sign-in-page.tsx` per Interfaces.
- [ ] **Step 4: Test and checks.** Run: `pnpm --filter @kemo/ui lib && pnpm test && pnpm typecheck && pnpm lint && pnpm format:check`. Expected: PASS / exit 0, test output pristine (no `act()` warnings).
- [ ] **Step 5: Commit** `feat(ui): add SignInPage`.

---

### Task 4: `RegisterPage`

**Files:**

- Modify: `schemas.ts` (add `registerSchema`), `index.ts`
- Create: `packages/ui/src/pages/auth/register-page.tsx`
- Test: `packages/ui/src/pages/auth/register-page.test.tsx`

**Interfaces:**

- `registerSchema = z.object({ firstName: z.string().min(1, 'Enter your first name.').max(64), lastName: z.string().min(1, 'Enter your last name.').max(64), username: z.string().min(3, 'Use 3 to 32 characters.').max(32, 'Use 3 to 32 characters.').regex(/^[A-Za-z0-9-]+$/, 'Letters, numbers and dashes only.'), email: z.email('Enter a valid email address.'), password: z.string().min(12, 'Use at least 12 characters.'), confirmPassword: z.string(), acceptTerms: z.boolean().refine((v) => v, 'You need to agree to continue.') }).refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: "Passwords don't match." })`; `RegisterValues`.
- `RegisterPage(props: AuthShellProps & { onSubmit; isSubmitting?; error?; providers?; links: { signIn: string; terms: string; privacy: string } })`. Title "Create your account" (no description). Body: `FormAlert`; `HStack` of First name / Last name; Username; Email (`autoComplete="email"`); `HStack` of Password (`autoComplete="new-password"`, placeholder "At least 12 characters") / Confirm password; `Checkbox.Root` with `Checkbox.HiddenInput` registered as `acceptTerms`, label "I agree to the " `AuthLink` "Terms of Service" " and " `AuthLink` "Privacy Policy" "."; `Field.ErrorText`-style error under it; `Button` "Create account". Extras: `ProviderButtons verb="Sign up"`, `Text` "Already have an account? " + `AuthLink` "Sign in".

- [ ] **Step 1: Write the failing tests**: empty submit shows seven required/agree messages (assert the terms message and the first-name message at least, plus `onSubmit` not called); mismatch `password`/`confirmPassword` shows "Passwords don't match."; short username shows "Use 3 to 32 characters."; `user_name` shows "Letters, numbers and dashes only."; valid submit calls `onSubmit` with all seven values (`acceptTerms: true`); links `signIn`, `terms`, `privacy` have their hrefs.
- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run register`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Test and checks** (same commands as Task 3). Expected: PASS / exit 0.
- [ ] **Step 5: Commit** `feat(ui): add RegisterPage`.

---

### Task 5: `ForgotPasswordPage`

**Files:**

- Modify: `schemas.ts` (add `forgotPasswordSchema = z.object({ email: z.email('Enter a valid email address.') })`), `index.ts`
- Create: `packages/ui/src/pages/auth/forgot-password-page.tsx`
- Test: `packages/ui/src/pages/auth/forgot-password-page.test.tsx`

**Interfaces:**

- `ForgotPasswordPage(props: AuthShellProps & { onSubmit: (values: ForgotPasswordValues) => void | Promise<void>; isSubmitting?; error?; sent?: boolean; links: { signIn: string } })`. Internal `sentEmail` state set after `onSubmit` resolves without throwing; `const showSent = sent ?? sentEmail !== null`. Form state: title "Reset your password", description "Enter your email and we'll send you a link to choose a new one.", `TextField label="Email" autoComplete="email"`, `Button` "Send reset link". Sent state: title "Check your email", body `Text` "If an account exists for {email}, a reset link is on its way." (email = submitted value, or "that address" when `sent` is forced without a submission). Extras in both states: `AuthLink` "Back to sign in".

- [ ] **Step 1: Write the failing tests**: invalid email shows the message; valid submit calls `onSubmit` with `{ email }` and then shows "Check your email" and the sentence containing the email; a rejected `onSubmit` keeps the form (host shows `error`); `sent` prop true renders the sent state without a submission; both states have the "Back to sign in" link with `links.signIn`.
- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run forgot-password`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Test and checks.** Expected: PASS / exit 0.
- [ ] **Step 5: Commit** `feat(ui): add ForgotPasswordPage`.

---

### Task 6: `CompleteProfilePage`

**Files:**

- Modify: `schemas.ts` (add `completeProfileSchema = z.object({ username, firstName, lastName })` reusing the register rules), `index.ts`
- Create: `packages/ui/src/pages/auth/complete-profile-page.tsx`
- Test: `packages/ui/src/pages/auth/complete-profile-page.test.tsx`

**Interfaces:**

- `CompleteProfilePage(props: AuthShellProps & { identity: { provider: string; email: string }; defaultValues?: Partial<CompleteProfileValues>; onSubmit; isSubmitting?; error?; onSignOut: () => void })`. Title "Complete your profile", description "A few details are missing before you can continue.". Body: identity chip (`styled('span')` subtle pill: neutral dot + "Signed in with {provider} as {email}"), `FormAlert`, `TextField label="Email" readOnly value={identity.email} helperText="Provided by your identity provider."`, `TextField label="Username"` (placeholder "Choose a username", helper "Letters, numbers and dashes only." shown as helper until an error replaces it), `HStack` First name / Last name, `Button` "Finish and continue". Extras: `Button variant="plain"`-styled link text "Sign out" (`onClick={onSignOut}`) followed by " and use a different account".

- [ ] **Step 1: Write the failing tests**: chip text "Signed in with Keycloak as ken@acme.com"; email textbox is read-only with that value; empty submit shows the username message and name messages; valid submit calls `onSubmit` with `{ username, firstName, lastName }` only; "Sign out" calls `onSignOut`; `defaultValues={{ lastName: 'Moini' }}` prefills.
- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run complete-profile`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Test and checks.** Expected: PASS / exit 0.
- [ ] **Step 5: Commit** `feat(ui): add CompleteProfilePage`.

---

### Task 7: Preview wiring and e2e

**Files:**

- Create: `apps/preview/src/lib/mock-auth.ts`, `apps/preview/src/components/brand-mark.tsx`, `apps/preview/src/components/auth/{sign-in,register,forgot-password,complete-profile}-demo.tsx` (client wrappers)
- Modify: `apps/preview/src/app/(auth)/layout.tsx` (passthrough: `return children`), the four `(auth)/*/page.tsx` (keep `metadata`, render the demo), `apps/preview/src/components/preview-panel.tsx` (trigger `zIndex="toast"`), `apps/preview/e2e/smoke.spec.ts`, `README.md` (Roadmap item done; a "Auth pages" paragraph under Repo layout / consuming)
- Test: `apps/preview/e2e/smoke.spec.ts`

**Interfaces:**

- `mock-auth.ts`: `export const mockDelayMs = 600`; `export async function mockSubmit(values: { identifier?: string; email?: string }): Promise<void>` → waits, rejects with `new Error('Something went wrong. Try again.')` when the identifier/email starts with `fail`; `export const mockProviders: AuthProvider[]` = `[{ id: 'sso', label: 'single sign-on', onSelect: () => console.info('provider: sso') }, { id: 'github', label: 'GitHub', onSelect: () => console.info('provider: github') }]`; `export const authLinks = { signIn: '/login', register: '/register', forgotPassword: '/forgot-password', terms: '#', privacy: '#' }`; `export const brand = 'Acme Console'`; `export const footer` = fragment "© 2026 Acme" / "v1.4.2".
- `BrandMark()`: 24px inline SVG neutral square with rounded 2px corners and a white "A".
- Each demo: `'use client'`, holds `error` state, passes `onSubmit` wrapping `mockSubmit` (sets `error` on reject, clears on start), `isSubmitting` from local state, `providers`, `links`, `logo={<BrandMark />}`, `brand`, `footer`, and `linkComponent={NextLink}` (from `next/link`). Complete profile: `identity={{ provider: 'Keycloak', email: 'ken@acme.com' }}`, `defaultValues={{ lastName: 'Moini' }}`, `onSignOut` → `console.info('sign out')`.

- [ ] **Step 1: Write the failing e2e tests** (existing `routes` loop keeps covering the four `h1`s and zero console errors; `console.info` is not an error):
  - `auth drawer stays dark in a light host theme`: goto `/login`; `html` has no `dark` class; computed `color` of the `h1` is light (parse rgb, luminance > 0.7) and the dialog's computed `background-color` has alpha < 1 or is dark.
  - `escape does not dismiss the auth drawer`: goto `/login`, press Escape, dialog still visible.
  - `sign in validates and shows the mock error`: click "Sign in" → both field messages; fill `fail@x`, `hunter2hunter2`, click → alert "Something went wrong. Try again.".
  - `register flags a password mismatch`: fill the two passwords differently, submit → "Passwords don't match.".
  - `forgot password shows the sent state`: fill a valid email, submit → heading "Check your email".
  - `complete profile keeps the provider email read-only`: textbox "Email" has `readonly` and value `ken@acme.com`.
  - `preview panel opens from an auth route`: on `/login` click `preview-panel-trigger` → dialog named "Preview" visible → Escape closes it while the auth drawer stays.
  - `auth drawer fills a narrow viewport`: `page.setViewportSize({ width: 375, height: 812 })`, goto `/register`, the dialog's bounding box width equals 375 and `document.documentElement.scrollWidth` equals 375.
- [ ] **Step 2: Run to see them fail.** Run: `pnpm build && <playwright with scratch config on :3100>`. Expected: new tests FAIL (stubs still rendered).
- [ ] **Step 3: Implement** the wiring files per Interfaces; `(auth)/layout.tsx` passthrough; panel trigger z-index; README paragraph.
- [ ] **Step 4: Spike check for forced dark** (spec's first implementation step): with the host in light mode, confirm the drawer's computed text color is light. If it is not, add `conditions.extend.light` in `packages/ui/panda.config.ts` (our file) so `:root &` excludes `.dark` subtrees (e.g. `':root &:not(.dark *), .light &'`), re-run `pnpm --filter @kemo/ui lib`, and record the outcome in the report.
- [ ] **Step 5: Run everything.** Run: `pnpm --filter @kemo/ui lib && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build` then the e2e (21 tests: 13 existing + 8 new). Expected: all exit 0, e2e all pass, zero console errors on every route.
- [ ] **Step 6: Commit** `feat(preview): render the auth pages with mock handlers`.

---

### Task 8: Final verification

- [ ] **Step 1:** Run `make check && make e2e && make container-build` (sandbox disabled). Expected: exit 0 each.
- [ ] **Step 2:** `git status --porcelain` empty; `git log --oneline` shows one commit per task (plus review fix commits).
