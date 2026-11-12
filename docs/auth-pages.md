# Auth pages

`@kemo/ui` exports `SignInPage`, `RegisterPage`, `ForgotPasswordPage` and `CompleteProfilePage`
(client components), the `AuthLayout` shell they share, and their zod schemas. Each page is a
full-viewport gradient with an always-open drawer on the start side that stays in dark mode whatever
the host theme; it has no close button and Escape does not dismiss it.

The pages are presentational: they validate their form and call `onSubmit(values)`, and the host
does the rest, passing back `error` and `isSubmitting` and supplying `brand`, `logo`, `footer`,
`links` (hrefs) and, on sign in and register, single sign-on `providers`
(`{ id, label, icon?, onSelect }`; the icon is decorative and hidden from assistive technology).

Every page follows one submit contract: `onSubmit` may resolve or reject; a rejection keeps the
form, is passed to the optional `onSubmitError(error)`, and the page shows whatever you pass as
`error`. A rejection never escapes as an unhandled promise rejection, so a handler such as
`async (values) => { await signIn(values) }` can simply throw on bad credentials; set `error` from
`onSubmitError` (or catch inside `onSubmit`). `error` stays on screen until you change it. While
`onSubmit` is pending the submit button shows a spinner and ignores clicks; `isSubmitting`
overrides that state when you track it yourself.

Page-specific props are typed in `packages/ui/src/pages/auth/*-page.tsx`:

- `ForgotPasswordPage` shows its "Check your email" state once `onSubmit` resolves; a rejection
  keeps the form. `sent` forces the confirmation state on or off instead.
- `CompleteProfilePage` takes `identity` (`{ provider, email }`, shown in a chip and as the
  read-only Email field), optional `defaultValues` to prefill the username and names, and
  `onSignOut`, called by its "Sign out" button. It renders no links, so it accepts `linkComponent`
  only for symmetry with the other pages.

Hosting notes:

- The pages use the `fonts.body` token, so they need DM Sans as described in step 6 of
  [Consuming @kemo/ui from another app](consuming.md) (`--font-dm-sans`).
- Links render as Park's `Link` with a plain `href`. Pass the router's link as `linkComponent` for
  client-side navigation; in Next.js that is `linkComponent={NextLink}` (`next/link`). It receives
  `href`, `className` and `children`.
- On load the drawer focuses the element marked `data-autofocus`, which on every page is the first
  field. Without one (an `AuthLayout` you fill yourself) it focuses the first tabbable element, so
  give a linked logo `data-no-autofocus` to keep focus off it. When a page changes state (the sent
  state), focus moves to the new heading.

The preview wires each page to mock handlers: the route files in `apps/preview/src/app/(auth)`
render client demos from `apps/preview/src/components/auth/*-demo.tsx`, which use the mock data in
`apps/preview/src/lib/mock-auth.ts` and the `useMockSubmit` hook in
`apps/preview/src/lib/use-mock-submit.ts`. Submits resolve after 600 ms. One whose identifier or
email starts with `fail` (on complete profile, the username) rejects instead, and the demo shows
"Something went wrong. Try again." through `onSubmitError`. The two providers log to the console.
