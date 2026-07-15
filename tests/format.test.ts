import { describe, expect, it } from "vitest";
import {
  centsToEurosInput,
  formatBytes,
  parseEurosToCents,
} from "~/lib/format";

describe("parseEurosToCents", () => {
  it("accepte les formats français usuels", () => {
    expect(parseEurosToCents("7900")).toBe(790000);
    expect(parseEurosToCents("7 900")).toBe(790000);
    expect(parseEurosToCents("7900,50")).toBe(790050);
    expect(parseEurosToCents("7900.50")).toBe(790050);
    expect(parseEurosToCents("7 900,50 €")).toBe(790050);
    expect(parseEurosToCents("0")).toBe(0);
  });

  it("refuse les entrées invalides", () => {
    expect(parseEurosToCents("")).toBeNull();
    expect(parseEurosToCents("abc")).toBeNull();
    expect(parseEurosToCents("-50")).toBeNull();
  });
});

describe("centsToEurosInput", () => {
  it("restitue une saisie éditable", () => {
    expect(centsToEurosInput(790000)).toBe("7900");
    expect(centsToEurosInput(790050)).toBe("7900,50");
    expect(centsToEurosInput(null)).toBe("");
  });
});

describe("formatBytes", () => {
  it("formate les tailles lisiblement", () => {
    expect(formatBytes(500)).toBe("500 o");
    expect(formatBytes(2048)).toBe("2 Ko");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 Mo");
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe("2.00 Go");
  });
});
