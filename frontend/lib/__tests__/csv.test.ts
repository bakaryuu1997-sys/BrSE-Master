import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("parses a simple CRLF table into header-keyed records", () => {
    const rows = parseCsv("a,b\r\n1,2\r\n3,4");
    expect(rows).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("keeps commas and newlines inside quoted cells", () => {
    const rows = parseCsv('name,note\r\n"Smith, John","line1\nline2"');
    expect(rows).toEqual([{ name: "Smith, John", note: "line1\nline2" }]);
  });

  it("unescapes doubled quotes", () => {
    const rows = parseCsv('x\r\n"a""b"');
    expect(rows).toEqual([{ x: 'a"b' }]);
  });

  it("trims cell whitespace and skips fully blank rows", () => {
    const rows = parseCsv("a,b\r\n  hi  ,  there  \r\n,\r\nx,y");
    expect(rows).toEqual([
      { a: "hi", b: "there" },
      { a: "x", b: "y" },
    ]);
  });

  it("returns an empty array when there is no header", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("fills missing trailing columns with empty strings", () => {
    const rows = parseCsv("a,b,c\r\n1,2");
    expect(rows).toEqual([{ a: "1", b: "2", c: "" }]);
  });
});
