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

/**
 * What an unauthenticated caller gets to see (US-358): status and timing per
 * dependency, never the dependency's own error text, which can carry hostnames,
 * table names or driver messages. index.ts logs the full detail server-side.
 */
export function toPublicChecks(
  checks: Record<string, { status: string; responseTime: number; error?: string }>,
): Record<string, { status: string; responseTime: number }> {
  return Object.fromEntries(
    Object.entries(checks).map(([name, c]) => [name, { status: c.status, responseTime: c.responseTime }]),
  );
}

export interface CheckResult {
  status: DependencyStatus;
  responseTime: number;
  error?: string;
}

/**
 * Run one dependency probe with a deadline (US-280). `probe` resolves to
 * `{ error }` the way supabase-js does: an error means "degraded" (the
 * dependency answered, badly); a throw or the deadline means "unhealthy".
 * Without the deadline a hung database holds the whole request open until the
 * uptime monitor's own timeout, which reports "unreachable" instead of naming
 * the dependency.
 */
export async function runCheck(
  probe: () => PromiseLike<{ error?: { message?: string } | string | null }>,
  timeoutMs = 5000,
  now: () => number = Date.now,
): Promise<CheckResult> {
  const start = now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    const { error } = await Promise.race([probe(), deadline]);
    const responseTime = now() - start;
    if (!error) return { status: "healthy", responseTime };
    const message = typeof error === "string" ? error : error.message ?? "error";
    return { status: "degraded", responseTime, error: message };
  } catch (err) {
    return {
      status: "unhealthy",
      responseTime: now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  } finally {
    clearTimeout(timer);
  }
}
