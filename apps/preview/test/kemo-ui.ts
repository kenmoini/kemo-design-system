// What the demo reducers and mocks import from `@kemo/ui`, without the React components:
// `vitest.config.ts` resolves `@kemo/ui` here for the unit tests.
export * from '../../../packages/ui/src/lib/kubernetes'
export { CREATED_BY_ANNOTATION } from '../../../packages/ui/src/pages/deployments/helpers'
export {
  firstParagraphText,
  isSolved,
  paragraphsOf,
} from '../../../packages/ui/src/pages/forum/content'
