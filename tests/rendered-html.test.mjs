import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Resource360 prototype", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>EXL Salesforce COE Resource360<\/title>/i);
  assert.match(html, /Resource360/);
  assert.match(html, /Role-aware home/);
  assert.match(html, /All screens/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("contains exactly 103 unique PRD screens", async () => {
  const source = await readFile(new URL("../app/screen-data.ts", import.meta.url), "utf8");
  const ids = [...source.matchAll(/^\s*s\("([A-Z]+[A-Z0-9-]*)"/gm)].map((match) => match[1]);
  assert.equal(ids.length, 103);
  assert.equal(new Set(ids).size, 103);
  for (const prefix of ["GLB-", "ENG-", "STFUI-", "SKLUI-", "BUDUI-", "TIMEUI-", "CMD-", "ADMUI-", "AIUI-"]) {
    assert.ok(ids.some((id) => id.startsWith(prefix)), `missing ${prefix} screens`);
  }
});

test("removes the disposable starter preview", async () => {
  await assert.rejects(access(new URL("../app/_sites-preview", templateRoot)));
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.match(layout, /EXL Salesforce COE Resource360/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
