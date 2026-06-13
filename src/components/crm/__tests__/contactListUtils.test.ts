import { describe, it, expect } from 'vitest';
import { filterAndSortContacts, collectContactTags } from '../contactListUtils';

const contacts = [
  { id: '1', first_name: 'Zoe', last_name: 'Adams', email: 'zoe@acme.com', company_name: 'Acme', contact_type: 'client', relationship_status: 'active', tags: ['vip'] },
  { id: '2', first_name: 'Bob', last_name: 'Young', email: 'bob@beta.io', company_name: 'Beta', contact_type: 'vendor', relationship_status: 'active', tags: ['cold'] },
  { id: '3', first_name: 'Amy', last_name: 'Carter', email: 'amy@acme.com', company_name: 'Acme', contact_type: 'client', relationship_status: 'inactive', tags: ['vip', 'cold'] },
];

const base = {
  searchTerm: '',
  typeFilter: 'all',
  statusFilter: 'all',
  tagFilter: 'all',
  sortField: 'first_name',
  sortDir: 'asc' as const,
};

describe('filterAndSortContacts', () => {
  it('sorts by full name', () => {
    const asc = filterAndSortContacts(contacts, base);
    expect(asc.map((c) => c.first_name)).toEqual(['Amy', 'Bob', 'Zoe']);
    const desc = filterAndSortContacts(contacts, { ...base, sortDir: 'desc' });
    expect(desc.map((c) => c.first_name)).toEqual(['Zoe', 'Bob', 'Amy']);
  });

  it('searches across name, company, and email', () => {
    expect(filterAndSortContacts(contacts, { ...base, searchTerm: 'acme' }).map((c) => c.id)).toEqual(['3', '1']);
    expect(filterAndSortContacts(contacts, { ...base, searchTerm: 'beta.io' }).map((c) => c.id)).toEqual(['2']);
  });

  it('filters by contact type and status', () => {
    expect(filterAndSortContacts(contacts, { ...base, typeFilter: 'vendor' }).map((c) => c.id)).toEqual(['2']);
    expect(filterAndSortContacts(contacts, { ...base, statusFilter: 'inactive' }).map((c) => c.id)).toEqual(['3']);
  });

  it('filters by tag', () => {
    expect(filterAndSortContacts(contacts, { ...base, tagFilter: 'vip' }).map((c) => c.id)).toEqual(['3', '1']);
    // Results are name-sorted by default: Amy (3) before Bob (2).
    expect(filterAndSortContacts(contacts, { ...base, tagFilter: 'cold' }).map((c) => c.id)).toEqual(['3', '2']);
  });
});

describe('collectContactTags', () => {
  it('returns distinct sorted tags', () => {
    expect(collectContactTags(contacts)).toEqual(['cold', 'vip']);
  });
});
