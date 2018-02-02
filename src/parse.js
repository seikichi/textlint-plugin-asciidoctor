// LICENSE : MIT
"use strict";

const asciidoctor = require("asciidoctor.js")();

class Converter {
  convert(text) {
    const doc = asciidoctor.load(text, { sourcemap: true });
    this.lines = doc.$source_lines();
    this.chars = [0];
    for (let line of this.lines) {
      this.chars.push(this.chars[this.chars.length - 1] + line.length + 1);
    }
    return this.convertElement(doc, {
      min: 1,
      max: this.lines.length,
      update: true
    });
  }

  convertElement(elem, lineno) {
    if (elem.context === "document") {
      return this.convertDocument(elem, lineno);
    } else if (elem.context === "paragraph") {
      return this.convertParagraph(elem, lineno);
    } else if (elem.context === "ulist" || elem.context === "olist") {
      return this.convertList(elem, lineno);
    } else if (elem.context === "list_item") {
      return this.convertListItem(elem, lineno);
    } else if (elem.context === "dlist") {
      return this.convertDefinitionList(elem, lineno);
    } else if (elem.context === "quote") {
      return this.convertQuote(elem, lineno);
    }
    return null;
  }

  convertDocument(elem, lineno) {
    const raw = elem.$source();
    const children = this.convertElementList(elem.$blocks(), lineno);
    if (children.length === 0) {
      return null;
    }
    const loc = {
      start: children[0].loc.start,
      end: children[children.length - 1].loc.end
    };
    const range = this.locationToRange(loc);
    return { type: "Document", children, loc, range, raw };
  }

  convertParagraph(elem, { min, max }) {
    const raw = elem.$source();
    const loc = this.findLocation(elem.$lines(), { min, max });
    if (!loc) {
      return null;
    }
    const range = this.locationToRange(loc);
    return {
      type: "Paragraph",
      children: [{ type: "Str", value: raw, loc, range, raw }],
      loc,
      range,
      raw
    };
  }

  convertQuote(elem, { min, max }) {
    const raw = null; // TODO: fix asciidoc/asciidoc
    const children = this.convertElementList(elem.$blocks(), { min, max, update: false });
    if (children.length === 0) {
      return null;
    }
    return { type: "BlockQuote", children, raw, ...this.locAndRangeFrom(children) };
  }

  convertList(elem, { min, max }) {
    const raw = null; // TODO: fix asciidoc/asciidoc
    const children = this.convertElementList(elem.$blocks(), {
      min,
      max,
      update: false
    });
    if (children.length === 0) {
      return null;
    }
    return { type: "List", children, raw, ...this.locAndRangeFrom(children) };
  }

  convertDefinitionList(elem, { min, max }) {
    const raw = null; // TODO: fix asciidoc/asciidoc
    const concat = Array.prototype.concat;
    const blocks = concat.apply(
      [],
      elem.$blocks().map(([terms, item]) => [...terms, item])
    );
    const children = this.convertElementList(blocks, {
      min,
      max,
      update: false
    });
    if (children.length === 0) {
      return null;
    }
    return { type: "List", children, raw, ...this.locAndRangeFrom(children) };
  }

  convertListItem(elem, lineno) {
    const raw = null; // TODO: fix asciidoc/asciidoc
    const p = this.createParagraph(elem.text, lineno);
    const blocks = this.convertElementList(elem.$blocks(), lineno);
    const children = [p, ...blocks];
    return {
      type: "ListItem",
      children,
      raw,
      ...this.locAndRangeFrom(children)
    };
  }

  createParagraph(raw, lineno) {
    const loc = this.findLocation(raw.split(/\n/), lineno);
    const range = this.locationToRange(loc);
    return {
      type: "Paragraph",
      children: [{ type: "Str", value: raw, loc, range, raw }],
      loc,
      range,
      raw
    };
  }

  locAndRangeFrom(children) {
    const loc = {
      start: children[0].loc.start,
      end: children[children.length - 1].loc.end
    };
    const range = this.locationToRange(loc);
    return { loc, range };
  }

  positionToIndex({ line, column }) {
    return this.chars[line - 1] + column;
  }

  locationToRange({ start, end }) {
    return [this.positionToIndex(start), this.positionToIndex(end)];
  }

  convertElementList(elements, { min, max, update }) {
    const children = [];
    for (let i = 0; i < elements.length; i++) {
      let next = { min, max, update };
      if (update) {
        next.min = elements[i].$lineno();
        if (i + 1 < elements.length) {
          next.max = elements[i + 1].$lineno();
        }
      }
      const child = this.convertElement(elements[i], next);
      if (child) {
        children.push(child);
      }
    }
    return children;
  }

  findLocation(lines, { min, max }) {
    for (let i = min; i + lines.length - 1 <= max; i++) {
      let found = true;
      for (let j = 0; j < lines.length; j++) {
        if (this.lines[i + j - 1].indexOf(lines[j]) === -1) {
          found = false;
          break;
        }
      }
      if (!found) {
        continue;
      }

      const lastLine = lines[lines.length - 1];
      const endLineNo = i + lines.length - 1;
      const endColumn =
        this.lines[endLineNo - 1].indexOf(lastLine) + lastLine.length;
      return {
        start: { line: i, column: this.lines[i - 1].indexOf(lines[0]) },
        end: { line: endLineNo, column: endColumn }
      };
    }
    return null;
  }
}

export default function parse(text) {
  return new Converter().convert(text);
}