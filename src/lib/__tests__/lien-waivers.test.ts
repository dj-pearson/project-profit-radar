import { describe, it, expect } from 'vitest';
import {
  WAIVER_TYPES,
  WAIVER_STATUSES,
  waiverTypeLabel,
  waiverStatusMeta,
  canTransition,
  isWaiverSatisfied,
  resolvePaymentHold,
  validateWaiverRequest,
} from '@/lib/lien-waivers';

describe('metadata (US-227)', () => {
  it('models the four canonical waiver types and the full lifecycle', () => {
    expect(WAIVER_TYPES).toHaveLength(4);
    expect(WAIVER_TYPES.map((t) => t.id).sort()).toEqual([
      'conditional-final',
      'conditional-progress',
      'unconditional-final',
      'unconditional-progress',
    ]);
    // each type carries conditionality + stage
    for (const t of WAIVER_TYPES) {
      expect(['conditional', 'unconditional']).toContain(t.conditionality);
      expect(['progress', 'final']).toContain(t.stage);
    }
    expect(WAIVER_STATUSES.map((s) => s.id)).toContain('received');
  });

  it('labels types and falls back to the raw id', () => {
    expect(waiverTypeLabel('conditional-final')).toMatch(/Conditional/);
    expect(waiverTypeLabel('nope')).toBe('nope');
  });

  it('returns a status meta, falling back for unknown', () => {
    expect(waiverStatusMeta('received').tone).toBe('default');
    expect(waiverStatusMeta('rejected').tone).toBe('destructive');
    expect(waiverStatusMeta('mystery').label).toBe('mystery');
  });
});

describe('canTransition (US-227)', () => {
  it('permits the forward lifecycle', () => {
    expect(canTransition('draft', 'requested')).toBe(true);
    expect(canTransition('requested', 'sent')).toBe(true);
    expect(canTransition('sent', 'signed')).toBe(true);
    expect(canTransition('signed', 'received')).toBe(true);
  });

  it('allows rejection from any open state and re-request after rejection', () => {
    expect(canTransition('sent', 'rejected')).toBe(true);
    expect(canTransition('rejected', 'requested')).toBe(true);
  });

  it('rejects illegal jumps and transitions out of a terminal state', () => {
    expect(canTransition('draft', 'received')).toBe(false);
    expect(canTransition('received', 'requested')).toBe(false);
    expect(canTransition('requested', 'received')).toBe(false);
  });
});

describe('payment-hold rule (US-227)', () => {
  it('treats only received as satisfying the waiver', () => {
    expect(isWaiverSatisfied('received')).toBe(true);
    expect(isWaiverSatisfied('signed')).toBe(false);
    expect(isWaiverSatisfied('rejected')).toBe(false);
  });

  it('holds payment when no waiver is on file', () => {
    const hold = resolvePaymentHold([]);
    expect(hold.released).toBe(false);
    expect(hold.reason).toMatch(/No lien waiver/);
  });

  it('releases payment only when every waiver is received', () => {
    expect(resolvePaymentHold(['received']).released).toBe(true);
    expect(resolvePaymentHold(['received', 'received']).released).toBe(true);
    expect(resolvePaymentHold(['received', 'signed']).released).toBe(false);
    expect(resolvePaymentHold(['sent']).released).toBe(false);
  });

  it('reports the outstanding count', () => {
    expect(resolvePaymentHold(['signed', 'sent']).reason).toMatch(/2 waivers outstanding/);
    expect(resolvePaymentHold(['signed']).reason).toMatch(/1 waiver outstanding/);
  });
});

describe('validateWaiverRequest (US-227)', () => {
  const ok = {
    contractorId: 'sub-1',
    projectId: 'proj-1',
    type: 'conditional-progress' as const,
    amount: '1000',
    throughDate: '2026-06-30',
  };

  it('passes a complete form', () => {
    expect(validateWaiverRequest(ok)).toEqual([]);
  });

  it('flags each missing/invalid field', () => {
    const errors = validateWaiverRequest({
      contractorId: '',
      projectId: '',
      type: '',
      amount: '0',
      throughDate: '',
    });
    expect(errors).toHaveLength(5);
  });

  it('rejects non-positive / non-numeric amounts', () => {
    expect(validateWaiverRequest({ ...ok, amount: '-5' }).some((e) => /amount/.test(e))).toBe(true);
    expect(validateWaiverRequest({ ...ok, amount: 'abc' }).some((e) => /amount/.test(e))).toBe(true);
  });
});
