/**
 * US-368: materialToPurchaseOrderService wrote vendors.vendor_type/status,
 * purchase_orders.delivery_location and materials.purchase_order_id, none of
 * which exist. These tests pin the real columns and check that failures carry
 * the database's message instead of being swallowed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Result = { data: unknown; error: { message: string } | null };
type Call = { table: string; method: string; args: unknown[] };

const calls: Call[] = [];
let results: Record<string, Result> = {};

// Chainable PostgREST stand-in. Results are keyed "table.insert",
// "table.update" or "table.select", falling back to "table".
function builder(table: string) {
  const b: Record<string, unknown> = {};
  const used: string[] = [];
  for (const method of ['select', 'eq', 'in', 'order', 'limit', 'insert', 'update', 'single', 'maybeSingle']) {
    b[method] = (...args: unknown[]) => {
      used.push(method);
      calls.push({ table, method, args });
      return b;
    };
  }
  b.then = (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) => {
    const kind = used.includes('insert') ? 'insert' : used.includes('update') ? 'update' : 'select';
    return Promise.resolve(results[`${table}.${kind}`] ?? results[table] ?? { data: [], error: null }).then(resolve, reject);
  };
  return b;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      calls.push({ table, method: 'from', args: [table] });
      return builder(table);
    },
  },
}));

import { materialToPOService } from '../materialToPurchaseOrderService';

const byTable = (table: string, method: string) =>
  calls.filter((c) => c.table === table && c.method === method);

const material = {
  id: 'm1',
  name: 'Rebar',
  unit: 'ea',
  unit_cost: 5,
  quantity_available: 10,
  project_id: 'p1',
  category: 'steel',
};

describe('materialToPOService (US-368)', () => {
  beforeEach(() => {
    calls.length = 0;
    results = {};
  });

  it('creates a vendor with is_active, not vendor_type/status', async () => {
    results = {
      materials: { data: [material], error: null },
      'vendors.select': { data: null, error: null },
      'vendors.insert': { data: { id: 'v1' }, error: null },
      'purchase_orders.insert': { data: { id: 'po1' }, error: null },
      purchase_order_line_items: { data: null, error: null },
    };

    const res = await materialToPOService.createPOFromMaterials(['m1'], 'c1', 'u1', {
      vendor_name: 'Acme Supply',
      delivery_location: 'Gate 3',
    });

    expect(res).toEqual({ success: true, purchaseOrderId: 'po1' });

    const vendorInsert = byTable('vendors', 'insert')[0].args[0] as Record<string, unknown>;
    expect(vendorInsert).toMatchObject({ company_id: 'c1', name: 'Acme Supply', is_active: true });
    expect(vendorInsert).not.toHaveProperty('vendor_type');
    expect(vendorInsert).not.toHaveProperty('status');
  });

  it('writes delivery_address on the PO and never touches materials.purchase_order_id', async () => {
    results = {
      materials: { data: [material], error: null },
      'purchase_orders.insert': { data: { id: 'po1' }, error: null },
      purchase_order_line_items: { data: null, error: null },
    };

    await materialToPOService.createPOFromMaterials(['m1'], 'c1', 'u1', {
      vendor_id: 'v1',
      vendor_name: '',
      delivery_location: 'Gate 3',
    });

    const poInsert = byTable('purchase_orders', 'insert')[0].args[0] as Record<string, unknown>;
    expect(poInsert.delivery_address).toBe('Gate 3');
    expect(poInsert).not.toHaveProperty('delivery_location');

    expect(byTable('materials', 'update')).toHaveLength(0);
  });

  it('returns the PostgREST message when the PO insert fails', async () => {
    results = {
      materials: { data: [material], error: null },
      'purchase_orders.insert': { data: null, error: { message: 'permission denied for table purchase_orders' } },
    };

    const res = await materialToPOService.createPOFromMaterials(['m1'], 'c1', 'u1', {
      vendor_id: 'v1',
      vendor_name: '',
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('permission denied for table purchase_orders');
  });

  it('stops instead of creating a duplicate vendor when the lookup fails', async () => {
    results = {
      materials: { data: [material], error: null },
      'vendors.select': { data: null, error: { message: 'lookup exploded' } },
    };

    const res = await materialToPOService.createPOFromMaterials(['m1'], 'c1', 'u1', {
      vendor_name: 'Acme Supply',
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('lookup exploded');
    expect(byTable('vendors', 'insert')).toHaveLength(0);
  });

  it('filters suggested vendors on is_active and throws on failure', async () => {
    results = { vendors: { data: [{ id: 'v1', name: 'Acme' }], error: null } };
    await expect(materialToPOService.getSuggestedVendors('c1')).resolves.toEqual([{ id: 'v1', name: 'Acme' }]);
    expect(byTable('vendors', 'eq').map((c) => c.args)).toContainEqual(['is_active', true]);
    expect(byTable('vendors', 'eq').map((c) => c.args[0])).not.toContain('status');

    results = { vendors: { data: null, error: { message: 'column vendors.status does not exist' } } };
    await expect(materialToPOService.getSuggestedVendors('c1')).rejects.toThrow('column vendors.status does not exist');
  });

  it('reports a failed preview query rather than "not found"', async () => {
    results = { materials: { data: null, error: { message: 'boom' } } };
    const preview = await materialToPOService.getPOPreview(['m1']);
    expect(preview.canCreate).toBe(false);
    expect(preview.issues[0]).toContain('boom');
  });
});
