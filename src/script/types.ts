export interface ScriptDefinition {
  groups: GroupDefinition[]
  pre: Record<string, string>
  post: Record<string, string>
  initFlags: string[]
  templates: Record<string, string>
}

export interface GroupDefinition {
  name: string
  requiredFlags?: string[]
  requiredMood?: number
  requiredTrust?: number
  keywords: KeywordDefinition[]
  forceOverride?: boolean
}

export interface KeywordDefinition {
  expr: string
  weight: number
  decomposers: DecomposerDefinition[]
}

export interface DecomposerDefinition {
  type?: DecomposerType
  expr: string
  phrases: string[]
  shufflePhrases?: boolean
  setFlags?: Record<string, boolean>
  skipProb?: number
}

export type DecomposerType = "general" | "fact" | "stored"
