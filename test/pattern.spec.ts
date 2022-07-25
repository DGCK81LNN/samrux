import { strict as assert } from "node:assert"
import {
  WordMatcher,
  PhraseMatcher,
  GroupMatcher,
  PatternCompileError,
  Pattern,
} from "../src/pattern"

describe("pattern", function () {
  describe("WordMatcher", function () {
    it("matches a specified word", function () {
      const m = new WordMatcher("能否", "*")
      const input1 = [
        { tag: "v", word: "能否" },
        { tag: "v", word: "否定" },
      ]
      const input2 = [
        { tag: "v", word: "能" },
        { tag: "v", word: "否定" },
      ]
      assert.deepEqual([...m.match(input1, 0)], [1])
      assert.deepEqual([...m.match(input2, 0)], [])
    })
    it("matches any word when '*' is specified", function () {
      const m = new WordMatcher("*", "*")
      const input = [
        { tag: "c", word: "然而" },
        { tag: "c", word: "并" },
        { tag: "v", word: "没有" },
        { tag: "r", word: "什么" },
        { tag: "n", word: "卵" },
        { tag: "p", word: "用" },
      ]
      assert.deepEqual([...m.match(input, 0)], [1])
      assert.deepEqual([...m.match(input, 1)], [2])
      assert.deepEqual([...m.match(input, 2)], [3])
      assert.deepEqual([...m.match(input, 3)], [4])
      assert.deepEqual([...m.match(input, 4)], [5])
      assert.deepEqual([...m.match(input, 5)], [6])
    })
    it("matches a word with the specified POS", function () {
      const m = new WordMatcher("*", "r*")
      const input = [
        { tag: "r", word: "他" },
        { tag: "n", word: "妈妈" },
        { tag: "uj", word: "的" },
      ]
      assert.deepEqual([...m.match(input, 0)], [1])
      assert.deepEqual([...m.match(input, 1)], [])
    })
  })

  describe("PhraseMatcher", function () {
    it("matches the sum of consecutive words", function () {
      const m = new PhraseMatcher("纯真灵魂")
      const input = [
        { tag: "a", word: "纯真" },
        { tag: "n", word: "灵魂" },
      ]
      assert.deepEqual([...m.match(input, 0)], [2])
    })
    it("supports wildcards", function () {
      const m = new PhraseMatcher("处女*")
      const input = [
        { tag: "eng", word: "Judy" },
        { tag: "v", word: "是" },
        { tag: "n", word: "处女座" },
        { tag: "uj", word: "的" },
      ]
      assert.deepEqual([...m.match(input, 2)], [3, 4])
    })
    it("matches any number of words for '*'", function () {
      const m = new PhraseMatcher("*")
      const input = [
        { tag: "eng", word: "Judy" },
        { tag: "v", word: "是" },
        { tag: "n", word: "处女座" },
        { tag: "uj", word: "的" },
      ]
      assert.deepEqual([...m.match(input, 0)], [0, 1, 2, 3, 4])
    })
  })

  describe("GroupMatcher", function () {
    it("matches with multiple matchers in a row", function () {
      const m = new GroupMatcher([
        [new PhraseMatcher("*"), new PhraseMatcher("处女*")],
      ])

      const input1 = [
        { tag: "eng", word: "Judy" },
        { tag: "v", word: "是" },
        { tag: "n", word: "处女座" },
        { tag: "uj", word: "的" },
      ]
      const input2 = [
        { tag: "n", word: "工信处" },
        { tag: "n", word: "女干事" },
      ]
      assert.deepEqual([...m.match(input1, 0)], [3, 4])
      assert.deepEqual([...m.match(input2, 0)], [])
    })

    it("handles alternation", function () {
      const m = new GroupMatcher([
        [new WordMatcher("*", "r"), new PhraseMatcher("爸爸")],
        [new WordMatcher("*", "r"), new PhraseMatcher("妈妈")],
      ])

      const input = [
        { tag: "r", word: "我" },
        { tag: "n", word: "爸爸" },
      ]
      assert.deepEqual([...m.match(input, 0)], [2])

      input[1].word = "妈妈"
      assert.deepEqual([...m.match(input, 0)], [2])
    })
  })

  describe("Pattern", function () {
    describe(".compile()", function () {
      it("compiles pattern expressions", function () {
        const expected = new Pattern(
          new GroupMatcher([
            [
              new WordMatcher("*", "r"),
              new GroupMatcher([
                [new PhraseMatcher("爸爸")],
                [new PhraseMatcher("妈妈")],
              ]),
            ],
          ])
        )

        assert.deepEqual(Pattern.compile("[*|r] { 爸爸 | 妈妈 }"), expected)
      })

      it("supports captures", function () {
        const capture1 = new GroupMatcher([
          [
            new WordMatcher("*", "r"),
            new GroupMatcher([
              [new PhraseMatcher("爸爸")],
              [new PhraseMatcher("妈妈")],
            ]),
          ],
        ])
        const capture2 = new GroupMatcher([[new PhraseMatcher("*")]])
        const expected = new Pattern(new GroupMatcher([[capture1, capture2]]))
        expected.captures.push(capture1, capture2)

        assert.deepEqual(
          Pattern.compile("( [*|r] { 爸爸 | 妈妈 } ) ( * )"),
          expected
        )
      })

      it("supports templates", function () {
        const expected = new Pattern(
          new GroupMatcher([
            [
              new GroupMatcher([
                [
                  new WordMatcher("我", "*"),
                  new GroupMatcher([
                    [new PhraseMatcher("爸爸")],
                    [new PhraseMatcher("妈妈")],
                  ]),
                ],
              ]),
              new PhraseMatcher("*"),
            ],
          ])
        )
        const templates = {
          myparent: "[我] { 爸爸 | 妈妈 }",
        }
        assert.deepEqual(Pattern.compile("{{myparent}} *", templates), expected)
      })

      it("supports nested templates", function () {
        const expected = new Pattern(
          new GroupMatcher([
            [
              new GroupMatcher([
                [
                  new WordMatcher("我", "*"),
                  new GroupMatcher([
                    [new PhraseMatcher("爸爸")],
                    [new PhraseMatcher("妈妈")],
                  ]),
                ],
              ]),
              new PhraseMatcher("*"),
            ],
          ])
        )
        const templates = {
          parent: "爸爸 | 妈妈",
          myparent: "[我] {{parent}}",
        }
        assert.deepEqual(Pattern.compile("{{myparent}} *", templates), expected)
      })
    })

    describe("#match()", function () {
      it("looks for the pattern in the input", function () {
        const p = Pattern.compile("我想 [*] 你")
        const input = [
          { tag: "r", word: "我" },
          { tag: "v", word: "想" },
          { tag: "n", word: "问" },
          { tag: "r", word: "你" },
          { tag: "m", word: "一件" },
          { tag: "n", word: "事" },
        ]
        assert.deepEqual(p.match(input), ["我想问你"])
      })
    })

    describe("#matchWhole()", function () {
      it("matches against the whole sentence", function () {
        const p = Pattern.compile("我想 ( * ) 你 ( * )")
        const input = [
          { tag: "r", word: "我" },
          { tag: "v", word: "想" },
          { tag: "n", word: "问" },
          { tag: "r", word: "你" },
          { tag: "m", word: "一件" },
          { tag: "n", word: "事" },
        ]
        assert.deepEqual(p.matchWhole(input), [
          "我想问你一件事",
          "问",
          "一件事",
        ])
      })
    })
  })
})
