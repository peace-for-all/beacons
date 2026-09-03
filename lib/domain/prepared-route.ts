import { evaluateRoutePublication } from "./freshness";
import type {
  DocumentRoute,
  EvidenceAutomationRun,
  EvidenceClaim,
  HumanHouseholdProfile,
  HouseholdReadiness,
  JourneyContext,
  RouteAvailability,
} from "./schemas";

export type PreparedRequirement = {
  claimId: string;
  travellerKinds: ("adult" | "child")[];
  childAgeRange?: { minInclusive: number; maxInclusive: number };
  requirement: Extract<EvidenceClaim["fact"], { kind: "requirement" }>["requirement"];
};

export type PreparedRoute = {
  routeId: string;
  kind: DocumentRoute["kind"];
  availability: RouteAvailability;
  stayRule: Extract<EvidenceClaim["fact"], { kind: "stay_rule" }>["rule"];
  allowedEntryPoints: string[];
  requirements: PreparedRequirement[];
};

type Traveller = {
  id: string;
  kind: "adult" | "child";
  ageYears?: number;
  ordinaryPassport: HumanHouseholdProfile["adults"][number]["ordinaryPassport"];
  documents: HumanHouseholdProfile["adults"][number]["documents"];
  authorizations: HumanHouseholdProfile["adults"][number]["authorizations"];
};

export type PreparedRouteEvaluation = {
  household: {
    state: HouseholdReadiness;
    travellers: Array<{
      travellerId: string;
      kind: "adult" | "child";
      ageYears?: number;
      state: HouseholdReadiness;
      reasonCodes: string[];
    }>;
  };
  stay: {
    state: "meets_30_days" | "under_30_days" | "not_evaluated";
    availableDays?: number;
  };
  entryPoint: {
    state: "eligible" | "ineligible" | "not_evaluated";
    allowedEntryPoints: string[];
  };
  presentation: "open_now" | "verified_ordinary_route" | "application_route_available";
  provisional: boolean;
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

function appliesToTraveller(requirement: PreparedRequirement, traveller: Traveller) {
  if (!requirement.travellerKinds.includes(traveller.kind)) return false;
  if (traveller.kind !== "child" || !requirement.childAgeRange) return true;
  return traveller.ageYears !== undefined
    && traveller.ageYears >= requirement.childAgeRange.minInclusive
    && traveller.ageYears <= requirement.childAgeRange.maxInclusive;
}

function normalizeTravellers(profile: HumanHouseholdProfile): Traveller[] {
  return [
    ...profile.adults.map((adult, index) => ({ id: `adult-${index + 1}`, kind: "adult" as const, ...adult })),
    ...profile.children.map((child, index) => ({ id: `child-${index + 1}`, kind: "child" as const, ...child })),
  ];
}

export function deriveRouteAvailability(input: {
  route: DocumentRoute;
  claims: ReadonlyMap<string, EvidenceClaim>;
  evidence: ReturnType<typeof evaluateRoutePublication>;
}) {
  if (!input.route.ordinary) return { state: "not_established" as const, reasonCodes: ["route_not_ordinary"] };
  if (input.route.publicationState === "withdrawn") return { state: "not_established" as const, reasonCodes: ["route_withdrawn"] };
  if (!input.evidence.canPromote) return { state: "not_established" as const, reasonCodes: ["evidence_not_publishable"] };
  const routeClaims = input.route.claimIds.map((id) => input.claims.get(id)).filter((claim): claim is EvidenceClaim => Boolean(claim));
  if (routeClaims.some((claim) =>
    (claim.fact.kind === "traveller_applicability" && !claim.fact.applies)
    || (claim.fact.kind === "nationality_eligibility" && !claim.fact.eligible)
    || (claim.fact.kind === "passport_type_eligibility" && !claim.fact.eligible),
  )) return { state: "explicitly_ineligible" as const, reasonCodes: ["current_explicit_ineligibility"] };
  const availabilityClaims = routeClaims.filter((claim) => claim.fact.kind === "route_availability");
  if (availabilityClaims.length !== 1 || availabilityClaims[0].fact.kind !== "route_availability") {
    return { state: "not_established" as const, reasonCodes: ["availability_claim_count_invalid"] };
  }
  return { state: availabilityClaims[0].fact.availability, reasonCodes: [] };
}

/** Creates the small, client-safe route contract only when current evidence allows action. */
export function prepareRouteForHousehold(input: {
  route: DocumentRoute;
  claims: ReadonlyMap<string, EvidenceClaim>;
  automationRun?: EvidenceAutomationRun | null;
  catalogReleaseId?: string;
  asOf: string;
}): PreparedRoute | null {
  const evidence = evaluateRoutePublication(input);
  const availability = deriveRouteAvailability({ route: input.route, claims: input.claims, evidence });
  if (!evidence.canPromote || !["verified_eligible", "application_route_available"].includes(availability.state)) return null;
  const routeClaims = input.route.claimIds.map((id) => input.claims.get(id)).filter((claim): claim is EvidenceClaim => Boolean(claim));
  const stayClaims = routeClaims.filter((claim) => claim.fact.kind === "stay_rule");
  if (stayClaims.length !== 1 || stayClaims[0].fact.kind !== "stay_rule") return null;
  const requirements = routeClaims.flatMap((claim): PreparedRequirement[] => claim.fact.kind === "requirement" ? [{
    claimId: claim.id,
    travellerKinds: claim.applicability.travellerKinds,
    childAgeRange: claim.applicability.childAgeRange,
    requirement: claim.fact.requirement,
  }] : []);
  const allowedEntryPoints = [...new Set(routeClaims.flatMap((claim) =>
    claim.fact.kind === "entry_restriction" ? claim.fact.entryPoints : [],
  ))];
  return { routeId: input.route.id, kind: input.route.kind, availability: availability.state, stayRule: stayClaims[0].fact.rule, allowedEntryPoints, requirements };
}

export function evaluatePreparedRoute(input: {
  route: PreparedRoute;
  household?: HumanHouseholdProfile;
  journey?: JourneyContext;
  asOf: string;
}): PreparedRouteEvaluation {
  const journey = input.journey ?? { origin: "moscow" as const };
  const travellers = input.household ? normalizeTravellers(input.household).map((traveller) => {
    const missing: string[] = [];
    const unknown: string[] = [];
    if (traveller.ordinaryPassport.state === "missing") missing.push("ordinary_passport_missing");
    if (traveller.ordinaryPassport.state === "unknown") unknown.push("ordinary_passport_unknown");
    for (const item of input.route.requirements) {
      const requirement = item.requirement;
      if (!appliesToTraveller(item, traveller) || requirement.kind === "ordinary_passport_present") continue;
      if (requirement.kind === "passport_validity") {
        if (traveller.ordinaryPassport.state !== "present") continue;
        const basis = requirement.basis === "planned_departure" ? journey.plannedDepartureOn : journey.arrivalOn;
        const basisDate = basis ? dateAtUtcStart(basis) : new Date(input.asOf);
        const requiredThrough = requirement.minimumRemainingCalendarMonths
          ? addCalendarMonths(basisDate, requirement.minimumRemainingCalendarMonths)
          : addDays(basisDate, requirement.minimumRemainingDays ?? 0);
        if (dateAtUtcStart(traveller.ordinaryPassport.expiresOn) < requiredThrough) missing.push(`passport_validity:${item.claimId}`);
      } else if (requirement.kind === "entry_authorization") {
        const declaration = traveller.authorizations.find((value) => value.kind === requirement.authorizationKind);
        if (!declaration || declaration.state === "unknown") unknown.push(`authorization:${requirement.authorizationKind}`);
        else if (declaration.state === "missing" || (declaration.validUntil && journey.arrivalOn && declaration.validUntil < journey.arrivalOn)) missing.push(`authorization:${requirement.authorizationKind}`);
      } else if (requirement.obligation === "required") {
        const declaration = traveller.documents.find((value) => value.kind === requirement.documentKind);
        if (!declaration || declaration.state === "unknown") unknown.push(`document:${requirement.documentKind}`);
        else if (declaration.state === "missing") missing.push(`document:${requirement.documentKind}`);
      }
    }
    const state = missing.length ? "missing_documents" as const : unknown.length ? "not_evaluated" as const : "ready" as const;
    return { travellerId: traveller.id, kind: traveller.kind, ageYears: traveller.ageYears, state, reasonCodes: [...missing, ...unknown] };
  }) : [];
  const householdState: HouseholdReadiness = !input.household ? "not_evaluated" : travellers.some((item) => item.state === "missing_documents") ? "missing_documents" : travellers.some((item) => item.state === "not_evaluated") ? "not_evaluated" : "ready";
  const rule = input.route.stayRule;
  const rolling = (allowedDays: number) => journey.priorPresenceDaysInWindow === undefined ? undefined : Math.max(0, allowedDays - journey.priorPresenceDaysInWindow);
  let availableDays: number | undefined;
  if (rule.kind === "per_entry") availableDays = rule.allowedDays;
  else if (rule.kind === "rolling_window") availableDays = rolling(rule.allowedDays);
  else if (rule.kind === "compound") {
    const values = rule.constraints.map((constraint) => constraint.kind === "per_entry" ? constraint.allowedDays : rolling(constraint.allowedDays));
    availableDays = values.some((value) => value === undefined) ? undefined : Math.min(...values as number[]);
  } else if (rule.kind === "calendar_period") availableDays = journey.arrivalOn ? Math.round((addCalendarMonths(dateAtUtcStart(journey.arrivalOn), rule.allowedMonths).valueOf() - dateAtUtcStart(journey.arrivalOn).valueOf()) / 86_400_000) : undefined;
  else availableDays = rule.requestableDays;
  const stay = availableDays === undefined ? { state: "not_evaluated" as const } : { state: availableDays >= 30 ? "meets_30_days" as const : "under_30_days" as const, availableDays };
  const entryPoint = input.route.allowedEntryPoints.length === 0 ? { state: "eligible" as const, allowedEntryPoints: [] } : !journey.entryPoint ? { state: "not_evaluated" as const, allowedEntryPoints: input.route.allowedEntryPoints } : { state: input.route.allowedEntryPoints.includes(journey.entryPoint) ? "eligible" as const : "ineligible" as const, allowedEntryPoints: input.route.allowedEntryPoints };
  const presentation = householdState === "ready" && stay.state === "meets_30_days" && entryPoint.state === "eligible" ? "open_now" as const : input.route.availability === "application_route_available" ? "application_route_available" as const : "verified_ordinary_route" as const;
  return { household: { state: householdState, travellers }, stay, entryPoint, presentation, provisional: !input.journey?.arrivalOn };
}
