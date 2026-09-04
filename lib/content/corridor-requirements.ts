import corridorRequirementsJson from "@/content/corridor-requirements.json";
import { corridorRequirementManifestCollectionSchema } from "@/lib/domain/corridor-requirement-manifest";

export const corridorRequirements = corridorRequirementManifestCollectionSchema.parse(
  corridorRequirementsJson,
);

export const corridorRequirementByRoute = new Map(
  corridorRequirements.manifests.map((manifest) => [manifest.routeId, manifest]),
);
