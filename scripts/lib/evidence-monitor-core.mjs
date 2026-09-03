import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function decodeHtmlEntities(value) {
  const named = new Map([
    ["amp", "&"], ["apos", "'"], ["gt", ">"], ["lt", "<"],
    ["nbsp", " "], ["quot", '"'], ["laquo", "«"], ["raquo", "»"], ["lsquo", "‘"], ["rsquo", "’"],
    ["ndash", "–"], ["mdash", "—"],
  ]);
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body) => {
    if (body.startsWith("#x")) return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
    if (body.startsWith("#")) return String.fromCodePoint(Number.parseInt(body.slice(1), 10));
    return named.get(body.toLowerCase()) ?? entity;
  });
}

export function normalizeVisibleHtml(html) {
  return decodeHtmlEntities(
    html
      .normalize("NFC")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|td|th|h[1-6]|section|article)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\u00a0/g, " ")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function normalizeForMatch(value) {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

function boundedExtract(text, start, end) {
  const extractStart = Math.max(0, start - 160);
  const extractEnd = Math.min(text.length, end + 160);
  return text.slice(extractStart, extractEnd).slice(0, 900);
}

export function inspectFragment(normalizedText, check) {
  const haystack = normalizeForMatch(normalizedText);
  const matches = check.requiredText.map((required) => {
    const needle = normalizeForMatch(required);
    const positions = [];
    let offset = 0;
    while (offset <= haystack.length) {
      const index = haystack.indexOf(needle, offset);
      if (index < 0) break;
      positions.push(index);
      offset = index + Math.max(needle.length, 1);
    }
    return { needle, positions };
  });
  if (matches.some((match) => match.positions.length === 0)) {
    return {
      id: check.id,
      claimIds: check.claimIds,
      status: "missing",
      reasonCode: "required_text_missing",
    };
  }
  if (matches.some((match) => match.positions.length !== 1)) {
    return {
      id: check.id,
      claimIds: check.claimIds,
      status: "ambiguous",
      reasonCode: "locator_not_unique",
    };
  }
  const start = Math.min(...matches.map((match) => match.positions[0]));
  const end = Math.max(...matches.map((match) => match.positions[0] + match.needle.length));
  if (end - start > check.maximumSpanCharacters) {
    return {
      id: check.id,
      claimIds: check.claimIds,
      status: "ambiguous",
      reasonCode: "required_text_span_too_large",
    };
  }
  const context = haystack.slice(Math.max(0, start - 240), Math.min(haystack.length, end + 240));
  return {
    id: check.id,
    claimIds: check.claimIds,
    status: "exact_match",
    contextSha256: sha256(context),
    contextCharacters: context.length,
    evidence: matches.map((match) => {
      const matchStart = match.positions[0];
      const matchEnd = matchStart + match.needle.length;
      const extract = boundedExtract(haystack, matchStart, matchEnd);
      return { start: matchStart, end: matchEnd, extract, extractSha256: sha256(extract) };
    }),
    reasonCode: "configured_text_located",
  };
}

function isBlockedIpv4(address) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b, c] = parts;
  return a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) || a >= 224;
}

function isBlockedIpv6(address) {
  const value = address.toLowerCase().split("%")[0];
  if (value === "::" || value === "::1") return true;
  if (value.startsWith("fc") || value.startsWith("fd") || /^fe[89ab]/.test(value)) return true;
  if (value.startsWith("ff") || value.startsWith("2001:db8:")) return true;
  if (value.startsWith("::ffff:")) return true;
  return false;
}

export function isBlockedAddress(address) {
  const version = isIP(address);
  return version === 4 ? isBlockedIpv4(address) : version === 6 ? isBlockedIpv6(address) : true;
}

function normalizedHost(hostname) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export async function validateFetchTarget(urlValue, allowedHosts, dnsLookup = lookup) {
  const url = new URL(urlValue);
  if (url.protocol !== "https:") throw new Error("https_required");
  if (url.username || url.password) throw new Error("credentials_forbidden");
  if (url.port && url.port !== "443") throw new Error("nonstandard_port_forbidden");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const allowed = new Set(allowedHosts.map(normalizedHost));
  if (!allowed.has(normalizedHost(url.hostname))) throw new Error("redirect_host_not_allowed");
  const literalVersion = isIP(hostname);
  const addresses = literalVersion
    ? [{ address: hostname }]
    : await dnsLookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new Error("non_public_address_blocked");
  }
  return url;
}

async function readLimitedBody(response, maximumResponseBytes) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumResponseBytes) {
    throw new Error("declared_body_too_large");
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumResponseBytes) {
      await reader.cancel("response_too_large");
      throw new Error("response_too_large");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function expectedMimeMatches(expected, contentType, body) {
  const mime = contentType.split(";")[0].trim().toLowerCase();
  if (expected === "html") return mime === "text/html" || mime === "application/xhtml+xml";
  if (expected === "json") return mime === "application/json" || mime.endsWith("+json");
  if (expected === "pdf") {
    return mime === "application/pdf" && new TextDecoder("latin1").decode(body.slice(0, 5)) === "%PDF-";
  }
  return false;
}

export async function fetchOfficialSource({ source, checks, policy, fetchImpl = fetch, dnsLookup = lookup, observedAt }) {
  const requested = new URL(source.url);
  const allowedHosts = [requested.hostname, ...source.allowedRedirectHosts];
  const redirectChain = [];
  let currentUrl = requested.href;
  let response;
  try {
    for (let redirects = 0; redirects <= policy.maximumRedirects; redirects += 1) {
      await validateFetchTarget(currentUrl, allowedHosts, dnsLookup);
      response = await fetchImpl(currentUrl, {
        method: "GET",
        redirect: "manual",
        headers: {
          accept: source.expectedContentType === "pdf" ? "application/pdf" : "text/html,application/xhtml+xml",
          "user-agent": "BeaconsEvidenceMonitor/2.0 (+evidence-acquisition; traceable-proof)",
        },
        referrerPolicy: "no-referrer",
        signal: AbortSignal.timeout(policy.timeoutMs),
      });
      const location = response.headers.get("location");
      redirectChain.push({ url: currentUrl, status: response.status, ...(location ? { location } : {}) });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      if (!location) throw new Error("redirect_without_location");
      if (redirects === policy.maximumRedirects) throw new Error("too_many_redirects");
      currentUrl = new URL(location, currentUrl).href;
    }
    if (!response) throw new Error("no_response");
    if (!response.ok) throw new Error(`http_${response.status}`);
    const body = await readLimitedBody(response, policy.maximumResponseBytes);
    const contentType = response.headers.get("content-type") ?? "";
    if (!expectedMimeMatches(source.expectedContentType, contentType, body)) {
      throw new Error("content_type_or_magic_mismatch");
    }
    const rawSha256 = sha256(body);
    let normalizedText;
    let normalizedSha256;
    let normalization;
    if (source.expectedContentType === "html") {
      normalizedText = normalizeVisibleHtml(new TextDecoder().decode(body));
      const softError = /\b(captcha|access denied|temporarily unavailable|sign in to continue)\b/i.test(normalizedText.slice(0, 1200));
      if (softError) throw new Error("soft_error_page_detected");
      if (normalizedText.length < 80) throw new Error("normalized_body_too_short");
      normalizedSha256 = sha256(normalizedText);
      normalization = policy.normalizerVersion;
    } else if (source.expectedContentType === "json") {
      normalizedText = JSON.stringify(JSON.parse(new TextDecoder().decode(body)));
      normalizedSha256 = sha256(normalizedText);
      normalization = "canonical-json-v1";
    } else {
      normalizedSha256 = rawSha256;
      normalization = "binary-pdf-v1";
    }
    return {
      schemaVersion: 2,
      id: `observation.${source.id.replace(/^source\./, "")}.${sha256(`${observedAt}:${source.id}`).slice(0, 16)}`,
      sourceId: source.id,
      observedAt,
      requestedUrl: requested.href,
      finalUrl: currentUrl,
      redirectChain,
      status: "reachable",
      httpStatus: response.status,
      contentType,
      bytes: body.byteLength,
      rawSha256,
      normalizedSha256,
      normalization,
      fetcherVersion: policy.fetcherVersion,
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
      reasonCode: "observation_recorded_monitor_only",
      fragmentChecks: normalizedText
        ? checks.map((check) => inspectFragment(normalizedText, check))
        : checks.map((check) => ({
            id: check.id,
            claimIds: check.claimIds,
            status: "not_evaluated",
            reasonCode: "extractor_not_available_for_content_type",
          })),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown_fetch_failure";
    const reasonCode = /^getaddrinfo\b/i.test(errorMessage) ? "dns_lookup_failed"
      : /aborted due to timeout|timed out/i.test(errorMessage) ? "fetch_timeout"
        : /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(errorMessage) ? errorMessage
          : "fetch_failed";
    const status = reasonCode.startsWith("http_") ? "unavailable"
      : ["redirect_host_not_allowed", "non_public_address_blocked", "https_required", "credentials_forbidden", "nonstandard_port_forbidden"].includes(reasonCode)
        ? "blocked"
        : "parse_failed";
    return {
      schemaVersion: 2,
      id: `observation.${source.id.replace(/^source\./, "")}.${sha256(`${observedAt}:${source.id}`).slice(0, 16)}`,
      sourceId: source.id,
      observedAt,
      requestedUrl: requested.href,
      finalUrl: currentUrl,
      redirectChain,
      status,
      httpStatus: response?.status ?? null,
      contentType: response?.headers.get("content-type") ?? null,
      bytes: null,
      rawSha256: null,
      normalizedSha256: null,
      normalization: null,
      fetcherVersion: policy.fetcherVersion,
      etag: response?.headers.get("etag") ?? null,
      lastModified: response?.headers.get("last-modified") ?? null,
      reasonCode,
      fragmentChecks: checks.map((check) => ({
        id: check.id,
        claimIds: check.claimIds,
        status: "not_evaluated",
        reasonCode: "source_observation_failed",
      })),
    };
  }
}
