import { evaluateRoutePublication } from "./freshness";
import { evaluatePreparedRoute, prepareRouteForHousehold } from "./prepared-route";
import type {
  DocumentRoute,
  EvidenceAutomationRun,
  EvidenceClaim,
  HumanHouseholdProfile,
  HouseholdReadiness,
  JourneyContext,
  RouteAvailability,
} from "./schemas";

type TravellerResult = {
  travellerId: string;
  kind: "adult" | "child";
  ageYears?: number;
  state: HouseholdReadiness;
  reasonCodes: string[];
};

export type HumanRouteEvaluation = {
  routeId: string;
  evidence: ReturnType<typeof evaluateRoutePublication>;
  availability: {
    state: RouteAvailability;
    reasonCodes: string[];
  };
  household: {
    state: HouseholdReadiness;
    travellers: TravellerResult[];
  };
  stay: {
    state: "meets_30_days" | "under_30_days" | "not_evaluated";
    availableDays?: number;
  };
  entryPoint: {
    state: "eligible" | "ineligible" | "not_evaluated";
    allowedEntryPoints: string[];
  };
  presentation:
    | "open_now"
    | "verified_ordinary_route"
    | "application_route_available"
    | "explicitly_ineligible"
    | "not_verified";
  provisional: boolean;
};

type Traveller = {
  id: string;
  kind: "adult" | "child";
  ageYears?: number;
  ordinaryPassport: HumanHouseholdProfile["adults"][number]["ordinaryPassport"];
  documents: HumanHouseholdProfile["adults"][number]["documents"];
  authorizations: HumanHouseholdProfile["adults"][number]["authorizations"];
};

function addDays(date: Date, days: number) {
  return new Date(date.valueOf() + days * 24 * 60 * 60 * 1000);
}

function addCalendarMonths(date: Date, months: number) {
  const targetMonth = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(date.getUTCDate(), lastDay)));
}

function dateAtUtcStart(localDate: string) {
  return new Date(`${localDate}T00:00:00.000Z`);
}

function claimAppliesToTraveller(claim: EvidenceClaim, traveller: Traveller) {
  if (!claim.applicability.travellerKinds.includes(traveller.kind)) return false;
  if (traveller.kind !== "child" || !claim.applicability.childAgeRange) {
    return true;
  }
  const age = traveller.ageYears;
  return (
    age !== undefined &&
    age >= claim.applicability.childAgeRange.minInclusive &&
    age <= claim.applicability.childAgeRange.maxInclusive
  );
}

function normalizeTravellers(profile: HumanHouseholdProfile): Traveller[] {
  const adults = profile.adults.map((adult, index) => ({
    id: `adult-${index + 1}`,
    kind: "adult" as const,
    ...adult,
  }));
  const children = profile.children.map((child, index) => ({
    id: `child-${index + 1}`,
    kind: "child" as const,
    ...child,
  }));
  return [...adults, ...children];
}

function evaluateTraveller(input: {
  traveller: Traveller;
  requirementClaims: EvidenceClaim[];
  journey: JourneyContext;
  asOf: string;
}): TravellerResult {
  const { traveller, requirementClaims, journey } = input;
  const missing: string[] = [];
  const unknown: string[] = [];
  const passport = traveller.ordinaryPassport;

  if (passport.state === "missing") missing.push("ordinary_passport_missing");
  if (passport.state === "unknown") unknown.push("ordinary_passport_unknown");

  for (const claim of requirementClaims) {
    if (!claimAppliesToTraveller(claim, traveller)) continue;
    if (claim.fact.kind !== "requirement") continue;
    const requirement = claim.fact.requirement;

    if (requirement.kind === "ordinary_passport_present") continue;

    if (requirement.kind === "passport_validity") {
      if (passport.state !== "present") continue;
      const basisDateValue =
        requirement.basis === "planned_departure"
          ? journey.plannedDepartureOn
          : journey.arrivalOn;
      const basisDate = basisDateValue
        ? dateAtUtcStart(basisDateValue)
        : new Date(input.asOf);
      const requiredThrough = requirement.minimumRemainingCalendarMonths
        ? addCalendarMonths(basisDate, requirement.minimumRemainingCalendarMonths)
        : addDays(basisDate, requirement.minimumRemainingDays ?? 0);
      if (dateAtUtcStart(passport.expiresOn) < requiredThrough) {
        missing.push(`passport_validity:${claim.id}`);
      }
      continue;
    }

    if (requirement.kind === "entry_authorization") {
      const declaration = traveller.authorizations.find(
        (item) => item.kind === requirement.authorizationKind,
      );
      if (!declaration || declaration.state === "unknown") {
        unknown.push(`authorization:${requirement.authorizationKind}`);
      } else if (declaration.state === "missing") {
        missing.push(`authorization:${requirement.authorizationKind}`);
      } else if (
        declaration.validUntil &&
        journey.arrivalOn &&
        declaration.validUntil < journey.arrivalOn
      ) {
        missing.push(`authorization_expired:${requirement.authorizationKind}`);
      }
      continue;
    }

    if (requirement.obligation !== "required") continue;

    const declaration = traveller.documents.find(
      (item) => item.kind === requirement.documentKind,
    );
    if (!declaration || declaration.state === "unknown") {
      unknown.push(`document:${requirement.documentKind}`);
    } else if (declaration.state === "missing") {
      missing.push(`document:${requirement.documentKind}`);
    }
  }

  const state: HouseholdReadiness =
    missing.length > 0
      ? "missing_documents"
      : unknown.length > 0
        ? "not_evaluated"
        : "ready";

  return {
    travellerId: traveller.id,
    kind: traveller.kind,
    ageYears: traveller.ageYears,
    state,
    reasonCodes: [...missing, ...unknown],
  };
}

function deriveAvailability(input: {
  route: DocumentRoute;
  claims: ReadonlyMap<string, EvidenceClaim>;
  evidence: ReturnType<typeof evaluateRoutePublication>;
}): HumanRouteEvaluation["availability"] {
  const reasonCodes: string[] = [];
  if (!input.route.ordinary) {
    return {
      state: "not_established" as const,
      reasonCodes: ["route_not_ordinary"],
    };
  }
  if (input.route.publicationState === "withdrawn") {
    return {
      state: "not_established" as const,
      reasonCodes: ["route_withdrawn"],
    };
  }
  const evidenceAllowsDisplay =
    input.route.publicationState === "published"
      ? input.evidence.canRemainPublished
      : input.evidence.canPromote;
  if (!evidenceAllowsDisplay) {
    return {
      state: "not_established" as const,
      reasonCodes: ["evidence_not_publishable"],
    };
  }

  const eligibilityClaims = input.route.claimIds
    .map((claimId) => input.claims.get(claimId))
    .filter(
      (claim): claim is EvidenceClaim =>
        claim?.fact.kind === "nationality_eligibility" ||
        claim?.fact.kind === "passport_type_eligibility" ||
        claim?.fact.kind === "traveller_applicability",
    );
  if (
    eligibilityClaims.some((claim) => {
      if (claim.fact.kind === "traveller_applicability") {
        return !claim.fact.applies;
      }
      if (
        claim.fact.kind === "nationality_eligibility" ||
        claim.fact.kind === "passport_type_eligibility"
      ) {
        return !claim.fact.eligible;
      }
      return false;
    })
  ) {
    return {
      state: "explicitly_ineligible",
      reasonCodes: ["current_explicit_ineligibility"],
    };
  }

  const availabilityClaims = input.route.claimIds
    .map((claimId) => input.claims.get(claimId))
    .filter(
      (claim): claim is EvidenceClaim =>
        claim?.fact.kind === "route_availability",
    );
  if (availabilityClaims.length !== 1) {
    reasonCodes.push("availability_claim_count_invalid");
    return { state: "not_established" as const, reasonCodes };
  }
  return {
    state: availabilityClaims[0].fact.kind === "route_availability"
      ? availabilityClaims[0].fact.availability
      : "not_established",
    reasonCodes,
  };
}

function evaluateStay(input: {
  route: DocumentRoute;
  claims: ReadonlyMap<string, EvidenceClaim>;
  journey: JourneyContext;
}) {
  const stayClaims = input.route.claimIds
    .map((claimId) => input.claims.get(claimId))
    .filter(
      (claim): claim is EvidenceClaim => claim?.fact.kind === "stay_rule",
    );
  if (stayClaims.length !== 1 || stayClaims[0].fact.kind !== "stay_rule") {
    return { state: "not_evaluated" as const };
  }
  const rule = stayClaims[0].fact.rule;
  const evaluateConstraint = (constraint: Extract<typeof rule, { kind: "per_entry" | "rolling_window" }>) => {
    if (constraint.kind === "per_entry") return constraint.allowedDays;
    if (input.journey.priorPresenceDaysInWindow === undefined) {
      return undefined;
    }
    return Math.max(
      0,
      constraint.allowedDays - input.journey.priorPresenceDaysInWindow,
    );
  };
  if (rule.kind === "rolling_window") {
    const availableDays = evaluateConstraint(rule);
    if (availableDays === undefined) return { state: "not_evaluated" as const };
    return {
      state: availableDays >= 30 ? "meets_30_days" as const : "under_30_days" as const,
      availableDays,
    };
  }
  if (rule.kind === "compound") {
    const availableDaysByConstraint = rule.constraints.map(evaluateConstraint);
    if (availableDaysByConstraint.some((days) => days === undefined)) {
      return { state: "not_evaluated" as const };
    }
    const availableDays = Math.min(...(availableDaysByConstraint as number[]));
    return {
      state: availableDays >= 30 ? "meets_30_days" as const : "under_30_days" as const,
      availableDays,
    };
  }
  if (rule.kind === "calendar_period") {
    if (!input.journey.arrivalOn) return { state: "not_evaluated" as const };
    const availableDays = Math.round(
      (addCalendarMonths(dateAtUtcStart(input.journey.arrivalOn), rule.allowedMonths).valueOf() -
        dateAtUtcStart(input.journey.arrivalOn).valueOf()) / (24 * 60 * 60 * 1000),
    );
    return {
      state: availableDays >= 30 ? "meets_30_days" as const : "under_30_days" as const,
      availableDays,
    };
  }
  const availableDays =
    rule.kind === "per_entry" ? rule.allowedDays : rule.requestableDays;
  return {
    state: availableDays >= 30 ? "meets_30_days" as const : "under_30_days" as const,
    availableDays,
  };
}

function evaluateEntryPoint(input: {
  route: DocumentRoute;
  claims: ReadonlyMap<string, EvidenceClaim>;
  journey: JourneyContext;
}) {
  const restrictions = input.route.claimIds
    .map((claimId) => input.claims.get(claimId))
    .filter((claim): claim is EvidenceClaim => claim?.fact.kind === "entry_restriction");
  const allowedEntryPoints = restrictions.flatMap((claim) =>
    claim.fact.kind === "entry_restriction" ? claim.fact.entryPoints : [],
  );
  if (allowedEntryPoints.length === 0) {
    return { state: "eligible" as const, allowedEntryPoints };
  }
  if (!input.journey.entryPoint) {
    return { state: "not_evaluated" as const, allowedEntryPoints };
  }
  return {
    state: allowedEntryPoints.includes(input.journey.entryPoint)
      ? "eligible" as const
      : "ineligible" as const,
    allowedEntryPoints,
  };
}

export function evaluateHumanRoute(input: {
  route: DocumentRoute;
  claims: ReadonlyMap<string, EvidenceClaim>;
  automationRun?: EvidenceAutomationRun | null;
  catalogReleaseId?: string;
  household?: HumanHouseholdProfile;
  journey?: JourneyContext;
  asOf: string;
}): HumanRouteEvaluation {
  const journey = input.journey ?? { origin: "moscow" as const };
  const evidence = evaluateRoutePublication({
    route: input.route,
    claims: input.claims,
    automationRun: input.automationRun,
    catalogReleaseId: input.catalogReleaseId,
    asOf: input.asOf,
  });
  const prepared = prepareRouteForHousehold({
    route: input.route,
    claims: input.claims,
    automationRun: input.automationRun,
    catalogReleaseId: input.catalogReleaseId,
    asOf: input.asOf,
  });
  if (prepared) {
    const evaluated = evaluatePreparedRoute({
      route: prepared,
      household: input.household,
      journey: input.journey,
      asOf: input.asOf,
    });
    return {
      routeId: input.route.id,
      evidence,
      availability: { state: prepared.availability, reasonCodes: [] },
      household: evaluated.household,
      stay: evaluated.stay,
      entryPoint: evaluated.entryPoint,
      presentation: evaluated.presentation,
      provisional: evaluated.provisional,
    };
  }
  const availability = deriveAvailability({
    route: input.route,
    claims: input.claims,
    evidence,
  });
  const stay = evaluateStay({
    route: input.route,
    claims: input.claims,
    journey,
  });
  const entryPoint = evaluateEntryPoint({
    route: input.route,
    claims: input.claims,
    journey,
  });

  const requirementClaims = input.route.claimIds
    .map((claimId) => input.claims.get(claimId))
    .filter(
      (claim): claim is EvidenceClaim => claim?.fact.kind === "requirement",
    );
  const travellerResults = input.household
    ? normalizeTravellers(input.household).map((traveller) =>
        evaluateTraveller({
          traveller,
          requirementClaims,
          journey,
          asOf: input.asOf,
        }),
      )
    : [];
  const householdState: HouseholdReadiness = !input.household
    ? "not_evaluated"
    : travellerResults.some((traveller) => traveller.state === "missing_documents")
      ? "missing_documents"
      : travellerResults.some((traveller) => traveller.state === "not_evaluated")
        ? "not_evaluated"
        : "ready";

  let presentation: HumanRouteEvaluation["presentation"] = "not_verified";
  if (availability.state === "explicitly_ineligible") {
    presentation = "explicitly_ineligible";
  } else if (
    (availability.state === "verified_eligible" ||
      availability.state === "application_route_available") &&
    householdState === "ready" &&
    stay.state === "meets_30_days" &&
    entryPoint.state === "eligible"
  ) {
    presentation = "open_now";
  } else if (availability.state === "application_route_available") {
    presentation = "application_route_available";
  } else if (availability.state === "verified_eligible") {
    presentation = "verified_ordinary_route";
  }

  return {
    routeId: input.route.id,
    evidence,
    availability,
    household: { state: householdState, travellers: travellerResults },
    stay,
    entryPoint,
    presentation,
    provisional: !input.journey?.arrivalOn,
  };
}
