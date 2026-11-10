# Design: auth pages (Sign in, Create account, Reset password, Complete profile)

Date: 2026-11-09. Status: approved in chat after a visual brainstorm (direction "Nightfall").
Builds on: `docs/superpowers/specs/2026-11-09-design-system-scaffold-design.md` (the scaffold, tooling and theme rules).

## Intent

`@kemo/ui` must ship ready-made auth pages that a consuming application drops in: its auth logic sends people
to Sign in, Create account, Reset password, or Complete profile, and the pages handle layout, forms, validation,
and states while the app supplies the behaviour (what happens on submit, which identity providers exist, where
the links go). The preview app shows the four pages working with mock behaviour.

## The look (chosen: Nightfall)

- **Page**: blank, full viewport, a dark gradient from wine-red through purple into indigo along the diagonal,
  with one soft light streak. Exact value (the only new theme token, `gradients.auth`):
  `linear-gradient(115deg, rgba(255,255,255,.06) 0%, rgba(255,255,255,0) 28%), linear-gradient(135deg, #4a0f26 0%, #5d1f7e 48%, #140b2a 100%)`.
- **Drawer**: Park UI `Drawer`, left side (`placement="start"`), always open, dark glass over the gradient
  (translucent near-black with a backdrop blur, 1px right border in white alpha). The drawer is always in dark
  color mode regardless of the host theme (Park's `.dark` class on the drawer subtree). Width `lg` (32rem) on
  desktop; full width below the `md` breakpoint.
- **Drawer contents, top to bottom**: header row (optional logo slot + brand text), then **3rem** of space; the
  heading and optional subheading, then **2rem** of space; the form body; the extras directly beneath the form
  (single sign-on buttons, register / forgot links); the footer pinned to the bottom.
- **Type and controls**: DM Sans; heading `Heading` size `xl`-ish semibold with slightly tight tracking; labels
  above fields; inputs `Input`/`PasswordInput` size `md`, `outline` variant; the primary action is `Button`
  `solid` (white on dark); single sign-on buttons are `Button` `subtle` with a leading icon slot; links are
  Park `Link`; footer text `Text` size `xs` muted. XS radii throughout (Park defaults).
- **Motion**: none on load. Respect reduced motion (nothing to disable).

## Goals

- `AuthLayout` shell and four page components in `packages/ui`, exported from `@kemo/ui`.
- Presentational: all behaviour injected by props; nothing fetches or navigates on its own.
- Each page validates its form with zod via react-hook-form and shows specific, plain-language messages.
- Preview routes `/login`, `/register`, `/forgot-password`, `/complete-profile` render the real pages with mock
  handlers (fake delay, a deliberate failure path, two fake providers).
- Unit tests for validation and submit contracts; e2e smoke for each route.

## Non-goals

- Real authentication, session handling, routing, or provider SDKs.
- A theme switch for the auth pages (they are always dark).
- Localization (copy is English; strings are props where a host would reasonably change them).

## Anti-goals

- A close button, trigger, backdrop, or any way to dismiss the drawer. It is the page.
- Hard-coded colors or spacing outside tokens (except the gradient token's own value).
- Hand edits to synced Park UI files.

## Constraints (inherited from the scaffold spec)

- Park UI components and recipes only, synced through `scripts/park-ui/sync.mjs`; relative `styled-system`
  imports inside `packages/ui/src`; no `staticCss`/`prefix` in the library config.
- Prettier `semi: false, singleQuote: true, printWidth: 100, trailingComma: 'all'`; root lint fails on warnings.
- Server Components by default in the preview; the pages themselves are client components (forms).
- The `--font-dm-sans` contract stays; the preview sets it with `next/font`.

## Decisions

### `AuthLayout`

Props: `logo?: ReactNode`, `brand: string`, `title: string`, `description?: string`, `children` (form body),
`extras?: ReactNode`, `footer?: ReactNode`. Renders the gradient page (`GradientBackdrop`, a styled `div`
using the `gradients.auth` token through Panda's gradient utility, e.g. `bgGradient: 'auth'`; verify the
generated CSS, since `bgImage` reads the `assets` token group, not `gradients`) and the Drawer with `open`, `modal={false}`, `closeOnEscape={false}`,
`closeOnInteractOutside={false}`, `lazyMount={false}`, `unmountOnExit={false}`, no `Trigger`, `Backdrop` or
`CloseTrigger`. `Drawer.Title` renders the page title as an `h1` (`asChild` onto `Heading as="h1"`, so the dialog keeps its
accessible name and each page has one `h1`); `Drawer.Description` renders the subheading when present. Inside
`Drawer.Content` use one vertical `Stack` with the layout's own spacing rather than Park's `Drawer.Header` /
`Drawer.Body` / `Drawer.Footer` slots (their padding and `alignItems` defaults fight the 3rem/2rem rules and the
pinned footer). The spacing rules above live here, once. The footer uses `marginTop: auto`.

### Page components (all client components)

Shared props: `onSubmit(values) => void | Promise<void>`, `isSubmitting?: boolean`, `error?: string | null`
(rendered as an `Alert` with error status at the top of the form body), `providers?: { id: string; label: string;
icon?: ReactNode; onSelect: () => void }[]`, `links` (page-specific hrefs below), `linkComponent?` (defaults to
`Link`; a host can pass Next's `Link`-compatible component), and the layout slots `logo`, `brand`, `footer`.

- `SignInPage`: fields `identifier` (label "Email or username"), `password`; button "Sign in"; extras: one
  `subtle` button per provider ("Continue with {label}"), then "New here? Create an account" and "Forgot your
  password?"; links `{ register, forgotPassword }`.
- `RegisterPage`: fields `firstName`, `lastName` (one row), `username`, `email`, `password`, `confirmPassword`
  (one row), `acceptTerms` (checkbox: "I agree to the Terms of Service and Privacy Policy", with `links.terms`
  and `links.privacy`); button "Create account"; extras: providers ("Sign up with {label}") and "Already have an
  account? Sign in"; links `{ signIn, terms, privacy }`.
- `ForgotPasswordPage`: field `email`; description "Enter your email and we'll send you a link to choose a new
  one."; button "Send reset link"; extras: "Back to sign in"; links `{ signIn }`. After `onSubmit` resolves, the
  form body is replaced by a success state: title "Check your email", text "If an account exists for {email},
  a reset link is on its way.", extras keep "Back to sign in". Prop `sent?: boolean` lets a host control it.
- `CompleteProfilePage`: props `identity: { provider: string; email: string }`, `defaultValues?: Partial<…>`;
  renders a chip "Signed in with {provider} as {email}"; fields `email` (read-only, helper "Provided by your
  identity provider."), `username`, `firstName`, `lastName` (one row); button "Finish and continue"; extras:
  "Sign out and use a different account" (`onSignOut`).

### Validation (zod schemas exported alongside the pages)

- identifier/email: required; email must be a valid address ("Enter a valid email address.").
- password: required; register requires at least 12 characters ("Use at least 12 characters.").
- confirmPassword: must match ("Passwords don't match.").
- username: required; 3–32 chars, letters, numbers, dashes ("Letters, numbers and dashes only.").
- names: required, 1–64 chars.
- acceptTerms: must be true ("You need to agree to continue.").
- Messages show under the field via `Field.ErrorText`; validation runs on submit, then on change for touched
  fields.

### Preview wiring

Each route is a thin client page passing mock handlers from `src/lib/mock-auth.ts`: resolve after 600 ms;
reject with "Something went wrong. Try again." when the identifier/email starts with `fail`; providers
`[{ id: 'sso', label: 'single sign-on' }, { id: 'github', label: 'GitHub' }]` that `console.info` on select;
links to the sibling routes; logo = the existing square mark; brand "Acme Console"; footer "© 2026 Acme" and
"v1.4.2". The floating preview panel stays available.

### Tests

- Vitest (packages/ui): per page, required-field errors appear on empty submit; a valid submit calls `onSubmit`
  with the typed values; `error` renders in the alert; register mismatch and terms errors; forgot success state;
  complete-profile email is read-only. `AuthLayout` renders slots in order and the dialog is non-modal.
- Playwright (preview): each route renders its `h1` inside the drawer with zero console errors; sign-in empty
  submit shows two field errors; register mismatch shows the message; forgot submit shows "Check your email".

## Calls made after the builder check (check these while reading)

- **Preview panel on the auth routes**: it stays usable. The auth drawer's Positioner covers the viewport at
  `zIndex: modal`; give it `pointerEvents: none` (Content back to `auto`) and lift the floating trigger above
  `modal` (e.g. `zIndex: 'toast'`). An e2e test opens the panel from `/login`.
- **Logo**: no mark exists in the preview yet; the preview adds a small neutral inline SVG mark component and
  passes it through the `logo` slot.
- **Preview `(auth)/layout.tsx`** becomes a passthrough; `AuthLayout` owns the viewport.
- **Forgot password `sent`**: internal state flips after `onSubmit` resolves; when the `sent` prop is defined it
  takes precedence; the success copy uses the submitted email.
- **`isSubmitting`** falls back to react-hook-form's `formState.isSubmitting` when not passed; `error` is purely
  prop-driven (the host clears it).
- **Forced dark drawer**: Park documents forcing a subtree with `className="dark"`. Because Park's `light`
  condition is `':root &, .light &'`, the first implementation step is a spike in the preview with the host in
  light mode, checking computed drawer colors; if the `_light`/`_dark` tie resolves the wrong way, adjust the
  `light` condition in our own theme file (never the synced one) to exclude `.dark` subtrees.
- **Gradient token** is a string-valued `tokens.gradients.auth` consumed via Panda's gradient utility (see
  `AuthLayout`), not `bgImage`.

## Left to the builder

- Exact Panda values for the glass surface (which `black.a*` alpha and blur token) and the drawer padding scale.
- Icon treatment for providers when no `icon` is passed (a neutral circle is fine).
- How the "adjust on change after first submit" validation mode is configured in react-hook-form.
- File layout under `packages/ui/src/pages/auth/` and the barrel export.
- Responsive details below `md` beyond "drawer takes full width".
