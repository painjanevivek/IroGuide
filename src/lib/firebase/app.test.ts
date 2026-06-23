import { describe, expect, it } from "vitest";

import { resolveFirebaseAuthDomain } from "./app";

describe("resolveFirebaseAuthDomain", () => {
  it("keeps the configured Firebase domain on local hosts", () => {
    expect(resolveFirebaseAuthDomain(
      "iroguide-7764f.firebaseapp.com",
      "localhost:4310",
      "https://www.iroguide.com",
    )).toBe("iroguide-7764f.firebaseapp.com");

    expect(resolveFirebaseAuthDomain(
      "iroguide-7764f.firebaseapp.com",
      "127.0.0.1:4310",
      "https://www.iroguide.com",
    )).toBe("iroguide-7764f.firebaseapp.com");
  });

  it("uses the live IroGuide host on production domains", () => {
    expect(resolveFirebaseAuthDomain(
      "iroguide-7764f.firebaseapp.com",
      "www.iroguide.com",
      "https://www.iroguide.com",
    )).toBe("www.iroguide.com");

    expect(resolveFirebaseAuthDomain(
      "iroguide-7764f.firebaseapp.com",
      "iroguide.com",
      "https://www.iroguide.com",
    )).toBe("iroguide.com");
  });

  it("keeps preview and unknown hosts on the configured Firebase domain", () => {
    expect(resolveFirebaseAuthDomain(
      "iroguide-7764f.firebaseapp.com",
      "iroguide-preview.vercel.app",
      "https://www.iroguide.com",
    )).toBe("iroguide-7764f.firebaseapp.com");
  });

  it("supports a configured custom site URL", () => {
    expect(resolveFirebaseAuthDomain(
      "project.firebaseapp.com",
      "studio.example.com",
      "https://studio.example.com",
    )).toBe("studio.example.com");
  });
});
