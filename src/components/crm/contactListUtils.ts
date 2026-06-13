/**
 * Pure filter + sort logic for the CRM contacts list (US-090). Extracted so it
 * can be unit-tested without rendering the page.
 */
export interface ContactRow {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  company_name?: string;
  job_title?: string;
  contact_type?: string;
  relationship_status?: string;
  tags?: string[];
  [key: string]: any;
}

export interface ContactFilterSortOptions {
  searchTerm: string;
  typeFilter: string; // 'all' | <contact_type>
  statusFilter: string; // 'all' | <relationship_status>
  tagFilter: string; // 'all' | <tag>
  sortField: string; // 'first_name' sorts by full name
  sortDir: 'asc' | 'desc';
}

export function filterAndSortContacts<T extends ContactRow>(
  contacts: T[],
  opts: ContactFilterSortOptions,
): T[] {
  const { searchTerm, typeFilter, statusFilter, tagFilter, sortField, sortDir } = opts;
  const q = searchTerm.trim().toLowerCase();

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      q === '' ||
      `${c.first_name ?? ''} ${c.last_name ?? ''}`.toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.company_name ?? '').toLowerCase().includes(q) ||
      (c.job_title ?? '').toLowerCase().includes(q);
    const matchesType = typeFilter === 'all' || c.contact_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || c.relationship_status === statusFilter;
    const matchesTag = tagFilter === 'all' || (Array.isArray(c.tags) && c.tags.includes(tagFilter));
    return matchesSearch && matchesType && matchesStatus && matchesTag;
  });

  const keyOf = (c: T): string => {
    if (sortField === 'first_name') return `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim().toLowerCase();
    return (c[sortField] ?? '').toString().toLowerCase();
  };

  return [...filtered].sort((a, b) => {
    const av = keyOf(a);
    const bv = keyOf(b);
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
}

/** Distinct tags across the contacts, sorted, for the tag filter dropdown. */
export function collectContactTags(contacts: ContactRow[]): string[] {
  const set = new Set<string>();
  for (const c of contacts) {
    if (Array.isArray(c.tags)) c.tags.forEach((t) => t && set.add(t));
  }
  return [...set].sort();
}
