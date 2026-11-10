'use client'
import { createContext, type ReactNode, useContext, useMemo, useState } from 'react'
import { MEDIA_LG, MEDIA_MD, useMediaQuery } from './use-media-query'

export interface AppShellContextValue {
  /** The desktop collapse choice; it shows only from `lg` (below it the nav is a rail anyway). */
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  /** Whether the mobile navigation drawer is open (always `false` from `md`). */
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  /** The side navigation shows as the 56px icon rail: from `md`, below `lg` or when collapsed. */
  isRail: boolean
  /** Below `md`: the side navigation is hidden and opens as a drawer. */
  isMobile: boolean
}

const AppShellContext = createContext<AppShellContextValue | null>(null)

export interface AppShellProviderProps {
  defaultCollapsed?: boolean
  children: ReactNode
}

/** Owns the shell's responsive state; `AppShell` renders it, so apps rarely need it directly. */
export function AppShellProvider({ defaultCollapsed = false, children }: AppShellProviderProps) {
  const md = useMediaQuery(MEDIA_MD)
  const lg = useMediaQuery(MEDIA_LG)
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isMobile = !md
  const isRail = md && (!lg || collapsed)

  // Growing past `md` removes the drawer; close it so it does not reopen on the way back down.
  if (drawerOpen && !isMobile) setDrawerOpen(false)

  const value = useMemo(
    () => ({ collapsed, setCollapsed, drawerOpen, setDrawerOpen, isRail, isMobile }),
    [collapsed, drawerOpen, isRail, isMobile],
  )
  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>
}

/** The enclosing shell's state, or `null` outside an `AppShell`. */
export function useAppShell(): AppShellContextValue | null {
  return useContext(AppShellContext)
}
