import { projectCatalog, type LocalizedText } from "./catalog-view";
import type { ContentCatalog, EvidenceAutomationRun, EvidenceCondition } from "./schemas";

export type StructuredStaySummary = {
  rule: Extract<ContentCatalog["claims"][number]["fact"], { kind: "stay_rule" }>["rule"];
};

export type OptionView = {
  place: {
    id: string;
    city: LocalizedText;
    country: LocalizedText;
    coordinates: [number, number];
  };
  route: {
    id: string;
    kind: "visa_free" | "visa_on_arrival" | "evisa" | "visitor_visa";
    availability: "verified_eligible" | "application_route_available" | "explicitly_ineligible" | "not_established";
    publicationState: "candidate" | "published" | "withdrawn";
    evidenceCondition: EvidenceCondition;
    stay: StructuredStaySummary | null;
    checkedAt: string | null;
    nextCheckAt: string | null;
  };
  coverage: {
    current: number;
    total: number;
    blockingQuestions: LocalizedText[];
  };
  readiness: null;
  money: null;
};

function uniqueText(values: LocalizedText[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = `${value.en}\u0000${value.ru}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Projects catalog truth once into the explicit, visitor-facing option contract. */
export function projectOptions(
  catalog: ContentCatalog,
  asOf: string,
  automationRun?: EvidenceAutomationRun | null,
): OptionView[] {
  return projectCatalog(catalog, asOf, automationRun).flatMap((place) => place.routes.map((route) => {
    const stayClaim = route.claims.find((claim) => claim.fact.kind === "stay_rule");
    const blockingQuestions = uniqueText([
      ...place.unknowns,
      ...route.claims.flatMap((claim) => claim.evidenceCondition === "current" ? [] : claim.limitations),
    ]);
    return {
      place: { id: place.id, city: place.city, country: place.country, coordinates: place.coordinates },
      route: {
        id: route.id,
        kind: route.kind,
        availability: route.availability,
        publicationState: route.publicationState,
        evidenceCondition: route.evidenceCondition,
        stay: stayClaim?.fact.kind === "stay_rule" ? { rule: stayClaim.fact.rule } : null,
        checkedAt: route.observedAt || null,
        nextCheckAt: route.claims.map((claim) => claim.nextCheckAt).filter(Boolean).sort().at(-1) ?? null,
      },
      coverage: {
        current: route.currentAuthoredClaimCount,
        total: route.authoredClaimCount,
        blockingQuestions,
      },
      readiness: null,
      money: null,
    };
  }));
}
