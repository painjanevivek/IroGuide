import { describe, expect, it } from "vitest";
import { readFormDataBody, readJsonBody, RequestBodyTooLargeError } from "./request-body";

describe("bounded request bodies", () => {
  it("rejects a declared oversized body before parsing its contents", async () => {
    let pulled = false;
    const body = new ReadableStream({
      pull(controller) {
        pulled = true;
        controller.enqueue(new TextEncoder().encode("{}"));
        controller.close();
      },
    });
    const request = new Request("https://example.test/api", {
      body,
      headers: { "content-length": "1000", "content-type": "application/json" },
      method: "POST",
      duplex: "half",
    } as RequestInit);

    await expect(readJsonBody(request, 32)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
    // The Request implementation may eagerly ask the stream for a chunk, but
    // the parser still rejects from the declared budget before decoding it.
    expect(pulled).toBe(true);
  });

  it("enforces the streamed byte count when content-length is missing", async () => {
    const request = new Request("https://example.test/api", {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(20));
          controller.enqueue(new Uint8Array(20));
          controller.close();
        },
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
      duplex: "half",
    } as RequestInit);

    await expect(readJsonBody(request, 32)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it("does not trust an understated content-length header", async () => {
    const request = new Request("https://example.test/api", {
      body: JSON.stringify({ value: "x".repeat(100) }),
      headers: { "content-length": "2", "content-type": "application/json" },
      method: "POST",
    });

    await expect(readJsonBody(request, 32)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it("parses bounded JSON and multipart bodies", async () => {
    const jsonRequest = new Request("https://example.test/api", {
      body: JSON.stringify({ value: "ok" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    await expect(readJsonBody(jsonRequest, 64)).resolves.toEqual({ value: "ok" });

    const form = new FormData();
    form.set("category", "website");
    const formRequest = new Request("https://example.test/api", { body: form, method: "POST" });
    const parsed = await readFormDataBody(formRequest, 1024);
    expect(parsed.get("category")).toBe("website");
  });
});
