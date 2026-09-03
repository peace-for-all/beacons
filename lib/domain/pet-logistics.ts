import type { PetPartyProfile } from "./schemas";

export type LargeDogLogisticsEvaluation = {
  state: "not_requested" | "not_assessed";
  largeDogCount: 0 | 1 | 2;
  affectsHumanRoute: false;
};

/**
 * Milestone 0 deliberately records large dogs outside human route eligibility.
 * Pet import, carrier, transit, and accommodation evidence will be added as a
 * separate evaluator; until then the product must say that it is not assessed.
 */
export function evaluateLargeDogLogistics(
  profile: PetPartyProfile,
): LargeDogLogisticsEvaluation {
  return {
    state: profile.largeDogCount === 0 ? "not_requested" : "not_assessed",
    largeDogCount: profile.largeDogCount,
    affectsHumanRoute: false,
  };
}
