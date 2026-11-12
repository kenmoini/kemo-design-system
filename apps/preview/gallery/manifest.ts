import type { Page } from '@playwright/test'

/**
 * The screenshot gallery under docs/gallery: one entry per preview page, grouped by the page family
 * (one family per guide under docs/). `pnpm gallery` captures every entry and rewrites
 * docs/gallery/README.md from this list; see docs/development.md, "Screenshot gallery".
 *
 * Add an entry for every new page, and for a component whose look is worth a picture; a `setup`
 * step can open a dialog or press a toggle first.
 */

export type GalleryTheme = 'light' | 'dark'

export interface GalleryShot {
  /** File name under docs/gallery/<family>/, without the extension. */
  id: string
  title: string
  route: string
  /**
   * Text of the page's h1 to wait for before the shot. Set it on routes whose unknown ids render
   * a client-side 404 (also an h1), so a wrong route fails the capture instead of saving a 404.
   */
  heading?: string
  /**
   * Host themes to capture: `<id>.png` for light, `<id>.dark.png` for dark. Default: both. Set
   * `['light']` on a page that forces dark mode (auth, status), where the two would be identical.
   */
  themes?: GalleryTheme[]
  /** Steps to run after the page has hydrated and before the shot (open a dialog, press a toggle). */
  setup?: (page: Page) => Promise<void>
  /** Shown under the thumbnail. */
  note?: string
}

export interface GalleryFamily {
  /** Folder name under docs/gallery/, and the section id in its README. */
  id: string
  title: string
  description: string
  /** The guide for this family, relative to docs/gallery/. */
  guide: string
  shots: GalleryShot[]
}

export const DEFAULT_THEMES: GalleryTheme[] = ['light', 'dark']

/** The themes a shot is captured in. */
export function themesOf(shot: GalleryShot): GalleryTheme[] {
  return shot.themes ?? DEFAULT_THEMES
}

/** For pages that force dark mode: one capture, the host theme makes no difference. */
const forcedDark: GalleryTheme[] = ['light']

const DEPLOYMENT = '/deployments/prod-us-east/checkout/checkout-api'
const POST = 'cold-start-62'

export const families: GalleryFamily[] = [
  {
    id: 'auth',
    title: 'Auth pages',
    description:
      'Sign in, Register, Forgot Password and Complete Profile on the Nightfall gradient. The drawer stays dark whatever the host theme, so each page is captured once.',
    guide: '../auth-pages.md',
    shots: [
      { id: 'login', title: 'Sign in', route: '/login', themes: forcedDark },
      { id: 'register', title: 'Create your account', route: '/register', themes: forcedDark },
      {
        id: 'forgot-password',
        title: 'Reset your password',
        route: '/forgot-password',
        themes: forcedDark,
      },
      {
        id: 'complete-profile',
        title: 'Complete your profile',
        route: '/complete-profile',
        themes: forcedDark,
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description:
      'The application shell (top bar, side navigation, page header and footer) around the overview dashboard and its widget family.',
    guide: '../dashboard.md',
    shots: [{ id: 'dashboard', title: 'Overview dashboard', route: '/dashboard' }],
  },
  {
    id: 'status',
    title: 'Status pages and console pages',
    description:
      'The bare status pages (401, 403, 404, 500, 503 and Maintenance, forced dark on the muted gradient, so captured once) and the console pages rendered inside the shell (FAQ and the Blank page).',
    guide: '../status-pages.md',
    shots: [
      { id: '401', title: '401 Unauthorized', route: '/errors/401', themes: forcedDark },
      { id: '403', title: '403 Forbidden', route: '/errors/403', themes: forcedDark },
      { id: '404', title: '404 Not found', route: '/errors/404', themes: forcedDark },
      { id: '500', title: '500 Server error', route: '/errors/500', themes: forcedDark },
      { id: '503', title: '503 Unavailable', route: '/errors/503', themes: forcedDark },
      { id: 'maintenance', title: 'Maintenance', route: '/maintenance', themes: forcedDark },
      { id: 'faq', title: 'FAQ', route: '/faq' },
      { id: 'blank', title: 'Blank page', route: '/blank' },
    ],
  },
  {
    id: 'access',
    title: 'Access page',
    description:
      'The ten-tab Access page: Overview, the six object tables on DataTable (users, groups, roles, permissions, service accounts, OAuth apps), Audit, OIDC and Settings.',
    guide: '../access-page.md',
    shots: [
      { id: 'overview', title: 'Overview', route: '/access' },
      { id: 'users', title: 'Users', route: '/access/users' },
      { id: 'groups', title: 'Groups', route: '/access/groups' },
      { id: 'roles', title: 'Roles', route: '/access/roles' },
      { id: 'permissions', title: 'Permissions', route: '/access/permissions' },
      { id: 'audit', title: 'Audit', route: '/access/audit' },
      { id: 'oidc', title: 'OIDC', route: '/access/oidc' },
      { id: 'service-accounts', title: 'Service accounts', route: '/access/service-accounts' },
      { id: 'oauth-apps', title: 'OAuth apps', route: '/access/oauth-apps' },
      { id: 'settings', title: 'Settings', route: '/access/settings' },
    ],
  },
  {
    id: 'deployments',
    title: 'Deployments pages',
    description:
      'The Deployments list with its cluster and namespace scope, the create page, and the detail page with its Overview, YAML (CodeMirror editor and schema browser) and Events tabs.',
    guide: '../deployments-pages.md',
    shots: [
      { id: 'list', title: 'Deployments list', route: '/deployments' },
      { id: 'new', title: 'Create deployment', route: '/deployments/new' },
      { id: 'overview', title: 'Deployment: Overview', route: DEPLOYMENT, heading: 'checkout-api' },
      {
        id: 'yaml',
        title: 'Deployment: YAML',
        route: `${DEPLOYMENT}/yaml`,
        heading: 'checkout-api',
        note: 'With the schema browser open.',
        setup: async (page) => {
          await page.getByRole('button', { name: 'Schema', exact: true }).click()
          await page.getByRole('complementary', { name: 'Schema' }).waitFor()
        },
      },
      {
        id: 'events',
        title: 'Deployment: Events',
        route: `${DEPLOYMENT}/events`,
        heading: 'checkout-api',
      },
    ],
  },
  {
    id: 'blog',
    title: 'Blog pages',
    description:
      'The three blog variations, each an index and a post page with comments: Editorial list, Magazine grid and Journal with a rail.',
    guide: '../blog-pages.md',
    shots: [
      {
        id: 'editorial-list',
        title: 'Editorial list',
        route: '/blog/editorial-list',
      },
      {
        id: 'editorial-list-post',
        title: 'Editorial list: post',
        route: `/blog/editorial-list/${POST}`,
      },
      { id: 'magazine-grid', title: 'Magazine grid', route: '/blog/magazine-grid' },
      {
        id: 'magazine-grid-post',
        title: 'Magazine grid: post',
        route: `/blog/magazine-grid/${POST}`,
      },
      { id: 'journal-rail', title: 'Journal with a rail', route: '/blog/journal-rail' },
      {
        id: 'journal-rail-post',
        title: 'Journal with a rail: post',
        route: `/blog/journal-rail/${POST}`,
      },
    ],
  },
  {
    id: 'components',
    title: 'Component pages',
    description:
      'The preview pages that render every variant of the Park UI components: buttons, forms, surfaces and typography.',
    guide: '../../README.md#quickstart',
    shots: [
      { id: 'buttons', title: 'Buttons', route: '/components/buttons' },
      { id: 'forms', title: 'Forms', route: '/components/forms' },
      { id: 'surfaces', title: 'Surfaces', route: '/components/surfaces' },
      { id: 'typography', title: 'Typography', route: '/components/typography' },
    ],
  },
]
