// No runtime CodeMirror import may reach this file: `yaml-editor.tsx` loads it with `import()`.
// `YamlEditorInstance` is a type-only re-export (erased at compile time).
export type { YamlEditorInstance } from './extensions'
export type { YamlProblem } from './types'
export { useYamlDocument, type YamlDocument } from './use-yaml-document'
export { YamlEditor, type YamlEditorProps } from './yaml-editor'
