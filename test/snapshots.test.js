const fs = require("fs");
const path = require("path");
import parse from "../src/parse";
const fixturesDir = path.join(__dirname, "snapshot_fixtures");

describe("Snapshot testing", () => {
  fs.readdirSync(fixturesDir).map(caseName => {
    const normalizedTestName = caseName.replace(/-/g, " ");
    it(`Test Snapshot:${normalizedTestName}`, function() {
      const fixtureFileName = path.join(fixturesDir, caseName);
      const actualContent = fs.readFileSync(fixtureFileName, "utf-8");
      const actual = parse(actualContent);
      expect(actual).toMatchSnapshot();
    });
  });
});
