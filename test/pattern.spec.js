const { expect } = require("chai")
const {
  WordMatcher,
  PhraseMatcher,
  GroupMatcher,
  PatternCompileError,
  Pattern,
} = require("../src/pattern.ts")

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
      expect([...m.match(input1, 0)]).to.eql([1])
      expect([...m.match(input2, 0)]).to.eql([])
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
      expect([...m.match(input, 0)]).to.eql([1])
      expect([...m.match(input, 1)]).to.eql([2])
      expect([...m.match(input, 2)]).to.eql([3])
      expect([...m.match(input, 3)]).to.eql([4])
      expect([...m.match(input, 4)]).to.eql([5])
      expect([...m.match(input, 5)]).to.eql([6])
    })
    it("matches a word with the specified POS", function () {
      const m = new WordMatcher("*", "r*")
      const input = [
        { tag: "r", word: "他" },
        { tag: "n", word: "妈妈" },
        { tag: "uj", word: "的" },
      ]
      expect([...m.match(input, 0)]).to.eql([1])
      expect([...m.match(input, 1)]).to.eql([])
    })
  })

  describe("PhraseMatcher", function () {
    it("matches the sum of consecutive words", function () {
      const m = new PhraseMatcher("纯真灵魂")
      const input = [
        { tag: "a", word: "纯真" },
        { tag: "n", word: "灵魂" },
      ]
      expect([...m.match(input, 0)]).to.eql([2])
    })
    it("supports wildcards", function () {
      const m = new PhraseMatcher("处女*")
      const input = [
        { tag: "eng", word: "Judy" },
        { tag: "v", word: "是" },
        { tag: "n", word: "处女座" },
        { tag: "uj", word: "的" },
      ]
      expect([...m.match(input, 2)]).to.eql([3, 4])
    })
    it("matches any number of words for '*'", function () {
      const m = new PhraseMatcher("*")
      const input = [
        { tag: "eng", word: "Judy" },
        { tag: "v", word: "是" },
        { tag: "n", word: "处女座" },
        { tag: "uj", word: "的" },
      ]
      expect([...m.match(input, 0)]).to.eql([0, 1, 2, 3, 4])
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
      expect([...m.match(input1, 0)]).to.eql([3, 4])
      expect([...m.match(input2, 0)]).to.eql([])
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
      expect([...m.match(input, 0)]).to.eql([2])

      input[1].word = "妈妈"
      expect([...m.match(input, 0)]).to.eql([2])
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

        expect(Pattern.compile("[*|r] { 爸爸 | 妈妈 }")).to.eql(expected)
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

        expect(Pattern.compile("([*|r]{爸爸|妈妈})(*)")).to.eql(expected)
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
        expect(Pattern.compile("{{myparent}} *", templates)).to.eql(expected)
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
        expect(Pattern.compile("{{myparent}} *", templates)).to.eql(expected)
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
        expect(p.match(input)).to.eql([input.slice(0, 4)])
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
        expect(p.matchWhole(input)).to.eql([input, [input[2]], input.slice(4)])
      })
    })
  })
})
