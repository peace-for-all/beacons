import { contentCatalogSchema, type ContentCatalog } from "./schemas";

export type WithdrawRouteInput = {
  routeId: string;
  changeId: string;
  nextReleaseId: string;
  operatorId: string;
  changedAt: string;
  reason: { en: string; ru: string };
};

export function withdrawRoute(catalogInput: ContentCatalog, input: WithdrawRouteInput) {
  const catalog = contentCatalogSchema.parse(structuredClone(catalogInput));
  const route = catalog.routes.find((item) => item.id === input.routeId);
  if (!route) throw new Error(`Unknown route: ${input.routeId}`);
  if (route.publicationState === "withdrawn") {
    throw new Error(`Route is already withdrawn: ${input.routeId}`);
  }
  if (catalog.releaseId === input.nextReleaseId) {
    throw new Error("Withdrawal must create a new release ID");
  }
  if (catalog.changes.some((change) => change.id === input.changeId)) {
    throw new Error(`Duplicate change ID: ${input.changeId}`);
  }

  const previousReleaseId = catalog.releaseId;
  const previousValue = { publicationState: route.publicationState };
  route.publicationState = "withdrawn";
  catalog.releaseId = input.nextReleaseId;
  catalog.changes.push({
    schemaVersion: 1,
    id: input.changeId,
    changedAt: input.changedAt,
    subjectId: route.id,
    summary: {
      en: `Withdrew ${route.id} from publication.`,
      ru: `Маршрут ${route.id} отозван из публикации.`,
    },
    previousValue,
    nextValue: { publicationState: "withdrawn" },
    reason: input.reason,
    sourceIds: [],
    rollbackReleaseId: previousReleaseId,
    producer: {
      kind: "operator_policy_change",
      systemId: input.operatorId,
      version: "withdraw-route-v2",
      runId: input.changeId,
    },
    releaseId: input.nextReleaseId,
  });

  return contentCatalogSchema.parse(catalog);
}
