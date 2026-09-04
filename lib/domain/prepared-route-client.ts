import type { PreparedRoute, PreparedRouteEvaluation, PreparedRequirement } from "./prepared-route";
import type { HumanHouseholdProfile, HouseholdReadiness, JourneyContext } from "./schemas";

type Traveller = {
  id: string;
  kind: "adult" | "child";
  ageYears?: number;
  ordinaryPassport: HumanHouseholdProfile["adults"][number]["ordinaryPassport"];
  documents: HumanHouseholdProfile["adults"][number]["documents"];
  authorizations: HumanHouseholdProfile["adults"][number]["authorizations"];
};

function addDays(date: Date, days: number) { return new Date(date.valueOf() + days * 24 * 60 * 60 * 1000); }
function dateAtUtcStart(date: string) { return new Date(`${date}T00:00:00.000Z`); }
function addCalendarMonths(date: Date, months: number) {
  const targetMonth = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(date.getUTCDate(), lastDay)));
}
function appliesToTraveller(requirement: PreparedRequirement, traveller: Traveller) {
  if (!requirement.travellerKinds.includes(traveller.kind)) return false;
  return traveller.kind !== "child" || !requirement.childAgeRange || (traveller.ageYears !== undefined && traveller.ageYears >= requirement.childAgeRange.minInclusive && traveller.ageYears <= requirement.childAgeRange.maxInclusive);
}
function normalizeTravellers(profile: HumanHouseholdProfile): Traveller[] {
  return [...profile.adults.map((adult, index) => ({ id: `adult-${index + 1}`, kind: "adult" as const, ...adult })), ...profile.children.map((child, index) => ({ id: `child-${index + 1}`, kind: "child" as const, ...child }))];
}

/** Client-safe evaluation of a route that the server has already prepared and authorized. */
export function evaluatePreparedRoute(input: { route: PreparedRoute; household?: HumanHouseholdProfile; journey?: JourneyContext; asOf: string }): PreparedRouteEvaluation {
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
        const requiredThrough = requirement.minimumRemainingCalendarMonths ? addCalendarMonths(basisDate, requirement.minimumRemainingCalendarMonths) : addDays(basisDate, requirement.minimumRemainingDays ?? 0);
        if (dateAtUtcStart(traveller.ordinaryPassport.expiresOn) < requiredThrough) missing.push(`passport_validity:${item.claimId}`);
      } else if (requirement.kind === "entry_authorization") {
        const declaration = traveller.authorizations.find((value) => value.kind === requirement.authorizationKind);
        if (!declaration || declaration.state === "unknown") unknown.push(`authorization:${requirement.authorizationKind}`);
        else if (declaration.state === "missing" || (declaration.validUntil && journey.arrivalOn && declaration.validUntil < journey.arrivalOn)) missing.push(`authorization:${requirement.authorizationKind}`);
      } else if (["required", "entry_may_be_refused_if_missing"].includes(requirement.obligation)) {
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
  const availableDays = rule.kind === "per_entry" ? rule.allowedDays : rule.kind === "rolling_window" ? rolling(rule.allowedDays) : rule.kind === "compound" ? (() => { const values = rule.constraints.map((constraint) => constraint.kind === "per_entry" ? constraint.allowedDays : rolling(constraint.allowedDays)); return values.some((value) => value === undefined) ? undefined : Math.min(...values as number[]); })() : rule.kind === "calendar_period" ? journey.arrivalOn ? Math.round((addCalendarMonths(dateAtUtcStart(journey.arrivalOn), rule.allowedMonths).valueOf() - dateAtUtcStart(journey.arrivalOn).valueOf()) / 86_400_000) : undefined : rule.requestableDays;
  const stay = availableDays === undefined ? { state: "not_evaluated" as const } : { state: availableDays >= 30 ? "meets_30_days" as const : "under_30_days" as const, availableDays };
  const entryPoint = input.route.allowedEntryPoints.length === 0 ? { state: "eligible" as const, allowedEntryPoints: [] } : !journey.entryPoint ? { state: "not_evaluated" as const, allowedEntryPoints: input.route.allowedEntryPoints } : { state: input.route.allowedEntryPoints.includes(journey.entryPoint) ? "eligible" as const : "ineligible" as const, allowedEntryPoints: input.route.allowedEntryPoints };
  const presentation = householdState === "ready" && stay.state === "meets_30_days" && entryPoint.state === "eligible" ? "open_now" as const : input.route.availability === "application_route_available" ? "application_route_available" as const : "verified_ordinary_route" as const;
  return { household: { state: householdState, travellers }, stay, entryPoint, presentation, provisional: !input.journey?.arrivalOn };
}
