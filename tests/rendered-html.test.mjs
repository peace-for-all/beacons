import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/en", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("publishes one-language English and Russian project routes", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("pages", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const context = { waitUntil() {}, passThroughOnException() {} };
  const pages = [
    ["/en", "Seven researched possibilities, shown honestly", "Семь исследованных возможностей", "en"],
    ["/en/reviews", "Proof explorer", "Проводник по доказательствам", "en"],
    ["/en/monitoring", "Official sources, captured", "Официальные источники", "en"],
    ["/en/methodology", "Automation retrieves facts", "Автоматика извлекает факты", "en"],
    ["/en/changes", "Semantic changelog", "Журнал смысловых изменений", "en"],
    ["/ru", "Семь исследованных возможностей", "Seven researched possibilities, shown honestly", "ru"],
    ["/ru/reviews", "Проводник по доказательствам", "Proof explorer", "ru"],
    ["/ru/monitoring", "Официальные источники", "Official sources", "ru"],
    ["/ru/methodology", "Автоматика извлекает факты", "Automation retrieves facts", "ru"],
    ["/ru/changes", "Журнал смысловых изменений", "Semantic changelog", "ru"],
  ];
  for (const [path, expected, absent, lang] of pages) {
    const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), env, context);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    const visibleHtml = html.replaceAll(/<script[\s\S]*?<\/script>/gi, "");
    assert.match(html, new RegExp(`<html[^>]+lang=["']${lang}["']`, "i"), path);
    assert.match(visibleHtml, new RegExp(expected, "i"), path);
    assert.doesNotMatch(visibleHtml, new RegExp(absent, "i"), path);
  }
});

test("redirects unlocalized entry points to English", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("redirects", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const context = { waitUntil() {}, passThroughOnException() {} };
  for (const [path, location] of [["/", "/en"], ["/reviews", "/en/reviews"], ["/monitoring", "/en/monitoring"]]) {
    const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" }, redirect: "manual" }), env, context);
    assert.ok([307, 308].includes(response.status), `${path}: ${response.status}`);
    assert.equal(new URL(response.headers.get("location"), "http://localhost").pathname, location);
  }
});
