# Adding Park UI components

Components are copied from Park UI's public registry into `packages/ui/src/components/ui` and owned
in-repo.

```sh
make park-ui-add COMPONENTS="dialog menu"
pnpm format
```

The target runs `node scripts/park-ui/sync.mjs add dialog menu` followed by `panda codegen` in
`@kemo/ui`. It needs network access. `pnpm park-ui init|add <ids...> [--force] [--with-colors]|port`
exposes the script directly. Existing files that differ from the registry are skipped unless you
pass `--force`.

`--force` overwrites the requested items' files where they differ from the registry. The port
still runs, but any other local edit to a Park file is lost, so check `git diff` after a forced run.
`packages/ui/src/theme/tokens/fonts.ts` (DM Sans) and `packages/ui/src/theme/radii.ts` (XS radii)
are ours even though they sit at Park theme paths. Park's `__init` does not ship them today; if it
ever does, `pnpm park-ui init --force` will overwrite them.

`init` and `add` print a line such as `note      card needs packages: @ark-ui/react, react` for
each registry item with npm dependencies. The script does not install them: add any that
`packages/ui/package.json` does not already list with `pnpm --filter @kemo/ui add <pkg>`.

Park's registry targets Panda v1, so the script ports each file to the v2 API:

- `createStyleContext` becomes `createSlotRecipeContext`
- type imports from `@pandacss/dev` become `@pandacss/types`
- bare `styled-system/*` imports become relative imports
- the checkbox control nesting is fixed
- `'PasswordInput'` is added to the input recipe's `jsx` list
- `Card.Footer` renders a `div` instead of Park's `h3`, so footer buttons are not inside a heading

It also scans the incoming recipes for color palettes the theme does not ship. Park's alert recipe,
for example, needs blue and orange. A missing palette stops the add and tells you to re-run with
`--with-colors` so the palette is copied in. Keep the palette set deliberate: adding one grows
every consumer's CSS.

`make park-ui-port` re-applies the port to files already in the repo. Run `pnpm format` after an
add, because the barrel files are written unformatted.
