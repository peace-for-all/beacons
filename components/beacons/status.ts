import type { ClaimView, ConfidenceState, PlaceView } from "@/lib/domain/catalog-view";
import type { Messages } from "@/lib/i18n/messages";

export function placeStatus(place: PlaceView, t: Messages) {
  if (place.publicationState === "withdrawn") return t.withdrawn;
  if (place.evidenceState === "conflicting") return t.evidenceConflict;
  if (place.presentation === "explicitly_ineligible") return t.explicitlyIneligible;
  if (place.presentation === "verified_ordinary_route") return t.verifiedRoute;
  if (place.presentation === "application_route_available") return t.applicationRoute;
  if (place.hasCurrentCoreEntryFact) return t.partialCandidate;
  return t.notVerified;
}

export function confidenceStatus(confidence: ConfidenceState, t: Messages) {
  return t.confidence[confidence];
}

export function routeKindLabel(kind: PlaceView["routes"][number]["kind"], t: Messages) {
  return t[kind];
}

export function evidenceStatus(claim: ClaimView, t: Messages) {
  return t[claim.evidenceCondition];
}

export function applicability(claim: ClaimView, t: Messages) {
  const adults = claim.travellerKinds.includes("adult");
  const children = claim.travellerKinds.includes("child");
  if (adults && children) return t.adultsAndChildren;
  if (children) return t.children;
  return t.adults;
}
