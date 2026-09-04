import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";

import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "silent",
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});
const { evaluateLegalTime, legalTimeInputSchema } = await vite.ssrLoadModule("/lib/domain/legal-time.ts");
after(async () => vite.close());

function rule(overrides = {}) {
  return {
    schemaVersion: 2,
    allowedDays: 30,
    entryDay: "included",
    exitDay: "included",
    windowAnchor: "entry",
    dayCounting: "calendar_days",
    nonWorkingDayAdjustment: "none",
    legalTimezone: "Europe/Belgrade",
    exceptions: [],
    registration: {
      trigger: "arrival",
      withinHours: 24,
      responsibleParty: "accommodation_provider_or_host",
    },
    ...overrides,
  };
}

test("a 30-day inclusive stay ends on day 30 and registration uses an exact 24-hour boundary", () => {
  const result = evaluateLegalTime({
    arrivalOn: "2026-10-25",
    arrivalInstant: "2026-10-25T00:30:00.000+02:00",
    priorStayDates: [],
    registrationArrangement: "paid_accommodation",
    rule: rule(),
  });
  assert.equal(result.state, "calculated");
  assert.equal(result.availableDays, 30);
  assert.equal(result.lastLawfulStayDate, "2026-11-23");
  assert.equal(result.registrationDueAt, "2026-10-25T22:30:00.000Z");
  assert.equal(result.registrationResponsibleParty, "accommodation_provider_or_host");
});

test("rolling-window prior dates are counted by calendar date and can exhaust the allowance", () => {
  const priorStayDates = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 8, 1 + index));
    return date.toISOString().slice(0, 10);
  });
  const result = evaluateLegalTime({
    arrivalOn: "2026-10-01",
    arrivalInstant: "2026-10-01T12:00:00.000+02:00",
    priorStayDates,
    registrationArrangement: "private_host",
    rule: rule({ windowDays: 180, windowAnchor: "each_day_of_stay" }),
  });
  assert.equal(result.state, "blocked");
  assert.equal(result.availableDays, 0);
  assert.deepEqual(result.reasonCodes, ["no_lawful_stay_days_available"]);
});

test("missing dates, unresolved exceptions, working-day rules, and invalid timezones fail closed", () => {
  assert.equal(evaluateLegalTime({ priorStayDates: [], registrationArrangement: "paid_accommodation", rule: rule() }).state, "not_evaluated");
  assert.equal(evaluateLegalTime({
    arrivalOn: "2026-09-03",
    priorStayDates: [],
    registrationArrangement: "paid_accommodation",
    rule: rule({
      exceptions: [{
        id: "exception.unresolved",
        effect: "not_established",
        description: { en: "An exception is unresolved.", ru: "Исключение не установлено." },
      }],
    }),
  }).state, "not_evaluated");
  assert.equal(evaluateLegalTime({
    arrivalOn: "2026-09-03",
    priorStayDates: [],
    registrationArrangement: "paid_accommodation",
    rule: rule({ dayCounting: "working_days", nonWorkingDayAdjustment: "not_established" }),
  }).state, "not_evaluated");
  assert.equal(legalTimeInputSchema.safeParse({
    arrivalOn: "2026-09-03",
    priorStayDates: [],
    registrationArrangement: "paid_accommodation",
    rule: rule({ legalTimezone: "Not/A_Timezone" }),
  }).success, false);
});

test("duplicate prior-stay dates are rejected instead of double-counted", () => {
  assert.equal(legalTimeInputSchema.safeParse({
    arrivalOn: "2026-09-03",
    priorStayDates: ["2026-08-01", "2026-08-01"],
    registrationArrangement: "paid_accommodation",
    rule: rule({ windowDays: 180, windowAnchor: "each_day_of_stay" }),
  }).success, false);
});

test("registration responsibility follows the declared accommodation arrangement", () => {
  const selfArranged = evaluateLegalTime({
    arrivalOn: "2026-10-01",
    arrivalInstant: "2026-10-01T12:00:00.000+02:00",
    priorStayDates: [],
    registrationArrangement: "self_arranged",
    rule: rule({ registration: { trigger: "arrival", withinHours: 24, responsibleParty: "traveller" } }),
  });
  assert.equal(selfArranged.state, "calculated");
  assert.equal(selfArranged.registrationResponsibleParty, "traveller");

  const mismatch = evaluateLegalTime({
    arrivalOn: "2026-10-01",
    arrivalInstant: "2026-10-01T12:00:00.000+02:00",
    priorStayDates: [],
    registrationArrangement: "self_arranged",
    rule: rule(),
  });
  assert.deepEqual(mismatch.reasonCodes, ["registration_responsibility_mismatch"]);

  const unknown = evaluateLegalTime({
    arrivalOn: "2026-10-01",
    arrivalInstant: "2026-10-01T12:00:00.000+02:00",
    priorStayDates: [],
    registrationArrangement: "unknown",
    rule: rule(),
  });
  assert.deepEqual(unknown.reasonCodes, ["registration_arrangement_unknown"]);
});
