import { strict as assert } from "node:assert"
import { Script, Keyword, Decomposer } from "../src/script"

describe("script", function () {
  describe("Script", function () {
    it("can be created from the defninition object", function () {
      const script = new Script({
        pre: { ",": "，" },
        post: { 我: "你", 你: "我" },
        initFlags: ["foo"],
        templates: { parent: "爸爸|妈妈|父亲|母亲|老妈" }, // etc.
        groups: [
          {
            name: "foo",
            requiredFlags: ["foo"],
            requiredTrust: 0.1,
            requiredMood: 0,
            keywords: [
              {
                expr: "你好",
                weight: 1,
                decomposers: [
                  {
                    expr: "*",
                    shufflePhrases: true,
                    phrases: ["你好呀，有什么想聊的吗？"],
                  },
                ],
              },
            ],
          },
        ],
      })

      assert.equal(script.groups.length, 1)
      const group = script.groups[0]
      assert.equal(group.name, "foo")
      assert.equal(group.keywords.length, 1)
      const kw = group.keywords[0]
      assert.equal(kw.decomposers.length, 1)
      assert.equal(kw.decomposers[0].phrases.length, 1)
    })

    describe("#postReplace", function () {
      it("performs the post replacement", function () {
        const script = new Script({
          pre: {},
          post: { 我: "你", 你: "我" },
          initFlags: [],
          templates: {},
          groups: [],
        })
        const text = [
          { tag: "r", word: "我" },
          { tag: "v", word: "想" },
          { tag: "n", word: "问" },
          { tag: "r", word: "你" },
          { tag: "m", word: "一件" },
          { tag: "n", word: "事" },
        ]
        const expected = ["你", "想", "问", "我", "一件", "事"]
        assert.deepEqual(script.postReplace(text), expected)
      })
    })
  })

  describe("Keyword#decompose()", function () {
    it("tries to decompose the input using its decomposers")
  })

  describe("Decomposer#decompose()", function () {
    it("tries to decompose the input")
  })
})
