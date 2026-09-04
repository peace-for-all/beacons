import { evaluateClaimEvidence } from "./freshness";
import { evaluateHumanRoute } from "./human-route-evaluator";
import type {
  ContentCatalog,
  EvidenceAutomationRun,
  EvidenceClaim,
  EvidenceCondition,
  SourceRecord,
} from "./schemas";

export type LocalizedText = { en: string; ru: string };
export type EvidenceState =
  | "supported"
  | "due"
  | "insufficient"
  | "unavailable"
  | "changed"
  | "conflicting"
  | "stale";

export type ConfidenceState =
  | "current_checked"
  | "sourced_unchecked"
  | "stale"
  | "source_unavailable"
  | "uncorroborated"
  | "disputed";

export type GuidanceActionState = "do_this" | "confirm_first" | "not_established" | "blocked";

export type SourceView = Pick<
  SourceRecord,
  "id" | "publisher" | "originalTitle" | "sourceLanguage" | "url"
> & { relationship: "supports" | "contradicts" };

export type ClaimView = {
  id: string;
  criticality: "gate" | "explanation" | "context";
  summary: LocalizedText;
  fact: EvidenceClaim["fact"];
  limitations: LocalizedText[];
  actionQuarantine?: { reason: LocalizedText };
  evidenceState: EvidenceState;
  evidenceCondition: EvidenceCondition;
  confidenceState: ConfidenceState;
  actionState: GuidanceActionState;
  observedAt: string;
  nextCheckAt: string;
  decisionId?: string;
  proofPacketIds: string[];
  travellerKinds: ("adult" | "child")[];
  childAgeRange?: { minInclusive: number; maxInclusive: number };
  sources: SourceView[];
};

export type RouteView = {
  id: string;
  kind: "visa_free" | "visa_on_arrival" | "evisa" | "visitor_visa";
  publicationState: "candidate" | "published" | "withdrawn";
  presentation:
    | "open_now"
    | "verified_ordinary_route"
    | "application_route_available"
    | "explicitly_ineligible"
    | "not_verified";
  availability: ReturnType<typeof evaluateHumanRoute>["availability"]["state"];
  evidenceCondition: EvidenceCondition;
  evidenceState: EvidenceState;
  observedAt: string;
  claims: ClaimView[];
  currentAuthoredClaimCount: number;
  authoredClaimCount: number;
  hasCurrentCoreEntryFact: boolean;
};

export type PlaceView = {
  id: string;
  city: LocalizedText;
  country: LocalizedText;
  coordinates: [number, number];
  publicationState: "candidate" | "published" | "withdrawn";
  presentation: RouteView["presentation"];
  evidenceCondition: EvidenceCondition;
  evidenceState: EvidenceState;
  observedAt: string;
  routes: RouteView[];
  currentAuthoredClaimCount: number;
  authoredClaimCount: number;
  hasCurrentCoreEntryFact: boolean;
  unknowns: LocalizedText[];
};

const evidencePriority: Record<EvidenceCondition, number> = {
  current: 0,
  due: 1,
  unknown: 2,
  unavailable: 3,
  stale: 4,
  contradictory: 5,
};

const statePriority: Record<EvidenceState, number> = {
  supported: 0,
  due: 1,
  insufficient: 2,
  unavailable: 3,
  changed: 4,
  stale: 5,
  conflicting: 6,
};

function worstEvidence(conditions: EvidenceCondition[]): EvidenceCondition {
  return conditions.reduce<EvidenceCondition>(
    (worst, condition) =>
      evidencePriority[condition] > evidencePriority[worst]
        ? condition
        : worst,
    "current",
  );
}

function worstState(states: EvidenceState[]): EvidenceState {
  return states.reduce<EvidenceState>(
    (worst, state) => statePriority[state] > statePriority[worst] ? state : worst,
    "supported",
  );
}

function latestInstant(instants: string[]) {
  return [...instants].filter(Boolean).sort().at(-1) ?? "";
}

function addDays(instant: string, days: number) {
  if (!instant) return "";
  return new Date(new Date(instant).valueOf() + days * 24 * 60 * 60 * 1000).toISOString();
}

function stateForEvidence(
  condition: EvidenceCondition,
): EvidenceState {
  if (condition === "current") return "supported";
  if (condition === "due") return "due";
  if (condition === "unavailable") return "unavailable";
  if (condition === "contradictory") return "conflicting";
  if (condition === "stale") return "stale";
  return "insufficient";
}

function confidenceForEvidence(condition: EvidenceCondition, hasSources: boolean): ConfidenceState {
  if (condition === "current" || condition === "due") return "current_checked";
  if (condition === "contradictory") return "disputed";
  if (condition === "stale") return "stale";
  if (condition === "unavailable") return "source_unavailable";
  return hasSources ? "sourced_unchecked" : "uncorroborated";
}

export function projectCatalog(
  catalog: ContentCatalog,
  asOf: string,
  automationRun?: EvidenceAutomationRun | null,
): PlaceView[] {
  const sources = new Map(catalog.sources.map((source) => [source.id, source]));
  const claims = new Map(catalog.claims.map((claim) => [claim.id, claim]));
  const routes = new Map(catalog.routes.map((route) => [route.id, route]));
  const decisions = new Map(
    automationRun?.decisions.map((decision) => [decision.claimId, decision]) ?? [],
  );
  const proofPackets = new Map(automationRun?.proofPackets?.map((packet) => [packet.id, packet]) ?? []);

  return catalog.places.map((place) => {
    const routeViews = place.routeIds.flatMap((routeId): RouteView[] => {
      const route = routes.get(routeId);
      if (!route) return [];
      const evaluation = evaluateHumanRoute({ route, claims, automationRun, catalogReleaseId: catalog.releaseId, asOf });
      const claimViews = route.claimIds.flatMap((claimId): ClaimView[] => {
        const claim = claims.get(claimId);
        if (!claim) return [];
        const decision = decisions.get(claim.id);
        const evidence = evaluateClaimEvidence({ claim, automationRun, catalogReleaseId: catalog.releaseId, asOf });
        const validProof = evidence.condition === "current" || evidence.condition === "due"
          ? decision?.proofPacketIds?.map((id) => proofPackets.get(id)).find(Boolean)
          : undefined;
        const sourceViews: SourceView[] = [...claim.supportingSourceIds.flatMap((sourceId) => {
          const source = sources.get(sourceId);
          return source ? [{
            id: source.id,
            publisher: source.publisher,
            originalTitle: source.originalTitle,
            sourceLanguage: source.sourceLanguage,
            url: source.url,
            relationship: "supports" as const,
          }] : [];
        }), ...claim.contradictingSourceIds.flatMap((sourceId) => {
          const source = sources.get(sourceId);
          return source ? [{
            id: source.id,
            publisher: source.publisher,
            originalTitle: source.originalTitle,
            sourceLanguage: source.sourceLanguage,
            url: source.url,
            relationship: "contradicts" as const,
          }] : [];
        })];
        return [{
          id: claim.id,
          criticality: claim.criticality,
          summary: claim.summary,
          fact: claim.fact,
          limitations: claim.limitations,
          actionQuarantine: claim.actionQuarantine,
          evidenceState: stateForEvidence(evidence.condition),
          evidenceCondition: evidence.condition,
          confidenceState: confidenceForEvidence(evidence.condition, sourceViews.length > 0),
          // Catalog browsing does not consume corridor guidance authority. A
          // fact may be useful and current here without becoming an instruction.
          actionState: route.publicationState === "withdrawn" ? "blocked" : "confirm_first",
          observedAt: validProof?.observedAt ?? "",
          nextCheckAt: validProof ? addDays(validProof.observedAt, 8) : "",
          decisionId: decision?.id,
          proofPacketIds: decision?.proofPacketIds ?? [],
          travellerKinds: claim.applicability.travellerKinds,
          childAgeRange: claim.applicability.childAgeRange,
          sources: sourceViews,
        }];
      });
      // Evidence can support claims, but it cannot silently mutate the route's
      // separately controlled publication authority.
      const publicationState = route.publicationState;
      const currentAuthoredClaimCount = claimViews.filter((claim) => claim.evidenceCondition === "current").length;
      const hasCurrentCoreEntryFact = claimViews.some((claim) =>
        claim.evidenceCondition === "current" &&
        ["nationality_eligibility", "passport_type_eligibility", "route_availability", "stay_rule"].includes(claim.fact.kind),
      );
      return [{
        id: route.id,
        kind: route.kind,
        publicationState,
        presentation: publicationState === "published" ? evaluation.presentation : "not_verified",
        availability: evaluation.availability.state,
        evidenceCondition: evaluation.evidence.aggregateCondition,
        evidenceState: worstState(claimViews.map((claim) => claim.evidenceState)),
        observedAt: latestInstant(claimViews.map((claim) => claim.observedAt)),
        claims: claimViews,
        currentAuthoredClaimCount,
        authoredClaimCount: claimViews.length,
        hasCurrentCoreEntryFact,
      }];
    });
    const activeRoutes = routeViews.filter((route) => route.publicationState !== "withdrawn");
    const primaryRoute = activeRoutes[0];
    return {
      id: place.id,
      city: place.city,
      country: place.country,
      coordinates: place.coordinates,
      publicationState: activeRoutes.length === 0
        ? "withdrawn" as const
        : activeRoutes.some((route) => route.publicationState === "published")
          ? "published" as const
          : "candidate" as const,
      presentation: primaryRoute?.presentation ?? "not_verified",
      evidenceCondition: activeRoutes.length
        ? worstEvidence(activeRoutes.map((route) => route.evidenceCondition))
        : "unknown",
      evidenceState: activeRoutes.length
        ? worstState(activeRoutes.map((route) => route.evidenceState))
        : "insufficient",
      observedAt: latestInstant(routeViews.map((route) => route.observedAt)),
      routes: routeViews,
      currentAuthoredClaimCount: activeRoutes.reduce((count, route) => count + route.currentAuthoredClaimCount, 0),
      authoredClaimCount: activeRoutes.reduce((count, route) => count + route.authoredClaimCount, 0),
      hasCurrentCoreEntryFact: activeRoutes.some((route) => route.hasCurrentCoreEntryFact),
      unknowns: place.unknowns,
    };
  });
}
