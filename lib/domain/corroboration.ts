export type SourcePrecedence =
  | "controlling_law"
  | "official_rule"
  | "official_guidance"
  | "operational_official"
  | "secondary";

export type CorroborationSource = {
  sourceId: string;
  publicationChainId: string;
  originEntityId: string;
  independenceGroupId: string;
  precedence: SourcePrecedence;
};

export type SourceObservation = {
  observationId: string;
  sourceId: string;
  observedAt: string;
  status: "reachable" | "unavailable" | "blocked" | "parse_failed";
  extractedFactFingerprint?: string;
  applicabilityFingerprint?: string;
  fragmentFingerprint?: string;
  contextFingerprint?: string;
  normalizerVersion?: string;
  extractorVersion?: string;
  semanticState: "unchanged" | "changed" | "unknown";
};

export type CorroborationDecision = {
  conclusion: "supported" | "contradictory" | "unknown";
  assurance:
    | "insufficient"
    | "single_authority"
    | "machine_corroborated_candidate"
    | "baseline_continuous"
    | "disputed";
  mayRenewFreshness: boolean;
  mustDemote: boolean;
  independentPublicationChains: number;
  reasonCodes: string[];
};

const PRIMARY_PRECEDENCE = new Set<SourcePrecedence>([
  "controlling_law",
  "official_rule",
  "official_guidance",
  "operational_official",
]);
const DAY_MS = 86_400_000;

function uniqueMap<T extends Record<string, string>>(
  records: T[],
  key: keyof T,
  label: string,
) {
  const map = new Map<string, T>();
  for (const record of records) {
    const value = record[key];
    if (map.has(value)) throw new Error(`duplicate_${label}`);
    map.set(value, record);
  }
  return map;
}

function insufficient(
  reasonCode: string,
  independentPublicationChains: number,
  mustDemote: boolean,
): CorroborationDecision {
  return {
    conclusion: "unknown",
    assurance: "insufficient",
    mayRenewFreshness: false,
    mustDemote,
    independentPublicationChains,
    reasonCodes: [reasonCode],
  };
}

export function evaluateCorroboration(input: {
  sources: CorroborationSource[];
  observations: SourceObservation[];
  expectedFactFingerprint: string;
  expectedApplicabilityFingerprint: string;
  expectedFragmentFingerprint?: string;
  expectedContextFingerprint?: string;
  expectedNormalizerVersion?: string;
  expectedExtractorVersion?: string;
  requiredSourceIds?: string[];
  asOf: string;
  maxObservationAgeDays?: number;
  hasPinnedBaseline: boolean;
}): CorroborationDecision {
  const asOfMs = new Date(input.asOf).valueOf();
  if (!Number.isFinite(asOfMs)) throw new Error("invalid_as_of");
  const maxAgeDays = input.maxObservationAgeDays ?? 8;
  if (!Number.isFinite(maxAgeDays) || maxAgeDays <= 0) {
    throw new Error("invalid_max_observation_age");
  }
  const maxAgeMs = maxAgeDays * DAY_MS;
  const sources = uniqueMap(input.sources, "sourceId", "source_id");
  uniqueMap(input.observations, "observationId", "observation_id");

  const latest = new Map<string, SourceObservation>();
  for (const observation of input.observations) {
    if (!sources.has(observation.sourceId)) throw new Error("unknown_observation_source");
    const observedAtMs = new Date(observation.observedAt).valueOf();
    if (!Number.isFinite(observedAtMs)) throw new Error("invalid_observation_time");
    if (observedAtMs > asOfMs) throw new Error("future_observation_time");
    const previous = latest.get(observation.sourceId);
    if (!previous) {
      latest.set(observation.sourceId, observation);
      continue;
    }
    const previousMs = new Date(previous.observedAt).valueOf();
    if (previousMs === observedAtMs) throw new Error("ambiguous_latest_observation");
    if (observedAtMs > previousMs) latest.set(observation.sourceId, observation);
  }

  const current = [...latest.values()].filter(
    (observation) => asOfMs - new Date(observation.observedAt).valueOf() <= maxAgeMs,
  );
  const authoritative = current.filter((observation) => {
    const source = sources.get(observation.sourceId);
    return source && PRIMARY_PRECEDENCE.has(source.precedence);
  });
  const readable = authoritative.filter((observation) => observation.status === "reachable");
  const factConflicts = readable.filter(
    (observation) => observation.extractedFactFingerprint !== undefined &&
      observation.extractedFactFingerprint !== input.expectedFactFingerprint,
  );
  const matching = readable.filter(
    (observation) =>
      observation.extractedFactFingerprint === input.expectedFactFingerprint &&
      observation.applicabilityFingerprint === input.expectedApplicabilityFingerprint,
  );
  const independenceGroups = new Set(
    matching.map((observation) => sources.get(observation.sourceId)?.independenceGroupId),
  );
  independenceGroups.delete(undefined);
  const independentChains = independenceGroups.size;

  if (factConflicts.length > 0) {
    return {
      conclusion: "contradictory",
      assurance: "disputed",
      mayRenewFreshness: false,
      mustDemote: true,
      independentPublicationChains: independentChains,
      reasonCodes: ["authoritative_fact_conflict"],
    };
  }

  if (input.hasPinnedBaseline) {
    const requiredSourceIds = input.requiredSourceIds ?? [];
    if (
      requiredSourceIds.length === 0 ||
      !input.expectedFragmentFingerprint ||
      !input.expectedContextFingerprint ||
      !input.expectedNormalizerVersion ||
      !input.expectedExtractorVersion
    ) throw new Error("incomplete_pinned_baseline_contract");
    if (new Set(requiredSourceIds).size !== requiredSourceIds.length) {
      throw new Error("duplicate_required_source_id");
    }
    if (requiredSourceIds.some((sourceId) => !sources.has(sourceId))) {
      throw new Error("unknown_required_source_id");
    }
    const required = requiredSourceIds.map((sourceId) => latest.get(sourceId));
    if (required.some((observation) => !observation)) {
      return insufficient("required_observation_missing", independentChains, true);
    }
    const requiredCurrent = required as SourceObservation[];
    if (requiredCurrent.some(
      (observation) => asOfMs - new Date(observation.observedAt).valueOf() > maxAgeMs,
    )) {
      return insufficient("required_observation_stale", independentChains, true);
    }
    if (requiredCurrent.some((observation) => observation.status !== "reachable")) {
      return insufficient("required_observation_failed", independentChains, true);
    }
    if (requiredCurrent.some(
      (observation) => observation.applicabilityFingerprint !== input.expectedApplicabilityFingerprint,
    )) {
      return insufficient("baseline_applicability_changed", independentChains, true);
    }
    if (requiredCurrent.some(
      (observation) =>
        observation.extractedFactFingerprint !== input.expectedFactFingerprint ||
        observation.fragmentFingerprint !== input.expectedFragmentFingerprint ||
        observation.contextFingerprint !== input.expectedContextFingerprint ||
        observation.normalizerVersion !== input.expectedNormalizerVersion ||
        observation.extractorVersion !== input.expectedExtractorVersion ||
        observation.semanticState !== "unchanged",
    )) {
      return insufficient("baseline_semantic_change_requires_reextraction", independentChains, true);
    }
    return {
      conclusion: "supported",
      assurance: "baseline_continuous",
      mayRenewFreshness: true,
      mustDemote: false,
      independentPublicationChains: independentChains,
      reasonCodes: ["all_required_baseline_sources_exactly_continuous"],
    };
  }

  if (independentChains >= 2) {
    return {
      conclusion: "supported",
      assurance: "machine_corroborated_candidate",
      mayRenewFreshness: false,
      mustDemote: false,
      independentPublicationChains: independentChains,
      reasonCodes: [
        "two_independent_official_lineages_agree",
        "initial_promotion_requires_contract_activation",
      ],
    };
  }
  if (matching.length > 0) {
    return {
      conclusion: "supported",
      assurance: "single_authority",
      mayRenewFreshness: false,
      mustDemote: false,
      independentPublicationChains: independentChains,
      reasonCodes: ["only_one_independent_official_lineage"],
    };
  }
  return insufficient(
    authoritative.length === 0
      ? "no_current_official_observation"
      : "no_exact_fact_and_applicability_match",
    0,
    false,
  );
}
