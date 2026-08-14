import { readJSONFile } from "../../src/auth/GMAuth";
import fs from "fs";

jest.mock("fs");
const mockReadFileSync = fs.readFileSync as jest.Mock;

describe("readJSONFile", () => {
  const payload = { access_token: "abc", token_type: "bearer" };
  const json = JSON.stringify(payload);

  test("parses normal JSON", () => {
    mockReadFileSync.mockReturnValue(json);
    expect(readJSONFile("/fake/path.json")).toEqual(payload);
  });

  test("strips UTF-8 BOM before parsing", () => {
    mockReadFileSync.mockReturnValue("\uFEFF" + json);
    expect(readJSONFile("/fake/path.json")).toEqual(payload);
  });

  test("throws on malformed JSON", () => {
    mockReadFileSync.mockReturnValue("{bad json}");
    expect(() => readJSONFile("/fake/path.json")).toThrow();
  });
});
