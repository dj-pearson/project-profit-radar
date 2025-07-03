import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter, Calendar, File, Settings } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'project' | 'document' | 'invoice' | 'expense' | 'contact' | 'report';
  url: string;
  lastModified: string;
  relevanceScore: number;
  metadata?: Record<string, any>;
}

interface SearchFilters {
  type: string;
  dateRange: string;
  project: string;
  sortBy: string;
}

const GlobalSearch = () => {
  const { userProfile } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    dateRange: 'all',
    project: 'all',
    sortBy: 'relevance'
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    loadProjects();
    loadRecentSearches();
  }, [userProfile]);

  useEffect(() => {
    if (query.length > 2) {
      const debounceTimer = setTimeout(() => {
        performSearch();
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      setResults([]);
    }
  }, [query, filters]);

  const loadProjects = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', userProfile.company_id)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadRecentSearches = () => {
    const saved = localStorage.getItem(`recent_searches_${userProfile?.id}`);
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  };

  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim() || !userProfile?.id) return;

    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(`recent_searches_${userProfile.id}`, JSON.stringify(updated));
  };

  const performSearch = useCallback(async () => {
    if (!query.trim() || !userProfile?.company_id) return;

    setLoading(true);
    saveRecentSearch(query);

    try {
      const searchResults: SearchResult[] = [];

      // Search projects
      if (filters.type === 'all' || filters.type === 'project') {
        const { data: projectResults, error: projectError } = await supabase
          .from('projects')
          .select('id, name, description, created_at')
          .eq('company_id', userProfile.company_id)
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`);

        if (!projectError && projectResults) {
          searchResults.push(...projectResults.map(project => ({
            id: `project-${project.id}`,
            title: project.name,
            description: project.description || 'No description available',
            type: 'project' as const,
            url: `/project/${project.id}`,
            lastModified: project.created_at,
            relevanceScore: calculateRelevance(query, project.name + ' ' + (project.description || '')),
            metadata: { projectId: project.id }
          })));
        }
      }

      // Search documents
      if (filters.type === 'all' || filters.type === 'document') {
        const { data: documentResults, error: documentError } = await supabase
          .from('documents')
          .select('id, name, description, created_at, project_id')
          .eq('company_id', userProfile.company_id)
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`);

        if (!documentError && documentResults) {
          searchResults.push(...documentResults.map(doc => ({
            id: `document-${doc.id}`,
            title: doc.name,
            description: doc.description || 'Document',
            type: 'document' as const,
            url: `/documents?id=${doc.id}`,
            lastModified: doc.created_at,
            relevanceScore: calculateRelevance(query, doc.name + ' ' + (doc.description || '')),
            metadata: { projectId: doc.project_id }
          })));
        }
      }

      // Search invoices
      if (filters.type === 'all' || filters.type === 'invoice') {
        const { data: invoiceResults, error: invoiceError } = await supabase
          .from('invoices')
          .select('id, invoice_number, client_name, created_at, total_amount')
          .eq('company_id', userProfile.company_id)
          .or(`invoice_number.ilike.%${query}%,client_name.ilike.%${query}%`);

        if (!invoiceError && invoiceResults) {
          searchResults.push(...invoiceResults.map(invoice => ({
            id: `invoice-${invoice.id}`,
            title: `Invoice ${invoice.invoice_number}`,
            description: `Client: ${invoice.client_name || 'Unknown'} - $${invoice.total_amount}`,
            type: 'invoice' as const,
            url: `/financial?invoice=${invoice.id}`,
            lastModified: invoice.created_at,
            relevanceScore: calculateRelevance(query, invoice.invoice_number + ' ' + (invoice.client_name || '')),
            metadata: { amount: invoice.total_amount }
          })));
        }
      }

      // Apply filters
      let filteredResults = searchResults;

      if (filters.project !== 'all') {
        filteredResults = filteredResults.filter(result => 
          result.metadata?.projectId === filters.project
        );
      }

      if (filters.dateRange !== 'all') {
        const days = parseInt(filters.dateRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        filteredResults = filteredResults.filter(result => 
          new Date(result.lastModified) >= cutoffDate
        );
      }

      // Sort results
      switch (filters.sortBy) {
        case 'relevance':
          filteredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
          break;
        case 'date':
          filteredResults.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
          break;
        case 'title':
          filteredResults.sort((a, b) => a.title.localeCompare(b.title));
          break;
      }

      setResults(filteredResults);

    } catch (error) {
      console.error('Search error:', error);
      toast({
        variant: "destructive",
        title: "Search Error",
        description: "Failed to perform search. Please try again."
      });
    } finally {
      setLoading(false);
    }
  }, [query, filters, userProfile?.company_id]);

  const calculateRelevance = (searchQuery: string, text: string): number => {
    const queryWords = searchQuery.toLowerCase().split(' ');
    const textWords = text.toLowerCase().split(' ');
    
    let score = 0;
    queryWords.forEach(queryWord => {
      textWords.forEach(textWord => {
        if (textWord.includes(queryWord)) {
          score += queryWord.length / textWord.length;
        }
      });
    });
    
    return score;
  };

  const getTypeColor = (type: SearchResult['type']) => {
    const colors = {
      project: 'bg-blue-100 text-blue-800',
      document: 'bg-green-100 text-green-800',
      invoice: 'bg-yellow-100 text-yellow-800',
      expense: 'bg-red-100 text-red-800',
      contact: 'bg-purple-100 text-purple-800',
      report: 'bg-indigo-100 text-indigo-800'
    };
    return colors[type];
  };

  const handleRecentSearchClick = (searchQuery: string) => {
    setQuery(searchQuery);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    if (userProfile?.id) {
      localStorage.removeItem(`recent_searches_${userProfile.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Search className="h-5 w-5" />
        <h2 className="text-2xl font-semibold">Global Search</h2>
      </div>

      {/* Search Input */}
      <Card>
        <CardHeader>
          <CardTitle>Search Everything</CardTitle>
          <CardDescription>
            Search across projects, documents, invoices, and more
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects, documents, invoices..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 text-lg"
            />
          </div>

          {/* Search Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="project">Projects</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Date Range</label>
              <Select value={filters.dateRange} onValueChange={(value) => setFilters({...filters, dateRange: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Project</label>
              <Select value={filters.project} onValueChange={(value) => setFilters({...filters, project: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Sort By</label>
              <Select value={filters.sortBy} onValueChange={(value) => setFilters({...filters, sortBy: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="date">Date Modified</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Searches */}
      {recentSearches.length > 0 && !query && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Searches</CardTitle>
            <Button variant="outline" size="sm" onClick={clearRecentSearches}>
              Clear All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleRecentSearchClick(search)}
                  className="text-sm"
                >
                  {search}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {query && (
        <Card>
          <CardHeader>
            <CardTitle>
              Search Results
              {!loading && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({results.length} results for "{query}")
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No results found for "{query}". Try adjusting your search terms or filters.
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <div key={result.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-lg">
                            <a href={result.url} className="hover:underline">
                              {result.title}
                            </a>
                          </h3>
                          <Badge className={getTypeColor(result.type)}>
                            {result.type}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-2">{result.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>Modified: {new Date(result.lastModified).toLocaleDateString()}</span>
                          <span>Relevance: {Math.round(result.relevanceScore * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GlobalSearch;