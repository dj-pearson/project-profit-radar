/**
 * Generic CSV export helpers.
 *
 * Pure `toCsv` for testability + a browser `downloadCsv` that triggers a file
 * download. Values are RFC-4180 quoted so commas, quotes, and newlines in the
 * data never corrupt the columns.
 */

export type CsvColumn<T> = {
  /** Column header text. */
  header: string;
  /** Cell accessor — return a string/number/null for the row. */
  value: (row: T) => string | number | null | undefined;
};

/** Quote a single CSV field per RFC 4180 when it contains a delimiter, quote, or newline. */
export function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Build a CSV string from rows + column definitions. Returns header-only when rows is empty. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const headerLine = columns.map((c) => escapeCsvField(c.header)).join(',');
  const dataLines = rows.map((row) =>
    columns.map((c) => escapeCsvField(c.value(row))).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

/** Trigger a browser download of `content` as `filename`. No-op outside the browser. */
export function downloadCsv(filename: string, content: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Convenience: build CSV from rows/columns and download in one call. */
export function exportRowsToCsv<T>(
  filename: string,
  rows: T[],
  columns: CsvColumn<T>[]
): void {
  downloadCsv(filename, toCsv(rows, columns));
}
