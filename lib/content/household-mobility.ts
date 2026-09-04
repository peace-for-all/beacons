import mobilityJson from "@/content/household-mobility.json";
import { householdMobilityCatalogSchema } from "@/lib/domain/household-eligibility";

export const householdMobility = householdMobilityCatalogSchema.parse(mobilityJson);
export const householdMobilityByPlace = new Map(
  householdMobility.rules.map((rule) => [rule.placeId, rule]),
);
