import { Pattern } from "./pattern"
import { Script, Group, IKeyword, Keyword, Response } from "./script"
import { TaggedWord, tag } from "@node-rs/jieba"
export { load as loadJieba, loadDict as loadJiebaDict } from "@node-rs/jieba"

const useStored: IKeyword = {
  weight: 0,
  decompose(_: TaggedWord[], machine: Machine): Response | null {
    if (machine.storedResponses.length)
    return {
      weight: 0,
      content: machine.storedResponses.shift(),
    }
    return null
  },
}

export class Machine {
  flags: Set<string>

  /**
   * A value that indicates the bot's mood.
   *
   * Should be reset every session.
   */
  mood = 0

  /**
   * A value that indicates how much the bot trusts the user.
   *
   * Should be persistent across sessions.
   */
  trust = 0

  /**
   * A counter that is incremented with every incoming message.
   */
  time = 0

  private enabledGroups: Group[]
  private enabledKeywords: IKeyword[]
  storedResponses: string[] = []

  constructor(public readonly script: Script) {
    this.flags = new Set<string>(script.initFlags)
    this.updateEnabledGroups()
  }

  updateEnabledGroups() {
    this.enabledGroups = this.script.groups.filter(g => {
      if (g.requiredMood > this.mood) return false
      if (g.requiredTrust > this.trust) return false
      if (g.requiredFlags.some(flag => !this.flags.has(flag))) return false
      return true
    })
    this.enabledKeywords = [useStored]
      .concat(this.enabledGroups.map(g => g.keywords).flat())
      .sort((a, b) => a.weight - b.weight)
      .reverse()
  }

  getResponse(input: TaggedWord[]) {
    const stored: string[] = []
    for (const kw of this.enabledKeywords) {
      const response = kw.decompose(input, this)
      if (response) return response
    }

    return null
  }
}
