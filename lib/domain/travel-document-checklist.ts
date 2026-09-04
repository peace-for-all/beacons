import type { Lang } from "@/lib/i18n/messages";
import { formatChecklistRequirement } from "@/lib/i18n/format";
import type { PlaceView, SourceView } from "./catalog-view";
import type { HouseholdCountProfile, HouseholdMobilityRule } from "./household-eligibility";

export type ChecklistMemberKind = "adult" | "child" | "dog";
export type ChecklistItemStatus = "required" | "may_be_requested" | "recommended" | "confirm";

export type TravelChecklistItem = {
  id: string;
  text: string;
  status: ChecklistItemStatus;
  actionState: PlaceView["routes"][number]["claims"][number]["actionState"];
  notes: string[];
  sources: Pick<SourceView, "publisher" | "url">[];
};

export type MemberTravelChecklist = {
  id: string;
  kind: ChecklistMemberKind;
  index: number;
  items: TravelChecklistItem[];
};

function requirementStatus(
  claim: PlaceView["routes"][number]["claims"][number],
): ChecklistItemStatus | null {
  if (claim.fact.kind !== "requirement") return null;
  const requirement = claim.fact.requirement;
  if (requirement.kind === "declared_document" && requirement.obligation === "not_required") return null;
  if (claim.actionState !== "do_this") return "confirm";
  if (requirement.kind !== "declared_document") return "required";
  if (requirement.obligation === "may_be_requested") return "may_be_requested";
  if (requirement.obligation === "recommended") return "recommended";
  return "required";
}

function humanItems(
  place: PlaceView,
  kind: "adult" | "child",
  lang: Lang,
): TravelChecklistItem[] {
  const claims = place.routes.flatMap((route) => route.claims);
  const items = claims.flatMap((claim) => {
    if (claim.fact.kind !== "requirement" || !claim.travellerKinds.includes(kind)) return [];
    const status = requirementStatus(claim);
    if (!status) return [];
    return [{
      id: claim.id,
      text: formatChecklistRequirement(claim.fact, lang),
      status,
      actionState: claim.actionState,
      notes: claim.limitations.map((note) => note[lang]),
      sources: claim.sources.map(({ publisher, url }) => ({ publisher, url })),
    }];
  });

  if (kind === "child") {
    const applicability = claims.find((claim) => claim.fact.kind === "traveller_applicability" && claim.travellerKinds.includes("child"));
    if (applicability && (applicability.confidenceState !== "current_checked" || applicability.limitations.length > 0)) {
      items.push({
        id: `${applicability.id}.child-documents`,
        text: lang === "ru" ? "Уточнить специальные документы и условия для ребёнка" : "Confirm child-specific documents and conditions",
        status: "confirm",
        actionState: applicability.actionState,
        notes: applicability.limitations.map((note) => note[lang]),
        sources: applicability.sources.map(({ publisher, url }) => ({ publisher, url })),
      });
    }
  }
  return items;
}

function dogItems(
  rule: HouseholdMobilityRule | undefined,
  lang: Lang,
  asOf: string,
): TravelChecklistItem[] {
  if (!rule) return [{
    id: "dog.documents.not-established",
    text: lang === "ru" ? "Получить актуальный список документов для ввоза собаки" : "Obtain the current dog-import document list",
    status: "confirm",
    actionState: "not_established",
    notes: [],
    sources: [],
  }];
  const sources = rule.sources.map(({ publisher, url }) => ({ publisher, url }));
  const stale = new Date(asOf) > new Date(rule.reviewAfter);
  const requirements = rule.requirements.map((requirement, index) => ({
    id: `${rule.placeId}.dog.requirement.${index + 1}`,
    text: requirement[lang],
    status: "confirm" as const,
    actionState: stale ? "not_established" as const : "confirm_first" as const,
    notes: [],
    sources,
  }));
  const limitations = rule.limitations.map((limitation, index) => ({
    id: `${rule.placeId}.dog.confirm.${index + 1}`,
    text: limitation[lang],
    status: "confirm" as const,
    actionState: "confirm_first" as const,
    notes: [],
    sources,
  }));
  return [...requirements, ...limitations];
}

export function buildTravelDocumentChecklists({
  place,
  mobilityRule,
  household,
  lang,
  asOf,
}: {
  place: PlaceView;
  mobilityRule?: HouseholdMobilityRule;
  household: HouseholdCountProfile;
  lang: Lang;
  asOf: string;
}): MemberTravelChecklist[] {
  const adultItems = humanItems(place, "adult", lang);
  const childItems = humanItems(place, "child", lang);
  const petItems = dogItems(mobilityRule, lang, asOf);
  return [
    ...Array.from({ length: household.adults }, (_, index) => ({ id: `adult-${index + 1}`, kind: "adult" as const, index: index + 1, items: adultItems })),
    ...Array.from({ length: household.children }, (_, index) => ({ id: `child-${index + 1}`, kind: "child" as const, index: index + 1, items: childItems })),
    ...Array.from({ length: household.dogs }, (_, index) => ({ id: `dog-${index + 1}`, kind: "dog" as const, index: index + 1, items: petItems })),
  ];
}
