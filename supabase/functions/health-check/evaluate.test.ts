import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { evaluateHealth } from "./evaluate.ts";

Deno.test("all dependencies healthy -> 200 / healthy", () => {
  const result = evaluateHealth({
    database: { status: "healthy" },
    auth: { status: "healthy" },
    storage: { status: "healthy" },
  });
  assertEquals(result, { overallStatus: "healthy", httpStatus: 200 });
});

Deno.test("a degraded dependency (error) -> 503 / degraded", () => {
  const result = evaluateHealth({
    database: { status: "degraded" },
    auth: { status: "healthy" },
    storage: { status: "healthy" },
  });
  assertEquals(result, { overallStatus: "degraded", httpStatus: 503 });
});

Deno.test("an unhealthy dependency (threw) -> 503 / unhealthy", () => {
  const result = evaluateHealth({
    database: { status: "unhealthy" },
    auth: { status: "healthy" },
    storage: { status: "degraded" },
  });
  assertEquals(result, { overallStatus: "unhealthy", httpStatus: 503 });
});

Deno.test("no checks recorded is not treated as healthy -> 503", () => {
  const result = evaluateHealth({});
  assertEquals(result.httpStatus, 503);
});
