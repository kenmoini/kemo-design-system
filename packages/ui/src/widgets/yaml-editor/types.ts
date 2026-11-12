/** A lint finding: a YAML syntax error or a schema violation. Offsets are into the editor text. */
export interface YamlProblem {
  from: number
  to: number
  /** 1-based line of `from`. */
  line: number
  message: string
  severity: 'error' | 'warning'
}
