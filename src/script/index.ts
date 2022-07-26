import { Pattern } from "../pattern"
import type { Machine } from "../machine"
import { shuffle } from "../utils"
import type {
  ScriptDefinition,
  GroupDefinition,
  KeywordDefinition,
  DecomposerDefinition,
  DecomposerType,
} from "./types"
import type { TaggedWord } from "@node-rs/jieba"

export interface Response {
  weight: number
  content: string
}

export class Script {
  groups: Group[]
  pre: Record<string, string>
  post: Record<string, string>
  initFlags: string[]
  templates: Record<string, string>

  constructor(o: ScriptDefinition) {
    this.groups = o.groups.map(d => new Group(d, this))
    this.pre = o.pre
    this.post = o.post
    this.initFlags = o.initFlags
    this.templates = o.templates
  }

  postReplace(text: TaggedWord[]) {
    return text.map(({ word }) =>
      Object.hasOwnProperty.call(this.post, word) ? this.post[word] : word
    )
  }
}

export class Group {
  name: string
  requiredFlags: string[]
  requiredMood: number
  requiredTrust: number
  keywords: Keyword[]
  forceOverride: boolean

  constructor(o: GroupDefinition, public script: Script) {
    this.name = o.name
    this.requiredFlags = o.requiredFlags || []
    this.requiredMood =
      typeof o.requiredMood === "number" ? o.requiredMood : -Infinity
    this.requiredTrust = o.requiredTrust || 0
    this.keywords = o.keywords.map(v => new Keyword(v, script))
    this.forceOverride = o.forceOverride || false
  }
}

export interface IKeyword {
  weight: number
  decompose(input: TaggedWord[], machine: Machine): Response | null
}

export class Keyword implements IKeyword {
  pattern: Pattern
  weight: number
  decomposers: Decomposer[]

  constructor(o: KeywordDefinition, public script: Script) {
    this.pattern = Pattern.compile(o.expr)
    this.weight = o.weight
    this.decomposers = o.decomposers.map(v => new Decomposer(v, script))
  }

  decompose(input: TaggedWord[], machine: Machine) {
    if (!this.pattern.match(input)) return null

    for (const decomposer of this.decomposers) {
      const response = decomposer.decompose(input, machine)
      if (!response) continue

      if (decomposer.type === "stored") {
        machine.storedResponses.push(response)
        continue
      }

      return {
        content: response,
        weight: this.weight,
      }
    }
    return null
  }
}

const counterResetTime = 15

export class Decomposer {
  type: DecomposerType
  pattern: Pattern
  phrases: string[]
  shufflePhrases: boolean
  addFlags: string[]
  removeFlags: string[]
  skipProb: number

  reachTime = -Infinity
  counter = 0

  constructor(o: DecomposerDefinition, public script: Script) {
    this.type = o.type || "general"
    this.pattern = Pattern.compile(o.expr)
    this.phrases = o.phrases
    this.shufflePhrases = o.shufflePhrases || false
    const flags = Object.keys(o.setFlags || {})
    this.addFlags = flags.filter(f => o.setFlags[f])
    this.removeFlags = flags.filter(f => !o.setFlags[f])
    this.skipProb = o.skipProb
  }

  getPhrase(groups: TaggedWord[][], time: number) {
    const refs = groups.map(g => this.script.postReplace(g).join(""))

    if (time - this.reachTime >= counterResetTime) {
      this.counter = 0
      if (this.shufflePhrases) shuffle(this.phrases)
    }
    if (this.counter >= this.phrases.length) {
      if (this.type !== "fact") return null
      this.counter -= this.phrases.length
    }
    const phrase = this.phrases[this.counter]
    const content = phrase.replace(/\$(\$|&|[1-9][0-9]?)/g, (_, i) => {
      if (i === "$") return "$"
      if (i === "&") return refs[0]
      return refs[parseInt(i)]
    })
    return content
  }

  decompose(input: TaggedWord[], machine: Machine) {
    if (this.skipProb && Math.random() < this.skipProb) return null

    const match = this.pattern.matchWhole(input)
    if (!match) return null

    return this.getPhrase(match, machine.time)
  }
}
