# Status pages and console pages

Two more page families, presentational like the auth pages (the host supplies actions and data):

Screenshots: [gallery](gallery/README.md#status-pages-and-console-pages).

- Status pages, shown bare (no shell): `UnauthorizedPage` (401), `ForbiddenPage` (403),
  `NotFoundPage` (404), `ServerErrorPage` (500), `UnavailablePage` (503) and `MaintenancePage`, all
  thin wrappers over `StatusLayout`, plus `statusCopy` (the pinned copy), `mergeActions`,
  `StatusActionButton` (one action as a link or button) and the types `StatusAction`,
  `StatusActionButtonProps`, `StatusLayoutProps`, `StatusPageProps`, `StatusPageTone` and
  `MaintenancePageProps`. Each is the Nightfall gradient muted by the `gradients.status` token, in
  forced dark mode, with a decorative watermark, the message bottom-left and the request id and
  version in the footer.
- Console pages, rendered inside your `AppShell`: `FaqPage` (a topic index beside always-open,
  linkable answers), `BlankPage`, the `useCurrentSection` hook behind the index, and the types
  `FaqTopic`, `FaqQuestion`, `FaqPageProps` and `BlankPageProps`.

Every status page string is a prop. `actions` merge into the page's defaults by label, so
`{ label: 'Try again', onSelect: reset }` wires the default "Try again" and keeps the others; an
unknown label is appended. An action with `href` renders through `linkComponent`, one with
`onSelect` is a button, and one with neither is an inert button: there is no built-in
`history.back()` or reload. `MaintenancePage` adds `startedAt` and `expectedBackAt` (formatted
strings), and `refreshIntervalMs` calls `onRefresh` (default: reload) on that interval.

Wiring Next.js's boundaries, as the preview does:

```tsx
// app/error.tsx: Next renders this when a route below the root layout throws.
'use client'
import { ServerErrorPage } from '@kemo/ui'
import NextLink from 'next/link'

type Props = { error: Error & { digest?: string }; reset: () => void }

export default function ErrorBoundary({ error, reset }: Props) {
  const actions = [
    { label: 'Try again', onSelect: reset },
    { label: 'Go to dashboard', href: '/dashboard' },
  ]
  return <ServerErrorPage requestId={error.digest} actions={actions} linkComponent={NextLink} />
}
```

`app/not-found.tsx` stays a server component because only server files can export `metadata`; Next
answers unmatched URLs with a 404 status either way. Render `NotFoundPage` from a small
`'use client'` component when you pass `linkComponent={NextLink}`: a server component can't hand a
function to a client component. Only server errors carry `error.digest`; without one the footer
shows no request id. Next 16.3 and later also pass `retry`, which re-fetches the segment before
rendering it again.

The FAQ takes its questions as data:

```ts
interface FaqTopic {
  id: string // becomes the anchor #topic-{id}
  label: string
  questions: FaqQuestion[]
}
interface FaqQuestion {
  id: string // becomes the anchor #q-{id}
  question: string
  answer: ReactNode
}
```

Topic and question ids must be unique across the page, because they become DOM ids. `FaqPage` also
takes `title` (default "Frequently asked questions"), `description`, one outline `action` and
`linkComponent`. The index is a sticky column from `lg` and a scrollable row below it. It marks the
topic in view, or the one the URL hash names until the reader scrolls, so a clicked topic is marked
even when the page is too short to bring it to the top.

`BlankPage` is the starter for a new screen: a `PageHeader` (`title`, `context`, one solid `action`)
over a dashed `EmptyState` (`emptyMessage`, `emptyAction`) that your `children` replace. Copy
`apps/preview/src/components/console/blank-demo.tsx` to begin one.

In the preview, `/maintenance` and `/errors/401` to `/errors/503` render
`apps/preview/src/components/status/status-demo.tsx` with the props in
`apps/preview/src/lib/mock-status.ts`; `apps/preview/src/app/not-found.tsx` and `error.tsx` are the
real boundaries, and `/errors/throw` throws on render to show the second. `/faq` and `/blank`
render the demos in `apps/preview/src/components/console/` inside `ConsoleFrame`, with "Help"
current on the FAQ, and the questions are in `apps/preview/src/lib/mock-faq.ts`.
