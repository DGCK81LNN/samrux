import { strict as assert } from "node:assert"
import { escapeRegExp, shuffle } from "../src/utils"

describe("utils", function () {
  describe("escapeRegExp()", function () {
    it("escapes special chars for regexp", function () {
      const str = String.raw`|\{}()[]^$+*?.-`
      const escaped = escapeRegExp(str)
      const re = new RegExp(`^${escaped}$`)
      assert.match(str, re)
    })
  })

  describe("shuffle()", function () {
    it("shuffles an array truly randomly", function () {
      const arr = [1, 2, 3, 4, 5]
      const expectedAverage = 3
      const len = arr.length
      const times = 2000
      const maxError = 1000 / times

      const sums = new Array(len).fill(0)
      for (let i = times; i > 0; --i) {
        const shuffled = shuffle(arr.slice(0))
        for (let j = 0; j < len; ++j) sums[j] += shuffled[j]
      }

      const errors = sums.map(sum => sum / times - expectedAverage)

      assert(
        errors.every(error => Math.abs(error) < maxError),
        `Expected average values of shuffled arrays to be ${expectedAverage} ± ${maxError}, got ${errors}`
      )
    })
  })
})
