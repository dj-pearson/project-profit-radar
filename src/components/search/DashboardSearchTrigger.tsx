/**
 * DashboardSearchTrigger - Global search button for the dashboard header
 * Opens the GlobalSearchInterface modal via Ctrl+K or clicking the button
 * Provides cross-entity search across projects, documents, contacts, invoices
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, FileText, Building2, Users, DollarSign, Clock, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  id: string;
  type: 'project' | 'document' | 'contact' | 'invoice';
  title: string;
  subtitle?: string;
  url: string;
}

const TYPE_CONFIG = {
  project: { icon: Building2, label: 'Project', color: 'text-blue-600' },
  document: { icon: FileText, label: 'Document', color: 'text-green-600' },
  contact: { icon: Users, label: 'Contact', color: 'text-purple-600' },
  invoice: { icon: DollarSign, label: 'Invoice', color: 'text-orange-600' },
};

const RECENT_SEARCHES_KEY = 'brikly_recent_searches';
const MAX_RECENT = 5;

export const DashboardSearchTrigger: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const navigate = useNavigate();

  // Load recent searches
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const searchResults: SearchResult[] = [];
      const searchTerm = `%${query}%`;

      try {
        // Search projects
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name, client_name, status')
          .or(`name.ilike.${searchTerm},client_name.ilike.${searchTerm}`)
          .limit(5);

        if (projects) {
          projects.forEach(p => searchResults.push({
            id: p.id,
            type: 'project',
            title: p.name,
            subtitle: p.client_name || p.status,
            url: `/projects/${p.id}`,
          }));
        }

        // Search contacts. crm_contacts is not created by any migration
        // (US-311), so this read can fail outright; without reading the error
        // the search just quietly returns no contacts and looks like a miss.
        const { data: contacts, error: contactsError } = await supabase
          .from('crm_contacts')
          .select('id, first_name, last_name, company, email')
          .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},company.ilike.${searchTerm},email.ilike.${searchTerm}`)
          .limit(5);

        if (contactsError) {
          console.error('Contact search unavailable:', contactsError.message);
        }

        if (contacts) {
          contacts.forEach(c => searchResults.push({
            id: c.id,
            type: 'contact',
            title: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || 'Unknown',
            subtitle: c.company || c.email || undefined,
            url: '/crm-contacts',
          }));
        }

        // Search invoices
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id, invoice_number, client_name, total_amount, status')
          .or(`invoice_number.ilike.${searchTerm},client_name.ilike.${searchTerm}`)
          .limit(5);

        if (invoices) {
          invoices.forEach(inv => searchResults.push({
            id: inv.id,
            type: 'invoice',
            title: `Invoice ${inv.invoice_number || inv.id.slice(0, 8)}`,
            subtitle: inv.client_name || `$${inv.total_amount?.toLocaleString() || '0'}`,
            url: '/invoices',
          }));
        }

        // Search documents
        const { data: documents } = await supabase
          .from('documents')
          .select('id, name, document_type')
          .ilike('name', searchTerm)
          .limit(5);

        if (documents) {
          documents.forEach(d => searchResults.push({
            id: d.id,
            type: 'document',
            title: d.name,
            subtitle: d.document_type || undefined,
            url: '/document-management',
          }));
        }
      } catch {
        // Silently handle search errors
      }

      setResults(searchResults);
      setSelectedIndex(0);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const saveRecentSearch = useCallback((term: string) => {
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  }, [recentSearches]);

  const handleSelect = useCallback((result: SearchResult) => {
    saveRecentSearch(query);
    setOpen(false);
    setQuery('');
    navigate(result.url);
  }, [query, navigate, saveRecentSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }, [results, selectedIndex, handleSelect]);

  // Group results by type
  const groupedResults = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  const isMac = typeof navigator !== 'undefined' && navigator.platform?.includes('Mac');

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden md:flex items-center gap-2 h-9 px-3 text-muted-foreground"
        onClick={() => setOpen(true)}
        aria-label="Search (Ctrl+K)"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="text-sm">Search...</span>
        <kbd className="pointer-events-none hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          {isMac ? '⌘' : 'Ctrl'}K
        </kbd>
      </Button>

      {/* Mobile search button */}
      <Button
        variant="outline"
        size="sm"
        className="md:hidden h-9 w-9 p-0"
        onClick={() => setOpen(true)}
        aria-label="Search"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 gap-0 overflow-hidden" aria-label="Global search">
          {/* Search Input */}
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            <Input
              placeholder="Search projects, contacts, invoices, documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
              autoFocus
              aria-label="Search input"
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto p-2" role="listbox" aria-label="Search results">
            {isSearching && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}

            {!query && recentSearches.length > 0 && (
              <div className="p-2">
                <p className="text-xs font-medium text-muted-foreground px-2 mb-2">Recent Searches</p>
                {recentSearches.map((term, i) => (
                  <button
                    key={i}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent text-left"
                    onClick={() => setQuery(term)}
                  >
                    <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    {term}
                  </button>
                ))}
              </div>
            )}

            {!isSearching && query && results.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No results found for "{query}"
              </div>
            )}

            {Object.entries(groupedResults).map(([type, items]) => {
              const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
              return (
                <div key={type} className="mb-2">
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1 flex items-center gap-1">
                    <config.icon className={cn('h-3 w-3', config.color)} aria-hidden="true" />
                    {config.label}s ({items.length})
                  </p>
                  {items.map((result) => {
                    const flatIndex = results.indexOf(result);
                    return (
                      <button
                        key={result.id}
                        role="option"
                        aria-selected={flatIndex === selectedIndex}
                        className={cn(
                          'w-full flex items-center justify-between gap-2 px-2 py-2 text-sm rounded-md text-left transition-colors',
                          flatIndex === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                        )}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setSelectedIndex(flatIndex)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                          )}
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span><kbd className="font-mono bg-muted px-1 rounded">↑↓</kbd> Navigate</span>
              <span><kbd className="font-mono bg-muted px-1 rounded">↵</kbd> Select</span>
              <span><kbd className="font-mono bg-muted px-1 rounded">Esc</kbd> Close</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DashboardSearchTrigger;
