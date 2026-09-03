import monitoringConfigJson from "@/content/monitoring-config.json";
import monitoringReportsJson from "@/content/monitoring-reports.json";
import { catalog } from "@/lib/content/catalog";
import { selectLatestCompleteMonitoringRun } from "@/lib/domain/evidence-run-selection";
import {
  monitoringConfigSchema,
  monitoringReportsSchema,
} from "@/lib/domain/schemas";

export const monitoringConfig = monitoringConfigSchema.parse(monitoringConfigJson);
export const monitoringReports = monitoringReportsSchema.parse(monitoringReportsJson);
export const latestMonitoringRun = selectLatestCompleteMonitoringRun(
  monitoringReports.runs,
  catalog.releaseId,
);
