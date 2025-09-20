import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Search, Filter, Save, Star, Clock, Folder, FileText, Users, Calendar, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  id: string;
  type: 'project' | 'task' | 'document' | 'user' | 'comment';
  title: string;
  description?: string;
  content?: string;
  category?: string;
  lastModified?: string;
  relevanceScore?: number;
  metadata?: Record<string, any>;
}

interface SavedFilter {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  createdAt: string;
}

interface SearchFilters {
  type?: string[];
  category?: string[];
  dateRange?: { start: string; end: string };
  assignee?: string[];
  status?: string[];
  tags?: string[];
}

interface GlobalSearchInterfaceProps {
  onSearch: (query: string, filters: SearchFilters) => Promise<SearchResult[]>;
  onResultSelect: (result: SearchResult) => void;
  className?: string;
}

export const GlobalSearchInterface: React.FC<GlobalSearchInterfaceProps> = ({
  onSearch,
  onResultSelect,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  const { toast } = useToast();
  const debouncedQuery = useDebounce(query, 300);

  // Auto-search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      handleSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, filters]);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const searchResults = await onSearch(searchQuery, filters);
      setResults(searchResults);
      
      // Add to recent searches
      setRecentSearches(prev => {
        const updated = [searchQuery, ...prev.filter(q => q !== searchQuery)];
        return updated.slice(0, 10); // Keep only last 10
      });
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Unable to perform search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, onSearch, toast]);

  const handleResultClick = useCallback((result: SearchResult) => {
    onResultSelect(result);
    setIsOpen(false);
    setQuery('');
  }, [onResultSelect]);

  const saveCurrentFilter = useCallback(() => {
    if (!query.trim()) return;

    const filterName = prompt('Enter a name for this search filter:');
    if (!filterName) return;

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName,
      query,
      filters,
      createdAt: new Date().toISOString(),
    };

    setSavedFilters(prev => [...prev, newFilter]);
    
    toast({
      title: "Filter Saved",
      description: `Search filter "${filterName}" has been saved`,
    });
  }, [query, filters, toast]);

  const loadSavedFilter = useCallback((savedFilter: SavedFilter) => {
    setQuery(savedFilter.query);
    setFilters(savedFilter.filters);
    handleSearch(savedFilter.query);
  }, [handleSearch]);

  const groupedResults = useMemo(() => {
    const grouped: Record<string, SearchResult[]> = {};
    results.forEach(result => {
      const type = result.type;
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(result);
    });
    return grouped;
  }, [results]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project': return Folder;
      case 'task': return Calendar;
      case 'document': return FileText;
      case 'user': return Users;
      case 'comment': return Tag;
      default: return FileText;
    }
  };

  const suggestions = useMemo(() => {
    if (query.length < 2) return recentSearches;
    
    // Smart suggestions based on query
    const smartSuggestions = [
      `${query} in:projects`,
      `${query} in:tasks`,
      `${query} in:documents`,
      `${query} assigned:me`,
      `${query} due:today`,
    ];
    
    return [...smartSuggestions, ...recentSearches.filter(s => 
      s.toLowerCase().includes(query.toLowerCase()) && s !== query
    )];
  }, [query, recentSearches]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className={`w-full justify-start text-muted-foreground ${className}`}
          onClick={() => setIsOpen(true)}
        >
          <Search className="mr-2 h-4 w-4" />
          Search across all data...
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Global Search</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects, tasks, documents, users..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            {query.trim() && (
              <Button
                variant="outline"
                onClick={saveCurrentFilter}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Command>
                    <CommandInput placeholder="Filter by type..." />
                    <CommandList>
                      <CommandGroup>
                        {['project', 'task', 'document', 'user'].map(type => (
                          <CommandItem key={type} onSelect={() => {
                            const types = filters.type || [];
                            const updated = types.includes(type) 
                              ? types.filter(t => t !== type)
                              : [...types, type];
                            setFilters(prev => ({ ...prev, type: updated }));
                          }}>
                            {type}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Suggestions & Recent */}
            <div className="lg:w-1/3">
              <div className="space-y-4">
                {/* Saved Filters */}
                {savedFilters.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Saved Filters
                    </h4>
                    <div className="space-y-1">
                      {savedFilters.map(filter => (
                        <Button
                          key={filter.id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-left"
                          onClick={() => loadSavedFilter(filter)}
                        >
                          <div className="truncate">
                            <div className="font-medium">{filter.name}</div>
                            <div className="text-xs text-muted-foreground">{filter.query}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Recent Searches
                    </h4>
                    <div className="space-y-1">
                      {recentSearches.slice(0, 5).map((recent, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setQuery(recent)}
                        >
                          {recent}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Search Results */}
            <div className="lg:w-2/3">
              <ScrollArea className="h-96">
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Searching...
                  </div>
                ) : results.length === 0 && query.trim() ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No results found for "{query}"
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedResults).map(([type, typeResults]) => {
                      const Icon = getTypeIcon(type);
                      return (
                        <div key={type}>
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="h-4 w-4" />
                            <h4 className="font-medium capitalize">{type}s</h4>
                            <Badge variant="secondary">{typeResults.length}</Badge>
                          </div>
                          
                          <div className="space-y-2">
                            {typeResults.map(result => (
                              <div
                                key={result.id}
                                className="p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => handleResultClick(result)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-medium truncate">{result.title}</h5>
                                    {result.description && (
                                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                        {result.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                      {result.category && (
                                        <Badge variant="outline" className="text-xs">
                                          {result.category}
                                        </Badge>
                                      )}
                                      {result.lastModified && (
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(result.lastModified).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {result.relevanceScore && (
                                    <Badge variant="secondary" className="ml-2">
                                      {Math.round(result.relevanceScore * 100)}%
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {type !== Object.keys(groupedResults).slice(-1)[0] && (
                            <Separator className="my-4" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};