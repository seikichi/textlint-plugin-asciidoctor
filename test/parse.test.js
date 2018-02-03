import parse from "../src/parse";
import { test as testAST } from "@textlint/ast-tester";

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
  testAST(node);
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
  testAST(node);
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
    raw: ""
  };
  testAST(node);
  expect(node.children[0].children[0]).toEqual(expected);
});

test("nested unordered list", () => {
  const node = parse(`\
* value 1
** value 2
* value 3
`);

  testAST(node);
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
    raw: ""
  };
  testAST(node);
  expect(node.children[0].children[0]).toEqual(expected);
});

test("check list", () => {
  const node = parse("* [*] checked\n* [ ] not checked");
  testAST(node);
  expect(node.children[0].children).toEqual([
    oc({
      children: [oc({ children: [oc({ type: "Str", value: "checked" })] })]
    }),
    oc({
      children: [oc({ children: [oc({ type: "Str", value: "not checked" })] })]
    })
  ]);
});

test("labeled list", () => {
  const node = parse("A:: B\nC:: D");
  testAST(node);
  expect(node.children[0]).toEqual(
    oc({
      type: "List",
      children: [
        oc({
          type: "ListItem",
          children: [oc({ children: [oc({ value: "A" })] })]
        }),
        oc({
          type: "ListItem",
          children: [oc({ children: [oc({ value: "B" })] })]
        }),
        oc({
          type: "ListItem",
          children: [oc({ children: [oc({ value: "C" })] })]
        }),
        oc({
          type: "ListItem",
          children: [oc({ children: [oc({ value: "D" })] })]
        })
      ]
    })
  );
});

test("blockquote", () => {
  const node = parse("____\nblockquote\n____\n");
  testAST(node);
  expect(node.children[0]).toEqual(
    oc({
      type: "BlockQuote",
      children: [
        oc({
          type: "Paragraph",
          children: [
            oc({
              type: "Str",
              value: "blockquote"
            })
          ]
        })
      ]
    })
  );
});

test("code", () => {
  const node = parse(`\
[source,ruby]
----
puts 'Hello, world!'
----
`);
  testAST(node);
  expect(node.children[0]).toEqual(
    oc({
      type: "CodeBlock",
      value: "puts 'Hello, world!'"
    })
  );
});

test("headings", () => {
  const node = parse(`\
= Title

== Level 1 Section

Hello, world!

=== Level 2 Section
`);

  testAST(node);
  expect(node.children).toEqual([
    oc({
      type: "Header",
      depth: 1,
      children: [oc({ type: "Str", value: "Title" })]
    }),
    oc({
      type: "Header",
      depth: 2,
      children: [oc({ type: "Str", value: "Level 1 Section" })]
    }),
    oc({
      type: "Paragraph",
      children: [oc({ type: "Str", value: "Hello, world!" })]
    }),
    oc({
      type: "Header",
      depth: 3,
      children: [oc({ type: "Str", value: "Level 2 Section" })]
    })
  ]);
});

test("simple table", () => {
  const node = parse(`\
|===
|A|B
|C|D
|===
`);

  testAST(node);
  expect(node.children).toEqual([
    oc({
      type: "Table",
      children: [
        oc({
          type: "TableRow",
          children: [
            oc({
              type: "TableCell",
              children: [oc({ type: "Str", value: "A" })]
            }),
            oc({
              type: "TableCell",
              children: [oc({ type: "Str", value: "B" })]
            })
          ]
        }),
        oc({
          type: "TableRow",
          children: [
            oc({
              type: "TableCell",
              children: [oc({ type: "Str", value: "C" })]
            }),
            oc({
              type: "TableCell",
              children: [oc({ type: "Str", value: "D" })]
            })
          ]
        })
      ]
    })
  ]);
});
