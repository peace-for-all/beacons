import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchOfficialSource,
  inspectFragment,
  isBlockedAddress,
  normalizeVisibleHtml,
  validateFetchTarget,
} from "../scripts/lib/evidence-monitor-core.mjs";

const source = {
  id: "source.example",
  url: "https://example.gov/entry",
  allowedRedirectHosts: [],
  expectedContentType: "html",
};
const policy = {
  fetcherVersion: "official-source-fetch-v1",
  normalizerVersion: "visible-text-v1",
  timeoutMs: 2_000,
  maximumResponseBytes: 10_000,
  maximumRedirects: 2,
};
const check = {
  id: "fragment.example",
  claimIds: ["claim.example"],
  requiredText: ["Ordinary passports", "up to 30 days"],
  maximumSpanCharacters: 200,
};
const publicDns = async () => [{ address: "93.184.216.34", family: 4 }];

test("HTML normalization ignores scripts while preserving visible legal text", () => {
  const normalized = normalizeVisibleHtml(`
    <html><script>Ordinary passports up to 90 days</script>
    <h1>Entry</h1><p>Ordinary passports: up to 30 days.</p></html>
  `);
  assert.doesNotMatch(normalized, /90 days/);
  assert.match(normalized, /Ordinary passports: up to 30 days/);
});

test("HTML normalization decodes typographic apostrophes used by official pages", () => {
  assert.equal(normalizeVisibleHtml("tourist&rsquo;s stay"), "tourist’s stay");
});

test("fragment locators produce one compact traceable proof extract", () => {
  const matched = inspectFragment(
    "Entry rules. Ordinary passports: no visa for visits up to 30 days. Conditions follow.",
    check,
  );
  assert.equal(matched.status, "exact_match");
  assert.match(matched.contextSha256, /^[a-f0-9]{64}$/);
  assert.equal(matched.reasonCode, "configured_text_located");
  assert.equal(matched.evidence.length, 2);
  assert.match(matched.evidence[0].extract, /Ordinary passports/);
  assert.match(matched.evidence[0].extractSha256, /^[a-f0-9]{64}$/);
  assert.ok(matched.evidence.every(({ start, end }) => start < end));

  const ambiguous = inspectFragment(
    "Ordinary passports up to 30 days. Ordinary passports up to 30 days.",
    check,
  );
  assert.equal(ambiguous.status, "ambiguous");
});

test("private, loopback, link-local, documentation, and metadata addresses are blocked", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "192.0.2.1", "198.51.100.4", "203.0.113.9", "::1", "fc00::1", "2001:db8::1"]) {
    assert.equal(isBlockedAddress(address), true, address);
  }
  assert.equal(isBlockedAddress("93.184.216.34"), false);
});

test("target validation rejects credentials, HTTP, and nonstandard ports", async () => {
  await assert.rejects(() => validateFetchTarget("http://example.gov", ["example.gov"], publicDns), /https_required/);
  await assert.rejects(() => validateFetchTarget("https://user@example.gov", ["example.gov"], publicDns), /credentials_forbidden/);
  await assert.rejects(() => validateFetchTarget("https://example.gov:8443", ["example.gov"], publicDns), /nonstandard_port_forbidden/);
  await assert.rejects(() => validateFetchTarget("https://[::1]/", ["[::1]"], publicDns), /non_public_address_blocked/);
  await assert.rejects(() => validateFetchTarget("https://[::ffff:7f00:1]/", ["[::ffff:7f00:1]"], publicDns), /non_public_address_blocked/);
});

test("a successful monitor fetch records hashes and proof-bearing exact matches", async () => {
  const html = "<html><body><h1>Entry rules for foreign visitors</h1><p>Ordinary passports: no visas for visits up to 30 days.</p><p>Border authorities retain all statutory admission powers.</p></body></html>";
  const observation = await fetchOfficialSource({
    source,
    checks: [check],
    policy,
    observedAt: "2026-09-02T10:00:00.000Z",
    dnsLookup: publicDns,
    fetchImpl: async () => new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }),
  });
  assert.equal(observation.status, "reachable");
  assert.match(observation.rawSha256, /^[a-f0-9]{64}$/);
  assert.equal(observation.schemaVersion, 2);
  assert.equal(observation.fragmentChecks[0].status, "exact_match");
  assert.match(observation.fragmentChecks[0].evidence[0].extract, /Ordinary passports/);
  assert.match(observation.fragmentChecks[0].evidence[0].extractSha256, /^[a-f0-9]{64}$/);
});

test("a hostile redirect and a soft CAPTCHA page fail closed", async () => {
  const redirected = await fetchOfficialSource({
    source,
    checks: [check],
    policy,
    observedAt: "2026-09-02T10:00:00.000Z",
    dnsLookup: publicDns,
    fetchImpl: async () => new Response(null, { status: 302, headers: { location: "https://evil.example/steal" } }),
  });
  assert.equal(redirected.status, "blocked");
  assert.equal(redirected.reasonCode, "redirect_host_not_allowed");

  const captcha = await fetchOfficialSource({
    source,
    checks: [check],
    policy,
    observedAt: "2026-09-02T10:00:00.000Z",
    dnsLookup: publicDns,
    fetchImpl: async () => new Response("<html><body>CAPTCHA access check. Please try again after verification.</body></html>", { status: 200, headers: { "content-type": "text/html" } }),
  });
  assert.equal(captcha.status, "parse_failed");
  assert.equal(captcha.reasonCode, "soft_error_page_detected");
});
