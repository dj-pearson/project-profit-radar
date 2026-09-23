import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VirtualizedTable, VirtualizedList } from '../virtual-table';
import { AccessibleTable, type TableColumn } from '@/components/accessibility/AccessibleTable';
import { expectNoA11yViolations } from '@/test/accessibility-utils';

/**
 * US-270: long tables render only the rows in view. The test DOM has no
 * layout (every rect is 0x0), so the hook falls back to a 600px viewport -
 * the assertions below check "a window", not an exact count.
 */

interface Row {
  id: string;
  name: string;
  amount: number;
}

const makeRows = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: `r${i}`, name: `Row ${i}`, amount: i }));

const dataRows = (container: HTMLElement) =>
  container.querySelectorAll('tbody tr:not([data-virtual-spacer])');

function renderTable(rows: Row[]) {
  return render(
    <VirtualizedTable
      aria-label="Ledger"
      rows={rows}
      getRowKey={(r) => r.id}
      columnCount={2}
      header={
        <>
          <th scope="col">Name</th>
          <th scope="col">Amount</th>
        </>
      }
      renderCells={(r) => (
        <>
          <td>{r.name}</td>
          <td>{r.amount}</td>
        </>
      )}
    />
  );
}

describe('VirtualizedTable', () => {
  it('renders only a window of rows for 1000 items, with the full row count exposed', () => {
    const { container } = renderTable(makeRows(1000));
    const rendered = dataRows(container);
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(50);

    const table = screen.getByRole('table', { name: 'Ledger' });
    expect(table).toHaveAttribute('aria-rowcount', '1001');
    expect(rendered[0]).toHaveAttribute('aria-rowindex', '2');
    // The space for rows below the window is held by a hidden spacer row.
    expect(container.querySelector('tbody tr[data-virtual-spacer]')).toHaveAttribute('aria-hidden', 'true');
    // The scroll viewport is keyboard reachable.
    expect(screen.getByRole('region', { name: 'Ledger (scrollable)' })).toHaveAttribute('tabindex', '0');
  });

  it('renders every row and no scroll region for a short list', () => {
    const { container } = renderTable(makeRows(20));
    expect(dataRows(container)).toHaveLength(20);
    expect(container.querySelector('[data-virtual-spacer]')).toBeNull();
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.getByText('Row 19')).toBeInTheDocument();
  });

  it('has no axe violations while virtualized', async () => {
    const { container } = renderTable(makeRows(1000));
    await expectNoA11yViolations(container);
  });

  it('keeps render work flat at 5k rows', () => {
    // Benchmark (AC 4): the DOM row count at 5k and 50k rows is the same
    // window, and a 5k render stays far under a frame budget that rendering
    // every row would blow through.
    const t0 = performance.now();
    const five = renderTable(makeRows(5000));
    const elapsed = performance.now() - t0;
    const countAt5k = dataRows(five.container).length;
    five.unmount();

    const fifty = renderTable(makeRows(50000));
    const countAt50k = dataRows(fifty.container).length;

    expect(countAt5k).toBeGreaterThan(0);
    expect(countAt5k).toBeLessThan(50);
    expect(countAt50k).toBe(countAt5k);
    expect(elapsed).toBeLessThan(1500);
  });
});

describe('VirtualizedList', () => {
  it('renders a window of list items with set size and position', () => {
    render(
      <VirtualizedList
        aria-label="Leads"
        items={makeRows(1000)}
        getItemKey={(r) => r.id}
        renderItem={(r) => <div>{r.name}</div>}
      />
    );
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThan(50);
    expect(items[0]).toHaveAttribute('aria-setsize', '1000');
    expect(items[0]).toHaveAttribute('aria-posinset', '1');
  });

  it('renders every item for a short list', () => {
    render(
      <VirtualizedList
        aria-label="Leads"
        items={makeRows(12)}
        getItemKey={(r) => r.id}
        renderItem={(r) => <div>{r.name}</div>}
      />
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(12);
  });
});

describe('AccessibleTable virtualization', () => {
  const columns: TableColumn<Row>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'amount', header: 'Amount', align: 'right' },
  ];

  it('windows 1000 rows but select-all still selects every row', () => {
    const onSelectionChange = vi.fn();
    const { container } = render(
      <AccessibleTable<Row>
        caption="Invoices"
        columns={columns}
        data={makeRows(1000)}
        selectable
        selectedRows={[]}
        onSelectionChange={onSelectionChange}
      />
    );
    const rendered = dataRows(container);
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(50);
    expect(screen.getByRole('table')).toHaveAttribute('aria-rowcount', '1001');

    fireEvent.click(screen.getByLabelText('Select all rows'));
    expect(onSelectionChange).toHaveBeenCalledWith(makeRows(1000).map((r) => r.id));
  });

  it('keeps sorting wired up under virtualization', () => {
    const onSort = vi.fn();
    render(
      <AccessibleTable<Row>
        caption="Invoices"
        columns={columns}
        data={makeRows(500)}
        sortColumn="name"
        sortDirection="ascending"
        onSort={onSort}
      />
    );
    fireEvent.click(screen.getByText('Name'));
    expect(onSort).toHaveBeenCalledWith('name', 'descending');
  });

  it('scrolls a keyboard target that is outside the window into the DOM', async () => {
    const { container } = render(
      <AccessibleTable<Row> caption="Invoices" columns={columns} data={makeRows(1000)} />
    );
    const region = screen.getByRole('region', { name: 'Invoices table' });
    const scrollTo = vi.fn();
    // happy-dom has no layout: give the viewport a scroll range (the
    // virtualizer clamps to it) and record the scroll it asks for.
    Object.defineProperty(region, 'scrollHeight', { configurable: true, value: 49 * 1000 });
    Object.defineProperty(region, 'clientHeight', { configurable: true, value: 600 });
    (region as HTMLElement).scrollTo = scrollTo as unknown as typeof region.scrollTo;

    const first = container.querySelector('[data-row="0"][data-col="0"]') as HTMLElement;
    fireEvent.keyDown(first, { key: 'End', ctrlKey: true });

    await waitFor(() => expect(scrollTo).toHaveBeenCalled());
    const { top } = scrollTo.mock.calls[scrollTo.mock.calls.length - 1][0] as { top: number };
    // Row 999 at the 49px estimate: the scroll lands near the end, not at 0.
    expect(top).toBeGreaterThan(40000);

    // Once the viewport actually scrolls, the last cell of row 999 (Ctrl+End
    // is last row, last column) is rendered and focused.
    (region as HTMLElement).scrollTop = top;
    fireEvent.scroll(region);
    await waitFor(() => {
      const target = container.querySelector('[data-row="999"][data-col="1"]');
      expect(target).not.toBeNull();
      expect(document.activeElement).toBe(target);
    });
  });

  it('renders every row normally below the threshold', () => {
    const { container } = render(
      <AccessibleTable<Row> caption="Invoices" columns={columns} data={makeRows(30)} />
    );
    expect(dataRows(container)).toHaveLength(30);
    expect(container.querySelector('[data-virtual-spacer]')).toBeNull();
  });
});
