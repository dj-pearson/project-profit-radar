import { describe, it, expect } from 'vitest';
import { authorizeWorkflowAccess, type WorkflowAuthDeps } from './workflow-auth';

// Build deps where the target resource belongs to `ownerCompany` and the
// caller belongs to `callerCompany`.
function deps(ownerCompany: string | null, callerCompany: string): WorkflowAuthDeps {
  return {
    getWorkflowCompanyId: async () => ownerCompany,
    getExecutionCompanyId: async () => ownerCompany,
    verifyAccess: async (companyId) => companyId === callerCompany,
  };
}

describe('authorizeWorkflowAccess (US-236)', () => {
  it('rejects a request with neither workflowId nor executionId (400)', async () => {
    const r = await authorizeWorkflowAccess({}, deps('company-a', 'company-a'));
    expect(r).toMatchObject({ authorized: false, status: 400 });
  });

  it('authorizes a workflow owned by the caller company (200)', async () => {
    const r = await authorizeWorkflowAccess({ workflowId: 'w1' }, deps('company-a', 'company-a'));
    expect(r).toMatchObject({ authorized: true, status: 200, companyId: 'company-a' });
  });

  it('blocks a cross-company workflowId with 403 (the IDOR case)', async () => {
    const r = await authorizeWorkflowAccess({ workflowId: 'w1' }, deps('company-b', 'company-a'));
    expect(r.authorized).toBe(false);
    expect(r.status).toBe(403);
  });

  it('returns 404 when the workflow does not exist', async () => {
    const r = await authorizeWorkflowAccess({ workflowId: 'nope' }, deps(null, 'company-a'));
    expect(r).toMatchObject({ authorized: false, status: 404 });
  });

  it('blocks a cross-company executionId with 403', async () => {
    const r = await authorizeWorkflowAccess({ executionId: 'e1' }, deps('company-b', 'company-a'));
    expect(r.status).toBe(403);
  });

  it('prefers executionId over workflowId on the continue path', async () => {
    // execution owned by caller, workflow lookup would be irrelevant
    const d: WorkflowAuthDeps = {
      getWorkflowCompanyId: async () => 'company-b',
      getExecutionCompanyId: async () => 'company-a',
      verifyAccess: async (c) => c === 'company-a',
    };
    const r = await authorizeWorkflowAccess({ workflowId: 'w1', executionId: 'e1' }, d);
    expect(r).toMatchObject({ authorized: true, companyId: 'company-a' });
  });
});
