import { strict as assert } from "node:assert"
import { escapeRegExp } from "../src/utils"

describe("utils", () => {
  describe("escapeRegExp()", () => {
    it("escapes special chars for regexp", () => {
      const str = String.raw`|\{}()[]^$+*?.-`
      const escaped = escapeRegExp(str)
      const re = new RegExp(`^${escaped}$`)
      assert.match(str, re)
    })
  })
})
