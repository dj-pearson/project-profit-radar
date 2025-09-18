import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartFormInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  storageKey: string;
  className?: string;
}

interface StoredEntry {
  value: string;
  count: number;
  lastUsed: Date;
  isFavorite?: boolean;
}

export const SmartFormInput: React.FC<SmartFormInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  storageKey,
  className
}) => {
  const [suggestions, setSuggestions] = useState<StoredEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load suggestions from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`smart-form-${storageKey}`);
    if (stored) {
      try {
        const entries = JSON.parse(stored) as StoredEntry[];
        // Sort by favorites first, then by usage frequency and recency
        const sorted = entries
          .sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            if (a.count !== b.count) return b.count - a.count;
            return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
          })
          .slice(0, 5); // Show top 5 suggestions
        setSuggestions(sorted);
      } catch (error) {
        console.error('Error loading smart form suggestions:', error);
      }
    }
  }, [storageKey]);

  // Save entry when value changes and is not empty
  const saveEntry = (entryValue: string) => {
    if (!entryValue.trim()) return;

    const stored = localStorage.getItem(`smart-form-${storageKey}`);
    let entries: StoredEntry[] = [];
    
    if (stored) {
      try {
        entries = JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing stored entries:', error);
      }
    }

    const existingIndex = entries.findIndex(e => e.value.toLowerCase() === entryValue.toLowerCase());
    
    if (existingIndex >= 0) {
      // Update existing entry
      entries[existingIndex] = {
        ...entries[existingIndex],
        count: entries[existingIndex].count + 1,
        lastUsed: new Date()
      };
    } else {
      // Add new entry
      entries.push({
        value: entryValue,
        count: 1,
        lastUsed: new Date()
      });
    }

    // Keep only last 20 entries to prevent storage bloat
    entries = entries
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    localStorage.setItem(`smart-form-${storageKey}`, JSON.stringify(entries));
    
    // Update suggestions
    const sorted = entries
      .sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        if (a.count !== b.count) return b.count - a.count;
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      })
      .slice(0, 5);
    setSuggestions(sorted);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    saveEntry(suggestion);
    setShowSuggestions(false);
  };

  const toggleFavorite = (suggestionValue: string) => {
    const stored = localStorage.getItem(`smart-form-${storageKey}`);
    if (!stored) return;

    try {
      const entries = JSON.parse(stored) as StoredEntry[];
      const index = entries.findIndex(e => e.value === suggestionValue);
      if (index >= 0) {
        entries[index].isFavorite = !entries[index].isFavorite;
        localStorage.setItem(`smart-form-${storageKey}`, JSON.stringify(entries));
        
        // Update suggestions
        const sorted = entries
          .sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            if (a.count !== b.count) return b.count - a.count;
            return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
          })
          .slice(0, 5);
        setSuggestions(sorted);
      }
    } catch (error) {
      console.error('Error updating favorite:', error);
    }
  };

  const handleBlur = () => {
    if (value.trim()) {
      saveEntry(value);
    }
  };

  const filteredSuggestions = suggestions.filter(s => 
    s.value.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      <div className="relative">
        <Popover open={showSuggestions && filteredSuggestions.length > 0} onOpenChange={setShowSuggestions}>
          <PopoverTrigger asChild>
            <Input
              type={type}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={handleBlur}
              placeholder={placeholder}
              className="pr-8"
            />
          </PopoverTrigger>
          {suggestions.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-8 w-8 p-0"
              onClick={() => setShowSuggestions(!showSuggestions)}
            >
              <Clock className="h-4 w-4" />
            </Button>
          )}
          <PopoverContent className="w-80 p-0" align="start">
            <div className="max-h-60 overflow-auto">
              {filteredSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 hover:bg-accent cursor-pointer"
                  onClick={() => handleSelectSuggestion(suggestion.value)}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">{suggestion.value}</div>
                    <div className="text-xs text-muted-foreground">
                      Used {suggestion.count} times
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0",
                      suggestion.isFavorite && "text-yellow-500"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(suggestion.value);
                    }}
                  >
                    <Star className={cn(
                      "h-4 w-4",
                      suggestion.isFavorite && "fill-current"
                    )} />
                  </Button>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
