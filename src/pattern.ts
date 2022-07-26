import type { TaggedWord } from "@node-rs/jieba"
import { escapeRegExp } from "./utils"

export interface Matchable {
  matchedText?: TaggedWord[] | null

  match(stream: TaggedWord[], start: number): Generator<number>
}

export class WordMatcher implements Matchable {
  matchedText?: TaggedWord[] | null

  constructor(public readonly word: string, public readonly tag: string) {}

  *match(stream: TaggedWord[], start: number) {
    if (start >= stream.length) return
    const { word, tag } = stream[start]
    if (this.word !== "*" && this.word !== word) return
    if (this.tag !== "*") {
      if ((this.tag === "eng") !== (tag === "eng")) return
      if (this.tag.endsWith("*")) {
        if (!tag.startsWith(this.tag.slice(0, -1))) return
      } else if (this.tag !== tag) return
    }
    this.matchedText = [stream[start]]
    yield start + 1
  }
}

export class PhraseMatcher implements Matchable {
  matchedText?: TaggedWord[] | null

  private phraseRe: RegExp

  constructor(public readonly phrase: string) {
    const r = escapeRegExp(phrase).replace(/\\\*/g, ".*?")
    this.phraseRe = new RegExp(`^${r}$`)
  }

  *match(stream: TaggedWord[], start: number) {
    if (start >= stream.length) return
    let phrase = ""
    for (let i = start; i < stream.length; ++i) {
      if (this.phraseRe.test(phrase)) {
        this.matchedText = stream.slice(start, i)
        yield i
      }
      phrase += stream[i].word
    }
    if (this.phraseRe.test(phrase)) {
      this.matchedText = stream.slice(start)
      yield stream.length
    }
  }
}

export class GroupMatcher implements Matchable {
  matchedText?: TaggedWord[] | null

  constructor(public readonly alternations: Matchable[][] = [[]]) {}

  addAlternation(alternation: Matchable[] = []) {
    this.alternations.push(alternation)
  }

  addChild(matchable: Matchable) {
    this.alternations.at(-1).push(matchable)
  }

  *match(stream: TaggedWord[], start: number) {
    const stack: Generator<number>[] = []
    const textStack: TaggedWord[][] = []
    for (const alternation of this.alternations) {
      if (!alternation.length) {
        this.matchedText = []
        yield start
        continue
      }
      stack.push(alternation[0].match(stream, start))
      while (stack.length) {
        const { value: end, done } = stack.at(-1).next()
        if (done) {
          stack.pop()
          textStack.pop()
          continue
        }

        const text = alternation[stack.length - 1].matchedText
        if (stack.length < alternation.length) {
          textStack.push(text)
          stack.push(alternation[stack.length].match(stream, end))
        } else {
          this.matchedText = textStack.flat().concat(text)
          yield end
        }
      }
    }
  }
}

interface Token {
  value: string
  type: string
}

const puncts = Object.freeze(["(", ")", "[", "]", "{{", "}}", "{", "}", "|"])
const tokenizeRe = /\{\{|\}\}|[()[\]{}|]|[^\s()[\]{}|]+/g

function tokenize(expr: string): Token[] {
  const tokens: Token[] = []
  for (const match of expr.matchAll(tokenizeRe)) {
    const token = match[0]
    tokens.push({
      value: token,
      type: puncts.includes(token) ? "punct" : "text",
    })
  }
  tokens.push({ value: "", type: "eof" })
  return tokens
}

const compileErrorName = "Samrux.PatternCompileError"

export class PatternCompileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = compileErrorName
  }
}

export class Pattern {
  matcher: GroupMatcher
  /**
   * Capture groups.
   *
   * `pattern.captures[0]` should always be `pattern.matcher`.
   */
  captures: GroupMatcher[]

  constructor(matcher?: GroupMatcher) {
    this.matcher = matcher || new GroupMatcher()
    this.captures = [this.matcher]
  }

  static compile(expr: string, templates: Record<string, string> = {}) {
    const tokens = tokenize(expr)
    const pattern = new Pattern()
    const stateStack: string[] = []
    const parentStack: GroupMatcher[] = []
    let current = pattern.matcher

    let i = 0
    let token = tokens[0]
    for (; i < tokens.length; token = tokens[++i]) {
      const state = stateStack.at(-1) || "root"

      if (token.type === "text") {
        current.addChild(new PhraseMatcher(token.value))
        continue
      }
      if (token.type === "punct") {
        if (token.value === "|") {
          current.addAlternation()
          continue
        }
        if (token.value === "[") {
          token = tokens[++i]
          if (token.type !== "text") expecting("word")
          const word = token.value
          let tag = "*"

          token = tokens[++i]
          if (token.value === "|") {
            token = tokens[++i]
            if (token.type !== "text") expecting("word tag")
            tag = token.value
            token = tokens[++i]
          }

          if (token.value !== "]") expecting("']'")

          current.addChild(new WordMatcher(word, tag))
          continue
        }
        if (token.value === "{{") {
          token = tokens[++i]
          if (token.type !== "text") expecting("template name")
          const name = token.value

          token = tokens[++i]
          if (token.value !== "}}") expecting("'}}'")

          if (!Object.hasOwnProperty.call(templates, name))
            throw new PatternCompileError(`No template named ${name}`)

          let child: GroupMatcher
          try {
            child = Pattern.compile(templates[name], templates).matcher
          } catch (err) {
            if (
              typeof err === "object" &&
              err !== null &&
              err.name === compileErrorName &&
              typeof err.message === "string"
            ) {
              err.message = err.message.replace(
                ", expecting",
                ` in template '${name}', expecting`
              )
              throw err
            }
          }
          current.addChild(child)
          continue
        }
        if (token.value === "{") {
          const child = new GroupMatcher()
          stateStack.push("group")
          parentStack.push(current)
          current.addChild(child)
          current = child
          continue
        }
        if (token.value === "(") {
          const child = new GroupMatcher()
          stateStack.push("capture")
          parentStack.push(current)
          current.addChild(child)
          pattern.captures.push(child)
          current = child
          continue
        }
      }
      if (state === "group") {
        if (token.value !== "}") expecting("'}'")
        stateStack.pop()
        current = parentStack.pop()
        continue
      }
      if (state === "capture") {
        if (token.value !== ")") expecting("')'")
        stateStack.pop()
        current = parentStack.pop()
        continue
      }
      if (token.type === "eof") break
      expecting("end of expression")
    }

    return pattern

    function expecting(desc: string) {
      const got =
        token.type === "eof"
          ? "end of expression"
          : `${token.type === "text" ? "text" : "token"} '${token.value}'`
      throw new PatternCompileError(`Unexpected ${got}, expecting ${desc}`)
    }
  }

  match(input: TaggedWord[]) {
    for (const capture of this.captures) capture.matchedText = null
    for (let i = 0; i <= input.length; ++i) {
      const gen = this.matcher.match(input, i)
      if (!gen.next().done)
        return this.captures.map(capture => capture.matchedText)
    }
    return null
  }

  matchWhole(input: TaggedWord[]) {
    for (const capture of this.captures) capture.matchedText = null
    for (const end of this.matcher.match(input, 0)) {
      if (end === input.length)
        return this.captures.map(capture => capture.matchedText)
    }
    return null
  }
}
