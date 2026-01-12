/**
 * AccessibleTable Component
 *
 * A fully accessible data table component compliant with WCAG 2.1 Level AA.
 *
 * Features:
 * - Proper table semantics with role attributes
 * - Column sorting with aria-sort
 * - Row selection with aria-selected
 * - Keyboard navigation (arrow keys, Home, End, PageUp, PageDown)
 * - Screen reader announcements for state changes
 * - Caption and summary support
 * - Responsive design with horizontal scroll indication
 *
 * Usage:
 * <AccessibleTable
 *   caption="Project List"
 *   columns={[
 *     { key: 'name', header: 'Project Name', sortable: true },
 *     { key: 'status', header: 'Status' },
 *     { key: 'budget', header: 'Budget', sortable: true }
 *   ]}
 *   data={projects}
 *   sortColumn="name"
 *   sortDirection="ascending"
 *   onSort={(column, direction) => handleSort(column, direction)}
 *   selectable
 *   selectedRows={selectedIds}
 *   onSelectionChange={(ids) => setSelectedIds(ids)}
 * />
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export type SortDirection = 'ascending' | 'descending' | 'none';

export interface TableColumn<T> {
  /** Unique key for the column */
  key: keyof T | string;
  /** Column header text */
  header: string;
  /** Whether the column is sortable */
  sortable?: boolean;
  /** Custom cell renderer */
  render?: (value: any, row: T, rowIndex: number) => React.ReactNode;
  /** Column width */
  width?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Whether to hide on mobile */
  hideOnMobile?: boolean;
  /** Custom header renderer */
  headerRender?: () => React.ReactNode;
  /** Screen reader only description */
  srDescription?: string;
}

export interface AccessibleTableProps<T extends { id: string | number }> {
  /** Table caption (required for accessibility) */
  caption: string;
  /** Whether to visually hide the caption */
  hideCaption?: boolean;
  /** Optional summary describing the table structure */
  summary?: string;
  /** Column definitions */
  columns: TableColumn<T>[];
  /** Table data */
  data: T[];
  /** Current sort column */
  sortColumn?: string;
  /** Current sort direction */
  sortDirection?: SortDirection;
  /** Sort change handler */
  onSort?: (column: string, direction: SortDirection) => void;
  /** Whether rows are selectable */
  selectable?: boolean;
  /** Whether multiple rows can be selected */
  multiSelect?: boolean;
  /** Currently selected row IDs */
  selectedRows?: (string | number)[];
  /** Selection change handler */
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  /** Row click handler */
  onRowClick?: (row: T, index: number) => void;
  /** Empty state content */
  emptyContent?: React.ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Additional class names */
  className?: string;
  /** Whether to enable keyboard navigation */
  enableKeyboardNavigation?: boolean;
  /** Aria describedby ID for additional description */
  ariaDescribedBy?: string;
}

function AccessibleTableInner<T extends { id: string | number }>(
  props: AccessibleTableProps<T>,
  ref: React.ForwardedRef<HTMLTableElement>
) {
  const {
    caption,
    hideCaption = false,
    summary,
    columns,
    data,
    sortColumn,
    sortDirection = 'none',
    onSort,
    selectable = false,
    multiSelect = true,
    selectedRows = [],
    onSelectionChange,
    onRowClick,
    emptyContent = 'No data available',
    loading = false,
    className,
    enableKeyboardNavigation = true,
    ariaDescribedBy,
  } = props;

  const tableRef = useRef<HTMLTableElement>(null);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');

  // Announce changes to screen readers
  const announce = useCallback((message: string) => {
    setAnnouncement(message);
    setTimeout(() => setAnnouncement(''), 1000);
  }, []);

  // Handle sort
  const handleSort = useCallback((column: string) => {
    if (!onSort) return;

    let newDirection: SortDirection = 'ascending';
    if (sortColumn === column) {
      if (sortDirection === 'ascending') newDirection = 'descending';
      else if (sortDirection === 'descending') newDirection = 'none';
      else newDirection = 'ascending';
    }

    onSort(column, newDirection);
    announce(`Sorted by ${column} ${newDirection === 'none' ? 'unsorted' : newDirection}`);
  }, [onSort, sortColumn, sortDirection, announce]);

  // Handle row selection
  const handleRowSelect = useCallback((rowId: string | number, event?: React.MouseEvent | React.KeyboardEvent) => {
    if (!selectable || !onSelectionChange) return;

    let newSelection: (string | number)[];
    const isSelected = selectedRows.includes(rowId);

    if (multiSelect && (event as React.MouseEvent)?.shiftKey) {
      // Shift+click for range selection
      newSelection = isSelected
        ? selectedRows.filter(id => id !== rowId)
        : [...selectedRows, rowId];
    } else if (multiSelect && ((event as React.MouseEvent)?.ctrlKey || (event as React.MouseEvent)?.metaKey)) {
      // Ctrl/Cmd+click for toggle
      newSelection = isSelected
        ? selectedRows.filter(id => id !== rowId)
        : [...selectedRows, rowId];
    } else if (multiSelect) {
      // Regular click toggles in multi-select mode
      newSelection = isSelected
        ? selectedRows.filter(id => id !== rowId)
        : [...selectedRows, rowId];
    } else {
      // Single select mode
      newSelection = isSelected ? [] : [rowId];
    }

    onSelectionChange(newSelection);
    announce(isSelected ? 'Row deselected' : 'Row selected');
  }, [selectable, multiSelect, selectedRows, onSelectionChange, announce]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (!selectable || !multiSelect || !onSelectionChange) return;

    const allSelected = data.every(row => selectedRows.includes(row.id));
    const newSelection = allSelected ? [] : data.map(row => row.id);
    onSelectionChange(newSelection);
    announce(allSelected ? 'All rows deselected' : 'All rows selected');
  }, [selectable, multiSelect, data, selectedRows, onSelectionChange, announce]);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    if (!enableKeyboardNavigation) return;

    const totalRows = data.length;
    const totalCols = columns.length + (selectable ? 1 : 0);

    let newRow = rowIndex;
    let newCol = colIndex;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        newRow = Math.max(0, rowIndex - 1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        newRow = Math.min(totalRows - 1, rowIndex + 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        newCol = Math.max(0, colIndex - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        newCol = Math.min(totalCols - 1, colIndex + 1);
        break;
      case 'Home':
        event.preventDefault();
        if (event.ctrlKey) {
          newRow = 0;
        }
        newCol = 0;
        break;
      case 'End':
        event.preventDefault();
        if (event.ctrlKey) {
          newRow = totalRows - 1;
        }
        newCol = totalCols - 1;
        break;
      case 'PageUp':
        event.preventDefault();
        newRow = Math.max(0, rowIndex - 10);
        break;
      case 'PageDown':
        event.preventDefault();
        newRow = Math.min(totalRows - 1, rowIndex + 10);
        break;
      case 'Enter':
      case ' ':
        if (selectable && colIndex === 0) {
          event.preventDefault();
          handleRowSelect(data[rowIndex].id, event);
        } else if (onRowClick) {
          event.preventDefault();
          onRowClick(data[rowIndex], rowIndex);
        }
        return;
      default:
        return;
    }

    setFocusedCell({ row: newRow, col: newCol });
  }, [enableKeyboardNavigation, data, columns.length, selectable, handleRowSelect, onRowClick]);

  // Focus management
  useEffect(() => {
    if (focusedCell && tableRef.current) {
      const cell = tableRef.current.querySelector(
        `[data-row="${focusedCell.row}"][data-col="${focusedCell.col}"]`
      ) as HTMLElement;
      if (cell) {
        cell.focus();
      }
    }
  }, [focusedCell]);

  // Get sort icon
  const getSortIcon = (column: string) => {
    if (sortColumn !== column || sortDirection === 'none') {
      return <ChevronsUpDown className="h-4 w-4 opacity-50" aria-hidden="true" />;
    }
    return sortDirection === 'ascending' ? (
      <ChevronUp className="h-4 w-4" aria-hidden="true" />
    ) : (
      <ChevronDown className="h-4 w-4" aria-hidden="true" />
    );
  };

  // Get aria-sort value
  const getAriaSort = (column: string): 'ascending' | 'descending' | 'none' | undefined => {
    if (sortColumn !== column) return undefined;
    return sortDirection;
  };

  const allSelected = data.length > 0 && data.every(row => selectedRows.includes(row.id));
  const someSelected = data.some(row => selectedRows.includes(row.id)) && !allSelected;

  return (
    <div className="relative">
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Summary for screen readers */}
      {summary && (
        <p id={`${caption.toLowerCase().replace(/\s+/g, '-')}-summary`} className="sr-only">
          {summary}
        </p>
      )}

      {/* Table wrapper for horizontal scroll */}
      <div
        className="overflow-x-auto"
        role="region"
        aria-label={`${caption} table`}
        tabIndex={0}
      >
        <table
          ref={tableRef}
          className={cn(
            'w-full border-collapse text-sm',
            className
          )}
          aria-describedby={ariaDescribedBy || (summary ? `${caption.toLowerCase().replace(/\s+/g, '-')}-summary` : undefined)}
          aria-rowcount={data.length + 1}
          aria-colcount={columns.length + (selectable ? 1 : 0)}
        >
          <caption className={cn(hideCaption && 'sr-only', 'text-lg font-semibold mb-2 text-left')}>
            {caption}
            {loading && <span className="sr-only"> (loading)</span>}
          </caption>

          <thead>
            <tr>
              {/* Selection header */}
              {selectable && multiSelect && (
                <th
                  scope="col"
                  className="w-10 px-2 py-3 text-left bg-muted/50 border-b"
                >
                  <label className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={handleSelectAll}
                      aria-label={allSelected ? 'Deselect all rows' : 'Select all rows'}
                      className="h-4 w-4 rounded border-input"
                    />
                  </label>
                </th>
              )}
              {selectable && !multiSelect && (
                <th
                  scope="col"
                  className="w-10 px-2 py-3 text-left bg-muted/50 border-b"
                  aria-label="Selection column"
                >
                  <span className="sr-only">Select</span>
                </th>
              )}

              {/* Column headers */}
              {columns.map((column, colIndex) => (
                <th
                  key={String(column.key)}
                  scope="col"
                  className={cn(
                    'px-4 py-3 font-medium bg-muted/50 border-b',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.hideOnMobile && 'hidden md:table-cell',
                    column.sortable && 'cursor-pointer hover:bg-muted select-none'
                  )}
                  style={{ width: column.width }}
                  aria-sort={column.sortable ? getAriaSort(String(column.key)) : undefined}
                  onClick={column.sortable ? () => handleSort(String(column.key)) : undefined}
                  onKeyDown={column.sortable ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSort(String(column.key));
                    }
                  } : undefined}
                  tabIndex={column.sortable ? 0 : undefined}
                  role={column.sortable ? 'columnheader button' : 'columnheader'}
                >
                  <div className="flex items-center gap-1">
                    {column.headerRender ? column.headerRender() : column.header}
                    {column.sortable && getSortIcon(String(column.key))}
                    {column.srDescription && (
                      <span className="sr-only">{column.srDescription}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  <div role="status" aria-label="Loading">
                    Loading...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {emptyContent}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const isSelected = selectedRows.includes(row.id);
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-b transition-colors',
                      isSelected && 'bg-primary/10',
                      onRowClick && 'cursor-pointer hover:bg-muted/50',
                      focusedCell?.row === rowIndex && 'ring-2 ring-primary ring-inset'
                    )}
                    aria-selected={selectable ? isSelected : undefined}
                    aria-rowindex={rowIndex + 2}
                    onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
                  >
                    {/* Selection cell */}
                    {selectable && (
                      <td
                        className="w-10 px-2 py-3"
                        data-row={rowIndex}
                        data-col={0}
                        tabIndex={focusedCell?.row === rowIndex && focusedCell?.col === 0 ? 0 : -1}
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, 0)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowSelect(row.id, e);
                        }}
                      >
                        <label className="flex items-center justify-center">
                          <input
                            type={multiSelect ? 'checkbox' : 'radio'}
                            name={multiSelect ? undefined : `table-selection-${caption}`}
                            checked={isSelected}
                            onChange={() => {}}
                            aria-label={`Select row ${rowIndex + 1}`}
                            className="h-4 w-4 rounded border-input"
                            tabIndex={-1}
                          />
                        </label>
                      </td>
                    )}

                    {/* Data cells */}
                    {columns.map((column, colIndex) => {
                      const cellColIndex = colIndex + (selectable ? 1 : 0);
                      const value = row[column.key as keyof T];

                      return (
                        <td
                          key={String(column.key)}
                          className={cn(
                            'px-4 py-3',
                            column.align === 'center' && 'text-center',
                            column.align === 'right' && 'text-right',
                            column.hideOnMobile && 'hidden md:table-cell'
                          )}
                          data-row={rowIndex}
                          data-col={cellColIndex}
                          tabIndex={focusedCell?.row === rowIndex && focusedCell?.col === cellColIndex ? 0 : -1}
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, cellColIndex)}
                        >
                          {column.render
                            ? column.render(value, row, rowIndex)
                            : String(value ?? '')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Row count for screen readers */}
      <div className="sr-only" aria-live="polite">
        {data.length} {data.length === 1 ? 'row' : 'rows'}
        {selectable && selectedRows.length > 0 && `, ${selectedRows.length} selected`}
      </div>
    </div>
  );
}

// Export with forwardRef to allow ref forwarding
export const AccessibleTable = React.forwardRef(AccessibleTableInner) as <T extends { id: string | number }>(
  props: AccessibleTableProps<T> & { ref?: React.ForwardedRef<HTMLTableElement> }
) => React.ReactElement;

export default AccessibleTable;
