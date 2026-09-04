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
    ["/en", "Candidate destination map", "Карта возможных направлений", "en"],
    ["/en/reviews", "Evidence review", "Проверка доказательств", "en"],
    ["/en/monitoring", "Official sources, captured", "Официальные источники", "en"],
    ["/en/methodology", "Automation retrieves facts", "Автоматика извлекает факты", "en"],
    ["/en/changes", "Semantic changelog", "Журнал смысловых изменений", "en"],
    ["/ru", "Карта возможных направлений", "Candidate destination map", "ru"],
    ["/ru/reviews", "Проверка доказательств", "Evidence review", "ru"],
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

test("review pages use neutral technical headings", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("review-copy", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const context = { waitUntil() {}, passThroughOnException() {} };
  const pages = [
    ["/en/reviews", ["Evidence review", "Fact and evidence status", "Next automated checks", "Automated publication checks"], ["PROOF EXPLORER", "Facts first", "What automation tries next", "Authoritative automation"]],
    ["/ru/reviews", ["Проверка доказательств", "Статус фактов и доказательств", "Следующие автоматические проверки", "Автоматическая проверка публикации"], ["ПРОВОДНИК ПО ДОКАЗАТЕЛЬСТВАМ", "Сначала факты", "Что автоматика попробует дальше", "Авторитетная автоматика"]],
  ];
  for (const [path, expected, absent] of pages) {
    const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), env, context);
    assert.equal(response.status, 200, path);
    const visibleHtml = (await response.text()).replaceAll(/<script[\s\S]*?<\/script>/gi, "");
    for (const heading of expected) assert.ok(visibleHtml.includes(heading), `${path}: ${heading}`);
    for (const heading of absent) assert.ok(!visibleHtml.includes(heading), `${path}: ${heading}`);
  }
});

test("static page header labels use sentence case", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("header-case", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const context = { waitUntil() {}, passThroughOnException() {} };
  const pages = [
    ["/en/reviews", "Evidence review", "EVIDENCE REVIEW"],
    ["/en/monitoring", "Evidence acquisition", "EVIDENCE ACQUISITION"],
    ["/en/methodology", "Public method", "PUBLIC METHOD"],
    ["/en/changes", "Semantic changelog", "SEMANTIC CHANGELOG"],
    ["/ru/reviews", "Проверка доказательств", "ПРОВЕРКА ДОКАЗАТЕЛЬСТВ"],
    ["/ru/monitoring", "Сбор доказательств", "СБОР ДОКАЗАТЕЛЬСТВ"],
    ["/ru/methodology", "Публичная методика", "ПУБЛИЧНАЯ МЕТОДИКА"],
    ["/ru/changes", "Журнал смысловых изменений", "ЖУРНАЛ СМЫСЛОВЫХ ИЗМЕНЕНИЙ"],
  ];
  for (const [path, expected, absent] of pages) {
    const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), env, context);
    assert.equal(response.status, 200, path);
    const visibleHtml = (await response.text()).replaceAll(/<script[\s\S]*?<\/script>/gi, "");
    assert.ok(visibleHtml.includes(`<p class="eyebrow page-eyebrow">${expected}</p>`), `${path}: ${expected}`);
    assert.ok(!visibleHtml.includes(absent), `${path}: ${absent}`);
  }
});

test("redirects every unlocalized entry point to Russian", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("redirects", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const context = { waitUntil() {}, passThroughOnException() {} };
  for (const [path, location] of [["/", "/ru"], ["/reviews", "/ru/reviews"], ["/monitoring", "/ru/monitoring"], ["/methodology", "/ru/methodology"], ["/changes", "/ru/changes"]]) {
    const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" }, redirect: "manual" }), env, context);
    assert.ok([307, 308].includes(response.status), `${path}: ${response.status}`);
    assert.equal(new URL(response.headers.get("location"), "http://localhost").pathname, location);
  }
});

test("shows only the link to the alternative language", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("locale-switch", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const context = { waitUntil() {}, passThroughOnException() {} };
  for (const [path, expectedHref, expectedLabel, absentLabel] of [["/ru", "/en", "EN", "RU"], ["/en", "/ru", "RU", "EN"]]) {
    const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), env, context);
    assert.equal(response.status, 200, path);
    const html = (await response.text()).replaceAll(/<script[\s\S]*?<\/script>/gi, "");
    const switcher = html.match(/<div class="language-switch"[\s\S]*?<\/div>/)?.[0] ?? "";
    assert.match(switcher, new RegExp(`href="${expectedHref}"`), path);
    assert.match(switcher, new RegExp(`>${expectedLabel}<`), path);
    assert.doesNotMatch(switcher, new RegExp(`>${absentLabel}<`), path);
    assert.equal((switcher.match(/<a\b/g) ?? []).length, 1, path);
  }
});
