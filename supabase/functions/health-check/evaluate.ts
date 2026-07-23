/**
 * Pure health-evaluation logic for the health-check function.
 *
 * Extracted so it can be unit-tested without starting the HTTP server or
 * hitting live Supabase dependencies (US-280 AC4: verify 503 on a down
 * dependency).
 *
 * Contract: only a FULLY healthy service returns 200. A "degraded" dependency
 * (returned an error) or an "unhealthy" one (threw) yields 503 so uptime
 * monitors and load balancers alert on partial outages instead of treating a
 * degraded service as fully up.
 */

export type DependencyStatus = "healthy" | "degraded" | "unhealthy";

export interface HealthEvaluation {
  overallStatus: DependencyStatus;
  httpStatus: 200 | 503;
}

export function evaluateHealth(
  checks: Record<string, { status: string }>,
): HealthEvaluation {
  const statuses = Object.values(checks).map((c) => c.status);
  const allHealthy = statuses.length > 0 && statuses.every((s) => s === "healthy");
  const anyUnhealthy = statuses.some((s) => s === "unhealthy");

  const overallStatus: DependencyStatus = allHealthy
    ? "healthy"
    : anyUnhealthy
      ? "unhealthy"
      : "degraded";

  const httpStatus: 200 | 503 = overallStatus === "healthy" ? 200 : 503;

  return { overallStatus, httpStatus };
}
