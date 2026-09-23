/**
 * Per-line tax on an estimate or invoice (US-332).
 *
 * "Document rate" leaves the line on the rate the whole document uses, which
 * starts at the company default. A named rate or "No tax" overrides it for
 * this line only: materials at the county rate, labour untaxed, and so on.
 */
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  lineTaxChoice, lineTaxFromChoice, type LineTax, type NamedTaxRate,
} from '@/lib/companyBilling';

interface LineTaxSelectProps {
  value: Partial<LineTax>;
  onChange: (next: LineTax) => void;
  documentRate: number;
  rates: NamedTaxRate[];
  id?: string;
  /** Names the line for a screen reader: "Tax for line 2". */
  label: string;
}

export function LineTaxSelect({ value, onChange, documentRate, rates, id, label }: LineTaxSelectProps) {
  const choice = lineTaxChoice(value);
  // The line stores the number, not the named rate, so two names for the same
  // rate would be two options with one value. Keep the first name.
  const seen = new Set<number>();
  rates = rates.filter((r) => {
    const n = Number(r.rate);
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  });
  // A line saved at a rate that has since been renamed or removed still shows
  // its own number rather than falling back to something it was not charged.
  const orphan = choice.startsWith('rate:')
    && !rates.some((r) => `rate:${Number(r.rate)}` === choice);

  return (
    <Select value={choice} onValueChange={(v) => onChange(lineTaxFromChoice(v))}>
      <SelectTrigger id={id} aria-label={label} className="h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="default">Document rate ({documentRate}%)</SelectItem>
        {rates.map((r) => (
          <SelectItem key={r.id} value={`rate:${Number(r.rate)}`}>
            {r.name} ({Number(r.rate)}%)
          </SelectItem>
        ))}
        {orphan && <SelectItem value={choice}>{choice.slice(5)}%</SelectItem>}
        <SelectItem value="none">No tax</SelectItem>
      </SelectContent>
    </Select>
  );
}

export default LineTaxSelect;
