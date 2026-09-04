import journeyGuidanceJson from "@/content/journey-guidance.json";
import { journeyGuidanceCollectionSchema } from "@/lib/domain/journey-guidance";

export const journeyGuidance = journeyGuidanceCollectionSchema.parse(journeyGuidanceJson);

export const journeyGuidanceByCorridor = new Map(
  [...new Set(journeyGuidance.guidanceItems.map((item) => item.corridorId))].map((corridorId) => [
    corridorId,
    journeyGuidance.guidanceItems.filter((item) => item.corridorId === corridorId),
  ]),
);
