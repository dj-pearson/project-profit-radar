// Shared authorization logic for the workflow-execution edge functions.
//
// SECURITY (US-236): execute-workflow builds a SERVICE_ROLE client and reads
// workflow_definitions / workflow_executions by a caller-supplied id. Because
// the service role bypasses RLS, an authenticated user of company A could
// otherwise trigger company B's automations (emails, tasks, webhooks) just by
// guessing an id. This module resolves the resource's owning company_id and
// verifies the caller belongs to it, returning a 403 otherwise.
//
// It is intentionally DEPENDENCY-FREE (no Deno globals, no remote imports) so
// the same logic runs under Deno at runtime and under vitest/node in CI.

export interface WorkflowAuthResult {
  authorized: boolean;
  /** HTTP status to return: 200 when authorized, else 400 / 403 / 404. */
  status: number;
  message?: string;
  companyId?: string;
}

export interface WorkflowAuthDeps {
  /** Owning company_id for a workflow id (service-role lookup); null if missing. */
  getWorkflowCompanyId: (workflowId: string) => Promise<string | null>;
  /** Owning company_id for an execution id (service-role lookup); null if missing. */
  getExecutionCompanyId: (executionId: string) => Promise<string | null>;
  /** True if the caller belongs to companyId (RLS-scoped lookup). */
  verifyAccess: (companyId: string) => Promise<boolean>;
}

/**
 * Decide whether the caller may start/continue the given workflow or execution.
 * The caller identity is captured by `deps.verifyAccess` (which is bound to the
 * caller's RLS-scoped client), so this function only needs the resource ids.
 */
export async function authorizeWorkflowAccess(
  input: { workflowId?: string; executionId?: string },
  deps: WorkflowAuthDeps,
): Promise<WorkflowAuthResult> {
  const { workflowId, executionId } = input;

  if (!workflowId && !executionId) {
    return { authorized: false, status: 400, message: 'workflowId or executionId is required' };
  }

  // executionId takes precedence (continue path); fall back to workflowId (start path).
  let companyId: string | null;
  if (executionId) {
    companyId = await deps.getExecutionCompanyId(executionId);
    if (!companyId) return { authorized: false, status: 404, message: 'Execution not found' };
  } else {
    companyId = await deps.getWorkflowCompanyId(workflowId as string);
    if (!companyId) return { authorized: false, status: 404, message: 'Workflow not found' };
  }

  const ok = await deps.verifyAccess(companyId);
  if (!ok) {
    return {
      authorized: false,
      status: 403,
      message: 'Forbidden: resource belongs to another company',
      companyId,
    };
  }

  return { authorized: true, status: 200, companyId };
}
