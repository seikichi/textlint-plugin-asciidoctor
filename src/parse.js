// LICENSE : MIT
"use strict";

const asciidoctor = require("@asciidoctor/core")();

class Converter {
  convert(text) {
    const doc = asciidoctor.load(text, { sourcemap: true });

    // NOTE: doc.$source_lines() does not contain some whitespaces and lines...
    this.lines = text.split(/\n/);
    this.chars = [0];
    for (let line of this.lines) {
      this.chars.push(this.chars[this.chars.length - 1] + line.length + 1);
    }

    const elements = this.convertElement(doc, {
      min: 1,
      max: this.lines.length,
      update: true
    });
    if (elements.length === 0) {
      return this.createEmptyDocument();
    }
    return elements[0];
  }

  convertElement(elem, lineno) {
    if (elem.context === "document") {
      return this.convertDocument(elem, lineno);
    } else if (elem.context === "paragraph" || elem.context === "literal") {
      return this.convertParagraph(elem, lineno);
    } else if (elem.context === "ulist" || elem.context === "olist") {
      return this.convertList(elem, lineno);
    } else if (elem.context === "list_item") {
      return this.convertListItem(elem, lineno);
    } else if (elem.context === "dlist") {
      return this.convertDefinitionList(elem, lineno);
    } else if (elem.context === "quote") {
      return this.convertQuote(elem, lineno);
    } else if (elem.context === "listing") {
      return this.convertListing(elem, lineno);
    } else if (elem.context === "section") {
      return this.convertSection(elem, lineno);
    } else if (elem.context === "table") {
      return this.convertTable(elem, lineno);
    } else if (elem.context === "admonition" || elem.context === "example") {
      return this.convertElementList(elem.$blocks(), {
        ...lineno,
        update: false
      });
    }
    return [];
  }

  convertDocument(elem, lineno) {
    const raw = elem.$source();
    let children = this.convertElementList(elem.$blocks(), lineno);
    if (!elem.$header()["$nil?"]()) {
      children = [this.convertHeader(elem.$header(), lineno), ...children];
    }
    if (children.length === 0) {
      return [];
    }
    const loc = {
      start: children[0].loc.start,
      end: children[children.length - 1].loc.end
    };
    const range = this.locationToRange(loc);
    return [{ type: "Document", children, loc, range, raw }];
  }

  convertHeader(elem, lineno) {
    const raw = elem.title;
    const loc = this.findLocation([raw], { ...lineno, type: "Header" });
    const range = this.locationToRange(loc);
    return {
      type: "Header",
      depth: elem.$level() + 1,
      children: [{ type: "Str", value: elem.title, loc, range, raw }],
      loc,
      range,
      raw
    };
  }

  convertSection(elem, lineno) {
    const raw = elem.title;
    const loc = this.findLocation([raw], { ...lineno, type: "Header" });
    if (!loc) {
      return [];
    }
    const range = this.locationToRange(loc);
    const header = {
      type: "Header",
      depth: elem.$level() + 1,
      children: [{ type: "Str", value: elem.title, loc, range, raw }],
      loc,
      range,
      raw
    };
    const children = this.convertElementList(elem.$blocks(), lineno);
    return [header, ...children];
  }

  convertParagraph(elem, lineno) {
    const raw = elem.$source();
    const loc = this.findLocation(elem.$lines(), {
      ...lineno,
      type: "Paragraph"
    });
    if (!loc) {
      return [];
    }
    const range = this.locationToRange(loc);
    return [
      {
        type: "Paragraph",
        children: [{ type: "Str", value: raw, loc, range, raw }],
        loc,
        range,
        raw
      }
    ];
  }

  convertQuote(elem, lineno) {
    const raw = ""; // TODO: fix asciidoc/asciidoc
    const children = this.convertElementList(elem.$blocks(), {
      ...lineno,
      update: false
    });
    if (children.length === 0) {
      return [];
    }
    return [
      { type: "BlockQuote", children, raw, ...this.locAndRangeFrom(children) }
    ];
  }

  convertListing(elem, lineno) {
    const raw = elem.$source();
    const loc = this.findLocation(elem.$lines(), {
      ...lineno,
      type: "CodeBlock"
    });
    if (!loc) {
      return [];
    }
    const range = this.locationToRange(loc);
    const attributes =
      typeof elem.getAttributes === "function" ? elem.getAttributes() : {};
    return [
      {
        type: "CodeBlock",
        lang: attributes.language,
        value: raw,
        loc,
        range,
        raw
      }
    ];
  }

  convertList(elem, lineno) {
    const raw = ""; // TODO: fix asciidoc/asciidoc
    const children = this.convertElementList(elem.$blocks(), {
      ...lineno,
      update: false
    });
    if (children.length === 0) {
      return [];
    }
    return [{ type: "List", children, raw, ...this.locAndRangeFrom(children) }];
  }

  convertDefinitionList(elem, lineno) {
    const raw = ""; // TODO: fix asciidoc/asciidoc
    const concat = Array.prototype.concat;
    const blocks = concat.apply(
      [],
      elem.$blocks().map(([terms, item]) => [...terms, item])
    );
    const children = this.convertElementList(blocks, {
      ...lineno,
      update: false
    });
    if (children.length === 0) {
      return [];
    }
    return [{ type: "List", children, raw, ...this.locAndRangeFrom(children) }];
  }

  convertListItem(elem, lineno) {
    const raw = ""; // TODO: fix asciidoc/asciidoc
    let children = this.convertElementList(elem.$blocks(), lineno);
    if (!elem.text["$nil?"]()) {
      children = [...this.createParagraph(elem.text, lineno), ...children];
    }
    if (children.length === 0) {
      return [];
    }
    return [
      {
        type: "ListItem",
        children,
        raw,
        ...this.locAndRangeFrom(children)
      }
    ];
  }

  convertTableCell(elem, lineno) {
    const raw = elem.text;
    const loc = this.findLocation(raw.split(/\n/), {
      ...lineno,
      type: "TableCell"
    });
    if (!loc) {
      return [];
    }
    const range = this.locationToRange(loc);

    let children = [];
    if (elem.style === "asciidoc") {
      children = this.convertElementList(
        elem.$inner_document().$blocks(),
        lineno
      );
    } else {
      children = [
        {
          type: "Str",
          value: raw,
          loc,
          range,
          raw
        }
      ];
    }

    return [
      {
        type: "TableCell",
        children,
        loc,
        range,
        raw
      }
    ];
  }

  convertTableRow(row, lineno) {
    let children = [];
    for (let cell of row) {
      // If the cell has a preceding sibling and the sibling is on the same
      // line number, add an offset to the lineno variable so that
      // findLocation() begins its search from the end of the preceding sibling.
      lineno.min = cell.getLineNumber();
      if (children.length > 0) {
        const sibling = children[children.length - 1];
        if (sibling.loc.end.line === lineno.min) {
          lineno.startIdx = sibling.loc.end.column;
        } else {
          lineno.startIdx = 0; // Else, search from the beginning of the line.
        }
      }
      children = [...children, ...this.convertTableCell(cell, lineno)];
    }
    if (children.length === 0) {
      return [];
    }
    const loc = {
      start: children[0].loc.start,
      end: children[children.length - 1].loc.end
    };
    const range = this.locationToRange(loc);
    return [
      {
        type: "TableRow",
        children,
        loc,
        range,
        raw: ""
      }
    ];
  }

  convertTable(elem, lineno) {
    let children = [];

    for (let row of elem.getBodyRows()) {
      // Set the minimum line number to the line number of
      // the first cell.  Making this change prevents the
      // findLocation() function from locating text in this
      // row as a substring of a preceding row.
      lineno.min = row[0].getLineNumber();
      children = [
        ...children,
        ...this.convertTableRow(row, { ...lineno, update: false })
      ];
    }
    if (children.length === 0) {
      return [];
    }
    const loc = {
      start: children[0].loc.start,
      end: children[children.length - 1].loc.end
    };
    const range = this.locationToRange(loc);
    return [
      {
        type: "Table",
        children,
        loc,
        range,
        raw: ""
      }
    ];
  }

  createParagraph(raw, lineno) {
    const loc = this.findLocation(raw.split(/\n/), {
      ...lineno,
      type: "Paragraph"
    });
    if (!loc) {
      return [];
    }
    const range = this.locationToRange(loc);
    return [
      {
        type: "Paragraph",
        children: [{ type: "Str", value: raw, loc, range, raw }],
        loc,
        range,
        raw
      }
    ];
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
    let children = [];
    for (let i = 0; i < elements.length; i++) {
      let next = { min, max, update };
      // Not updating definitely causes trouble.
      // I can't find a case in which updating causes trouble.
      //  if (update) {
      next.min = elements[i].$lineno();
      if (i + 1 < elements.length) {
        next.max = elements[i + 1].$lineno();
      }
      // }
      children = children.concat(this.convertElement(elements[i], next));
    }
    return children;
  }

  findLocation(lines, { min, max, type, startIdx }) {
    for (let i = min; i + lines.length - 1 <= max; i++) {
      let found = true;
      let offset = 0; // see "comment in paragraph" test case.
      startIdx = startIdx || 0; // index into the line to begin the search
      for (let j = 0; j < lines.length; j++) {
        while (
          type !== "CodeBlock" &&
          this.lines[i + j - 1 + offset].match(/^\/\//)
        ) {
          offset++;
        }
        if (this.lines[i + j - 1 + offset].indexOf(lines[j], startIdx) === -1) {
          found = false;
          break;
        }
      }
      if (!found) {
        continue;
      }

      const lastLine = lines[lines.length - 1];
      const endLineNo = i + lines.length - 1 + offset;
      const endColumn =
        this.lines[endLineNo - 1].indexOf(lastLine) + lastLine.length;
      const column = this.lines[i - 1].indexOf(lines[0]);
      return {
        // If the lines starts with //, set 0 instead of -1
        start: { line: i, column: column === -1 ? 0 : column },
        end: { line: endLineNo, column: endColumn }
      };
    }
    return null;
  }

  createEmptyDocument() {
    return {
      type: "Document",
      children: [],
      range: [0, 0],
      loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
      raw: ""
    };
  }
}

export default function parse(text) {
  return new Converter().convert(text);
}
