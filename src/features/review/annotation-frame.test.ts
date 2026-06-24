import { describe, expect, it } from "vitest";
import { getContainedMediaFrame } from "./annotation-frame";

describe("annotation frame", () => {
  it("centers portrait media inside a wider preview container", () => {
    expect(getContainedMediaFrame({ width: 600, height: 600 }, { width: 400, height: 800 })).toEqual({
      left: 150,
      top: 0,
      width: 300,
      height: 600,
    });
  });

  it("centers landscape media inside a taller preview container", () => {
    expect(getContainedMediaFrame({ width: 600, height: 600 }, { width: 800, height: 400 })).toEqual({
      left: 0,
      top: 150,
      width: 600,
      height: 300,
    });
  });

  it("uses the full container for matching aspect ratios", () => {
    expect(getContainedMediaFrame({ width: 480, height: 320 }, { width: 1200, height: 800 })).toEqual({
      left: 0,
      top: 0,
      width: 480,
      height: 320,
    });
  });

  it("ignores unusable media or container dimensions", () => {
    expect(getContainedMediaFrame({ width: 0, height: 320 }, { width: 1200, height: 800 })).toBeNull();
    expect(getContainedMediaFrame({ width: 480, height: 320 }, { width: 1200, height: 0 })).toBeNull();
  });
});
