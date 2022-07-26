const { expect } = require("chai")
const { Script, Keyword, Decomposer } = require("../src/script/index.ts")

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

      expect(script).to.be.an("object")
      expect(script).to.have.property("pre").that.is.an("object").with.keys(",")
      expect(script)
        .to.have.property("post")
        .that.is.an("object")
        .with.keys("我", "你")
      expect(script)
        .to.have.property("initFlags")
        .that.is.an("array")
        .with.members(["foo"])
      expect(script)
        .to.have.property("templates")
        .that.is.an("object")
        .with.keys("parent")
      expect(script)
        .to.have.property("groups")
        .that.is.an("array")
        .with.length(1)

      const group = script.groups[0]
      expect(group).to.be.an("object")
      expect(group).to.have.property("name", "foo")
      expect(group).to.have.property("requiredFlags").with.members(["foo"])
      expect(group).to.have.property("requiredTrust", 0.1)
      expect(group).to.have.property("requiredMood", 0)
      expect(group)
        .to.have.property("keywords")
        .that.is.an("array")
        .with.length(1)

      const keyword = group.keywords[0]
      expect(keyword).to.be.an("object")
      expect(keyword).to.have.property("pattern").that.is.an("object")
      expect(keyword).to.have.property("weight", 1)
      expect(keyword)
        .to.have.property("decomposers")
        .that.is.an("array")
        .with.length(1)

      const decomposer = keyword.decomposers[0]
      expect(decomposer).to.be.an("object")
      expect(decomposer).to.have.property("pattern").that.is.an("object")
      expect(decomposer).to.have.property("shufflePhrases", true)
      expect(decomposer).to.have.deep.property("phrases", [
        "你好呀，有什么想聊的吗？",
      ])
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
        expect(script.postReplace(text)).to.eql(expected)
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
