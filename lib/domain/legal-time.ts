import { z } from "zod";

import { isoInstantSchema, localDateSchema } from "./schemas";
import { stayTimelineRuleSchema } from "./journey-guidance";

export const legalTimeInputSchema = z
  .object({
    arrivalOn: localDateSchema.optional(),
    arrivalInstant: isoInstantSchema.optional(),
    priorStayDates: z.array(localDateSchema).default([]),
    registrationArrangement: z.enum(["paid_accommodation", "private_host", "self_arranged", "unknown"]),
    rule: stayTimelineRuleSchema,
  })
  .strict()
  .superRefine((input, context) => {
    if (new Set(input.priorStayDates).size !== input.priorStayDates.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["priorStayDates"],
        message: "Prior stay dates must be unique",
      });
    }
    try {
      new Intl.DateTimeFormat("en", { timeZone: input.rule.legalTimezone });
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rule", "legalTimezone"],
        message: "Legal timezone must be a supported IANA timezone",
      });
    }
  });

export type LegalTimeInput = z.infer<typeof legalTimeInputSchema>;

export type LegalTimeEvaluation = {
  state: "calculated" | "not_evaluated" | "blocked";
  reasonCodes: string[];
  countedPriorDays?: number;
  availableDays?: number;
  lastLawfulStayDate?: string;
  registrationDueAt?: string;
  registrationResponsibleParty?: "accommodation_provider_or_host" | "traveller";
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function dateAtUtcStart(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function addCalendarDays(value: string, days: number) {
  return new Date(dateAtUtcStart(value).valueOf() + days * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

/**
 * Calculates only rules whose structured fields completely determine the
 * result. An authored exception without a machine-readable numerical effect is
 * deliberately a blocker rather than an invitation to guess.
 */
export function evaluateLegalTime(rawInput: LegalTimeInput): LegalTimeEvaluation {
  const input = legalTimeInputSchema.parse(rawInput);
  const reasons: string[] = [];

  const registrationResponsibleParty = input.registrationArrangement === "self_arranged"
    ? "traveller" as const
    : ["paid_accommodation", "private_host"].includes(input.registrationArrangement)
      ? "accommodation_provider_or_host" as const
      : undefined;

  if (!input.arrivalOn) reasons.push("arrival_date_missing");
  if (input.rule.dayCounting !== "calendar_days") reasons.push("working_day_calendar_not_supplied");
  if (input.rule.windowAnchor === "calendar_period") reasons.push("calendar_period_anchor_not_supported");
  if (input.rule.exceptions.length > 0) reasons.push("structured_exception_effect_unresolved");
  if (!registrationResponsibleParty) reasons.push("registration_arrangement_unknown");
  if (
    registrationResponsibleParty &&
    input.rule.registration.responsibleParty !== "not_established" &&
    input.rule.registration.responsibleParty !== registrationResponsibleParty
  ) {
    reasons.push("registration_responsibility_mismatch");
  }
  if (reasons.length > 0) return { state: "not_evaluated", reasonCodes: reasons };

  const arrivalOn = input.arrivalOn!;
  let countedPriorDays = 0;
  if (input.rule.windowDays !== undefined) {
    const windowStart = addCalendarDays(arrivalOn, -(input.rule.windowDays - 1));
    countedPriorDays = input.priorStayDates.filter(
      (date) => date >= windowStart && date < arrivalOn,
    ).length;
  } else if (input.priorStayDates.length > 0 && input.rule.windowAnchor !== "entry") {
    return { state: "not_evaluated", reasonCodes: ["prior_stay_window_not_defined"] };
  }

  const availableDays = Math.max(0, input.rule.allowedDays - countedPriorDays);
  if (availableDays === 0) {
    return {
      state: "blocked",
      reasonCodes: ["no_lawful_stay_days_available"],
      countedPriorDays,
      availableDays,
    };
  }

  const firstCountedOffset = input.rule.entryDay === "included" ? 0 : 1;
  const lastCountedOffset = firstCountedOffset + availableDays - 1;
  const lastLawfulStayDate = addCalendarDays(arrivalOn, lastCountedOffset);
  const registrationDueAt =
    input.rule.registration.withinHours && input.arrivalInstant
      ? new Date(
          new Date(input.arrivalInstant).valueOf() +
            input.rule.registration.withinHours * 60 * 60 * 1000,
        ).toISOString()
      : undefined;

  if (
    input.rule.registration.trigger === "not_established" ||
    input.rule.registration.responsibleParty === "not_established" ||
    (input.rule.registration.withinHours !== undefined && !input.arrivalInstant)
  ) {
    reasons.push("registration_timing_not_calculable");
  }

  return {
    state: reasons.length ? "not_evaluated" : "calculated",
    reasonCodes: reasons.length ? reasons : ["structured_legal_time_calculated"],
    countedPriorDays,
    availableDays,
    lastLawfulStayDate,
    registrationDueAt,
    registrationResponsibleParty,
  };
}
