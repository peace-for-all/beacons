import evidenceContractsJson from "@/content/evidence-contracts.json";
import evidenceDecisionsJson from "@/content/evidence-decisions.json";
import { catalog } from "@/lib/content/catalog";
import { selectLatestActionEligibleAutomationRun } from "@/lib/domain/evidence-run-selection";
import {
  evidenceAutomationReportsSchema,
  evidenceContractsSchema,
} from "@/lib/domain/schemas";

export const evidenceContracts = evidenceContractsSchema.parse(evidenceContractsJson);
export const evidenceAutomationReports = evidenceAutomationReportsSchema.parse(evidenceDecisionsJson);
export const latestEvidenceAutomationRun = selectLatestActionEligibleAutomationRun(
  evidenceAutomationReports.runs,
  catalog.releaseId,
);
export const latestEvidenceDecisionByClaim = new Map(
  latestEvidenceAutomationRun?.decisions.map((decision) => [decision.claimId, decision]) ?? [],
);
export const latestProofPacketById = new Map(
  latestEvidenceAutomationRun?.proofPackets?.map((packet) => [packet.id, packet]) ?? [],
);
