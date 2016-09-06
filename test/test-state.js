const {EditorState, TextSelection, Plugin} = require("../src")
const {schema, sameDoc, doc, p} = require("prosemirror-model/test/build")
const assert = require("assert")

const messageCountPlugin = new Plugin({
  stateFields: {
    messageCount: {
      init() { return 0 },
      applyAction(state) { return state.messageCount + 1 },
      toJSON(count) { return count },
      fromJSON(_, count) { return count }
    }
  }
})

describe("State", () => {
  it("creates a default doc", () => {
    let state = EditorState.create({schema})
    sameDoc(state.doc, doc(p()))
  })

  it("creates a default selection", () => {
    let state = EditorState.create({doc: doc(p("foo"))})
    assert.equal(state.selection.from, 1)
    assert.equal(state.selection.to, 1)
  })

  it("applies transform actions", () => {
    let state = EditorState.create({schema})
    let newState = state.applyAction(state.tr.insertText("hi").action())
    sameDoc(state.doc, doc(p()), "old state preserved")
    sameDoc(newState.doc, doc(p("hi")), "new state updated")
    assert.equal(newState.selection.from, 3)
  })

  it("supports plugin fields", () => {
    let state = EditorState.create({plugins: [messageCountPlugin], schema})
    let newState = state.applyAction({type: "foo"}).applyAction({type: "bar"})
    assert.equal(state.messageCount, 0)
    assert.equal(newState.messageCount, 2)
  })

  it("can be serialized to JSON", () => {
    let state = EditorState.create({plugins: [messageCountPlugin], doc: doc(p("ok"))})
    state = state.applyAction(new TextSelection(state.doc.resolve(3)).action())
    assert.equal(JSON.stringify(state.toJSON()),
                 JSON.stringify({doc: {type: "doc", content: [{type: "paragraph", content: [
                   {type: "text", text: "ok"}]}]},
                                 selection: {head: 3, anchor: 3},
                                 messageCount: 1}))
    let copy = EditorState.fromJSON({plugins: [messageCountPlugin], schema}, state.toJSON())
    sameDoc(copy.doc, state.doc)
    assert.equal(copy.selection.from, 3)

    let limitedJSON = state.toJSON({ignore: ["messageCount"]})
    assert(limitedJSON.doc)
    assert.equal(limitedJSON.messageCount, undefined)
    assert.equal(EditorState.fromJSON({plugins: [messageCountPlugin], schema}, limitedJSON).messageCount, 0)
  })

  it("supports reconfiguration", () => {
    let state = EditorState.create({plugins: [messageCountPlugin], schema})
    assert.equal(state.messageCount, 0)
    let without = state.reconfigure({})
    assert.equal(without.messageCount, undefined)
    assert.equal(without.plugins.length, 0)
    sameDoc(without.doc, doc(p()))
    let reAdd = without.reconfigure({plugins: [messageCountPlugin]})
    assert.equal(reAdd.messageCount, 0)
    assert.equal(reAdd.plugins.length, 1)
  })
})
