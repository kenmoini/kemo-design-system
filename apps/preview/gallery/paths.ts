import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  DEFAULT_THEMES,
  families,
  type GalleryFamily,
  type GalleryShot,
  type GalleryTheme,
  themesOf,
} from './manifest'

/** docs/gallery, where the PNGs and the generated README live. */
export const GALLERY_DIR = fileURLToPath(new URL('../../../docs/gallery/', import.meta.url))

/** The PNG's path relative to docs/gallery, e.g. `access/overview.dark.png`. */
export function shotRelativePath(family: GalleryFamily, shot: GalleryShot, theme: GalleryTheme) {
  const suffix = theme === 'dark' ? '.dark' : ''
  return `${family.id}/${shot.id}${suffix}.png`
}

export function shotPath(family: GalleryFamily, shot: GalleryShot, theme: GalleryTheme) {
  return path.join(GALLERY_DIR, shotRelativePath(family, shot, theme))
}

/**
 * The themes selected by GALLERY_THEMES (`light`, `dark` or `light,dark`), intersected with the
 * shot's own. Empty selects every theme the shot declares.
 */
export function selectThemes(shot: GalleryShot, themes: string | undefined): GalleryTheme[] {
  const wanted = (themes ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (wanted.length === 0) return themesOf(shot)
  const unknown = wanted.filter((theme) => !(DEFAULT_THEMES as string[]).includes(theme))
  if (unknown.length > 0) {
    throw new Error(`GALLERY_THEMES is not light or dark: ${unknown.join(', ')}`)
  }
  return themesOf(shot).filter((theme) => wanted.includes(theme))
}

/**
 * The families and shots selected by GALLERY_ONLY: a comma-separated list of family ids
 * (`blog`), shot ids (`yaml`) or both (`deployments/yaml`). Empty selects everything.
 */
export function selectFamilies(only: string | undefined): GalleryFamily[] {
  const wanted = (only ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (wanted.length === 0) return families

  const selected: GalleryFamily[] = []
  for (const family of families) {
    if (wanted.includes(family.id)) {
      selected.push(family)
      continue
    }
    const shots = family.shots.filter(
      (shot) => wanted.includes(shot.id) || wanted.includes(`${family.id}/${shot.id}`),
    )
    if (shots.length > 0) selected.push({ ...family, shots })
  }

  const known = new Set(
    families.flatMap((family) => [
      family.id,
      ...family.shots.flatMap((shot) => [shot.id, `${family.id}/${shot.id}`]),
    ]),
  )
  const unknown = wanted.filter((id) => !known.has(id))
  if (unknown.length > 0) {
    throw new Error(`GALLERY_ONLY names nothing in the manifest: ${unknown.join(', ')}`)
  }
  return selected
}
