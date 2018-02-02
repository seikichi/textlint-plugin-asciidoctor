import parse from "../src/parse";

const oc = jasmine.objectContaining;

test("single word", () => {
  const node = parse("text");
  const loc = { start: { line: 1, column: 0 }, end: { line: 1, column: 4 } };
  const range = [0, 4];
  const raw = "text";
  const expected = {
    type: "Document",
    children: [
      {
        type: "Paragraph",
        children: [{ type: "Str", value: "text", loc, range, raw }],
        loc,
        range,
        raw
      }
    ],
    loc,
    range,
    raw
  };
  expect(node).toEqual(expected);
});

test("multiline paragraph", () => {
  const node = parse("text\ntext\n");
  const expected = {
    type: "Str",
    value: "text\ntext",
    loc: { start: { line: 1, column: 0 }, end: { line: 2, column: 4 } },
    range: [0, 9],
    raw: "text\ntext"
  };
  expect(node.children[0].children[0]).toEqual(expected);
});

test("unordered list", () => {
  const node = parse("- text");
  const loc = { start: { line: 1, column: 2 }, end: { line: 1, column: 6 } };
  const range = [2, 6];
  const raw = "text";
  const expected = {
    type: "ListItem",
    children: [
      {
        type: "Paragraph",
        children: [{ type: "Str", value: "text", loc, range, raw }],
        loc,
        range,
        raw
      }
    ],
    loc,
    range,
    raw: null
  };
  expect(node.children[0].children[0]).toEqual(expected);
});

test("nested unordered list", () => {
  const node = parse(`\
* value 1
** value 2
* value 3
`);

  expect(node).toEqual(
    oc({
      type: "Document",
      children: [
        oc({
          type: "List",
          children: [
            oc({
              type: "ListItem",
              children: [
                oc({
                  type: "Paragraph",
                  children: [
                    oc({ type: "Str", value: "value 1", range: [2, 9] })
                  ]
                }),
                oc({
                  type: "List",
                  children: [
                    oc({
                      type: "ListItem",
                      children: [
                        oc({
                          type: "Paragraph",
                          children: [
                            oc({
                              type: "Str",
                              value: "value 2",
                              range: [13, 20]
                            })
                          ]
                        })
                      ]
                    })
                  ]
                })
              ]
            }),
            oc({
              type: "ListItem",
              children: [
                oc({
                  type: "Paragraph",
                  children: [
                    oc({ type: "Str", value: "value 3", range: [23, 30] })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
  );
});

test("ordered list", () => {
  const node = parse(". text");
  const loc = { start: { line: 1, column: 2 }, end: { line: 1, column: 6 } };
  const range = [2, 6];
  const raw = "text";
  const expected = {
    type: "ListItem",
    children: [
      {
        type: "Paragraph",
        children: [{ type: "Str", value: "text", loc, range, raw }],
        loc,
        range,
        raw
      }
    ],
    loc,
    range,
    raw: null
  };
  expect(node.children[0].children[0]).toEqual(expected);
});

test("check list", () => {
  const node = parse("* [*] checked\n* [ ] not checked");
  expect(node.children[0].children).toEqual([
    oc({
      children: [oc({ children: [oc({ type: "Str", value: "checked" })] })]
    }),
    oc({
      children: [oc({ children: [oc({ type: "Str", value: "not checked" })] })]
    })
  ]);
});
