import type { CorridorRequirementManifest } from "./corridor-requirement-manifest";
import type { OperationalRecord } from "./journey-guidance";
import type { ContentCatalog } from "./schemas";

export type DepartureReadinessState = "current" | "confirm" | "not_established" | "blocked";
export type DepartureReadinessCategory =
  | "legal"
  | "departure"
  | "first_72_hours"
  | "money"
  | "safety"
  | "offline";

export type DepartureReadinessSummary = {
  assessed: boolean;
  actionReady: boolean;
  current: number;
  total: number;
  unresolved: number;
  categories: Record<DepartureReadinessCategory, DepartureReadinessState>;
  itineraryLeads: DepartureItineraryLead[];
  unresolvedFirst72: string[];
  householdScope: DepartureHouseholdScope | null;
};

export type DepartureHouseholdScope = {
  minimumAdults: number;
  maximumAdults: number;
  childCount: number;
  childAgeMin: number;
  childAgeMax: number;
};

export type DepartureItineraryLead = {
  id: string;
  role: "primary" | "fallback";
  departureOn: string;
  path: string[];
  durationMinutes: number;
  freshness: "current" | "recheck";
  daysUntilDeparture: number | null;
  observedAt: string;
  validUntilExclusive: string;
  sources: { id: string; publisher: string; title: string; url: string }[];
};

export type DepartureReadinessByPlace = Record<
  string,
  Record<"MOW" | "LED", DepartureReadinessSummary>
>;

const categories: DepartureReadinessCategory[] = [
  "legal",
  "departure",
  "first_72_hours",
  "money",
  "safety",
  "offline",
];

function categoryState(statuses: CorridorRequirementManifest["requirements"][number]["status"][]): DepartureReadinessState {
  if (statuses.length === 0) return "not_established";
  if (statuses.includes("contradictory")) return "blocked";
  if (statuses.includes("missing") || statuses.includes("not_applicable")) return "not_established";
  if (statuses.includes("incomplete")) return "confirm";
  return "current";
}

function requirementCategory(requirementId: string): DepartureReadinessCategory | null {
  if (requirementId.startsWith("legal.")) return "legal";
  if (requirementId.startsWith("departure.")) return "departure";
  if (requirementId.startsWith("first72.")) return "first_72_hours";
  if (requirementId.startsWith("money.")) return "money";
  if (requirementId.startsWith("safety.")) return "safety";
  if (requirementId.startsWith("offline.")) return "offline";
  return null;
}

export function summarizeDepartureReadiness(
  manifest: CorridorRequirementManifest | undefined,
  origin: "moscow" | "saint_petersburg",
  context?: {
    operationalRecords: OperationalRecord[];
    sources: ContentCatalog["sources"];
    asOf: string;
  },
): DepartureReadinessSummary {
  const emptyCategories = Object.fromEntries(categories.map((category) => [category, "not_established"])) as DepartureReadinessSummary["categories"];
  if (!manifest) return { assessed: false, actionReady: false, current: 0, total: 0, unresolved: 0, categories: emptyCategories, itineraryLeads: [], unresolvedFirst72: [], householdScope: null };

  const relevant = manifest.requirements.filter((requirement) => !requirement.origin || requirement.origin === origin);
  const required = relevant.filter((requirement) => requirement.requirementId !== "household.pet_feasibility");
  const current = required.filter((requirement) => requirement.status === "current").length;
  const categoryStates = Object.fromEntries(categories.map((category) => [
    category,
    categoryState(required.filter((requirement) => requirementCategory(requirement.requirementId) === category).map((requirement) => requirement.status)),
  ])) as DepartureReadinessSummary["categories"];
  const actionReady = required.length > 0
    && current === required.length
    && !manifest.researchTargetOnly
    && manifest.activationAuthority;
  const unresolvedFirst72 = required
    .filter((requirement) => requirement.requirementId.startsWith("first72.") && requirement.status !== "current")
    .map((requirement) => requirement.requirementId);
  const itineraryLeads = context ? projectItineraryLeads(manifest.routeId, origin, context) : [];

  return {
    assessed: true,
    actionReady,
    current,
    total: required.length,
    unresolved: required.length - current,
    categories: categoryStates,
    itineraryLeads,
    unresolvedFirst72,
    householdScope: {
      minimumAdults: manifest.household.minimumAdults,
      maximumAdults: manifest.household.maximumAdults,
      childCount: manifest.household.childCount,
      childAgeMin: manifest.household.childAgeRange.minInclusive,
      childAgeMax: manifest.household.childAgeRange.maxInclusive,
    },
  };
}

function projectItineraryLeads(
  routeId: string,
  origin: "moscow" | "saint_petersburg",
  context: NonNullable<Parameters<typeof summarizeDepartureReadiness>[2]>,
): DepartureItineraryLead[] {
  const sourceById = new Map(context.sources.map((source) => [source.id, source]));
  const asOfDate = Date.parse(`${context.asOf.slice(0, 10)}T00:00:00.000Z`);
  const oneDay = 86_400_000;
  return context.operationalRecords.flatMap((record): DepartureItineraryLead[] => {
    if (
      record.routeId !== routeId
      || record.origin !== origin
      || record.recordState !== "observed"
      || record.payload.kind !== "departure_observation"
    ) return [];
    const payload = record.payload;
    const departureDate = Date.parse(`${payload.observedDepartureOn}T00:00:00.000Z`);
    const sources = [...new Map(record.sourceBindings.flatMap((binding) => {
      const source = sourceById.get(binding.sourceId);
      return source ? [[source.id, { id: source.id, publisher: source.publisher, title: source.originalTitle, url: source.url }] as const] : [];
    })).values()];
    return [{
      id: record.id,
      role: payload.itineraryRole,
      departureOn: payload.observedDepartureOn,
      path: [payload.departurePoint, ...payload.transferPoints, payload.arrivalPoint],
      durationMinutes: payload.durationMinutes,
      freshness: Date.parse(record.validUntilExclusive) > Date.parse(context.asOf) ? "current" : "recheck",
      daysUntilDeparture: Number.isFinite(asOfDate) && Number.isFinite(departureDate) ? Math.round((departureDate - asOfDate) / oneDay) : null,
      observedAt: record.observedAt,
      validUntilExclusive: record.validUntilExclusive,
      sources,
    }];
  }).sort((left, right) => Number(left.role === "fallback") - Number(right.role === "fallback")
    || left.departureOn.localeCompare(right.departureOn));
}
