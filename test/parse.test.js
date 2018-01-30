import test from "ava";
import parse from "../src/parse";

test("single word", t => {
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
  t.deepEqual(node, expected);
});

test("multiline paragraph", t => {
  const node = parse("text\ntext\n");
  const expected = {
    type: "Str",
    value: "text\ntext",
    loc: { start: { line: 1, column: 0 }, end: { line: 2, column: 4 } },
    range: [0, 9],
    raw: "text\ntext"
  };
  t.deepEqual(node.children[0].children[0], expected);
});

test("unordered list", t => {
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
        raw,
      },
    ],
    loc,
    range,
    raw,
  };
  t.deepEqual(node.children[0].children[0], expected);
});
