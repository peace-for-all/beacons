import { z } from "zod";
import type { PlaceView } from "./catalog-view";
import { identifierSchema, isoInstantSchema, localizedTextSchema } from "./schemas";

const mobilitySourceSchema = z.object({
  id: identifierSchema,
  publisher: z.string().trim().min(1),
  title: z.string().trim().min(1),
  url: z.string().url().refine((value) => value.startsWith("https://")),
  monitoring: z.discriminatedUnion("strategy", [
    z.object({
      strategy: z.literal("exact_text"),
      requiredText: z.array(z.string().trim().min(3)).min(1),
      maximumSpanCharacters: z.number().int().positive().max(20_000),
    }).strict(),
    z.object({
      strategy: z.literal("raw_sha256"),
      expectedSha256: z.string().regex(/^[a-f0-9]{64}$/),
    }).strict(),
  ]).optional(),
}).strict();

export const householdMobilityCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  rules: z.array(z.object({
    placeId: identifierSchema,
    reviewedAt: isoInstantSchema,
    reviewAfter: isoInstantSchema,
    dogCount: z.object({
      status: z.enum(["supported", "permit_required", "not_established"]),
      maximum: z.number().int().positive().nullable(),
    }).strict(),
    summary: localizedTextSchema,
    requirements: z.array(localizedTextSchema),
    limitations: z.array(localizedTextSchema),
    sources: z.array(mobilitySourceSchema).min(1),
  }).strict()).superRefine((rules, context) => {
    const ids = new Set<string>();
    rules.forEach((rule, index) => {
      if (ids.has(rule.placeId)) context.addIssue({ code: z.ZodIssueCode.custom, path: [index, "placeId"], message: "Duplicate place mobility rule" });
      ids.add(rule.placeId);
      if ((rule.dogCount.status === "supported") !== (rule.dogCount.maximum !== null)) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: [index, "dogCount"], message: "Only a supported dog rule may have a maximum" });
      }
      if (new Date(rule.reviewedAt) >= new Date(rule.reviewAfter)) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: [index, "reviewAfter"], message: "Review deadline must follow review time" });
      }
    });
  }),
}).strict();

export type HouseholdMobilityRule = z.infer<typeof householdMobilityCatalogSchema>["rules"][number];
export type HouseholdCountProfile = { adults: number; children: number; dogs: number };

export type HouseholdEligibility = {
  eligible: boolean;
  assessment: "confirmed_with_requirements" | "uncertain" | "excluded";
  children: "not_requested" | "count_not_ruled_out" | "not_established";
  dogs: "not_requested" | "supported" | "permit_required" | "not_established" | "stale" | "over_limit";
};

export function evaluateHouseholdCounts(
  place: PlaceView,
  rule: HouseholdMobilityRule | undefined,
  profile: HouseholdCountProfile,
  asOf: string,
): HouseholdEligibility {
  const childClaim = place.routes.flatMap((route) => route.claims).find((claim) =>
    claim.fact.kind === "traveller_applicability" &&
    claim.fact.applies &&
    claim.travellerKinds.includes("child") &&
    claim.confidenceState === "current_checked",
  );
  // A current applicability sentence can show that the requested count has not
  // been ruled out. It cannot establish household readiness without the full
  // child-critical requirement manifest.
  const children = profile.children === 0 ? "not_requested" : childClaim ? "count_not_ruled_out" : "not_established";
  let dogs: HouseholdEligibility["dogs"] = "not_requested";
  if (profile.dogs > 0) {
    if (!rule || rule.dogCount.status === "not_established") dogs = "not_established";
    else if (rule.dogCount.status === "permit_required") dogs = "permit_required";
    else if (new Date(asOf) > new Date(rule.reviewAfter)) dogs = "stale";
    else if (rule.dogCount.maximum === null) dogs = "not_established";
    else if (profile.dogs > rule.dogCount.maximum) dogs = "over_limit";
    else dogs = "supported";
  }
  const assessment = dogs === "over_limit"
    ? "excluded" as const
    : children !== "not_requested" || ["permit_required", "not_established", "stale"].includes(dogs)
      ? "uncertain" as const
      : "confirmed_with_requirements" as const;
  return {
    // Count filters are discovery controls. Unknown evidence remains visible and
    // is labelled as uncertain in the detail view; only an explicit count limit
    // excludes a destination.
    eligible: assessment !== "excluded",
    assessment,
    children,
    dogs,
  };
}
