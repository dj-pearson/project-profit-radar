import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Target, Filter, CheckCircle2, Plus, Minus } from 'lucide-react';
import React from 'react';
import type { useAuth } from '@/contexts/AuthContext';
import { generateKeywordBlogTopics, type KeywordData, type ParsedKeywordStats } from './keywordData';

interface KeywordsTabProps {
  userProfile: ReturnType<typeof useAuth>['userProfile'];
  keywordStats: ParsedKeywordStats;
  filteredKeywords: KeywordData[];
  activeFilter: string;
  setActiveFilter: React.Dispatch<React.SetStateAction<string>>;
  sortBy: string;
  setSortBy: React.Dispatch<React.SetStateAction<string>>;
  selectedForBlog: Set<string>;
  setSelectedForBlog: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedForDeletion: Set<string>;
  setSelectedKeywords: React.Dispatch<React.SetStateAction<KeywordData[]>>;
  setGeneratedTopics: React.Dispatch<React.SetStateAction<string[]>>;
  selectOptimalKeywords: () => void;
  toggleKeywordForBlog: (keyword: string) => void;
  toggleKeywordForDeletion: (keyword: string) => void;
  getPriorityColor: (priority: string) => string;
  getIntentIcon: (intent: string) => React.ReactNode;
}

/** The Keywords tab: filter/sort controls and the selectable keyword list. */
export function KeywordsTab({ userProfile, keywordStats, filteredKeywords, activeFilter, setActiveFilter, sortBy, setSortBy, selectedForBlog, setSelectedForBlog, selectedForDeletion, setSelectedKeywords, setGeneratedTopics, selectOptimalKeywords, toggleKeywordForBlog, toggleKeywordForDeletion, getPriorityColor, getIntentIcon }: KeywordsTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Keyword Database</CardTitle>
            <CardDescription>
              All imported keywords with filtering and selection options
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={selectOptimalKeywords}>
              <Target className="h-4 w-4 mr-2" />
              Auto-Select Optimal
            </Button>
            <Button 
              variant="outline" 
              onClick={async () => {
                if (!keywordStats || !userProfile?.company_id) return;

                try {
                  // Mark all keywords as selected for blog generation
                  const { error } = await supabase
                    .from('keyword_research_data')
                    .update({ 
                      selected_for_blog_generation: true,
                      updated_at: new Date().toISOString()
                    })
                    .eq('company_id', userProfile.company_id);

                  if (error) {
                    console.error('Error selecting all keywords:', error);
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: "Failed to select all keywords"
                    });
                    return;
                  }

                  const allKeywords = new Set(keywordStats.keywords.map(k => k.keyword));
                  setSelectedForBlog(allKeywords);
                  setSelectedKeywords(keywordStats.keywords);
                  const topics = generateKeywordBlogTopics(keywordStats.keywords);
                  setGeneratedTopics(topics);

                  toast({
                    title: "All Keywords Selected",
                    description: `Selected all ${keywordStats.keywords.length} keywords for blog generation`
                  });
                } catch (error: any) {
                  console.error('Error selecting all keywords:', error);
                  toast({
                    variant: "destructive",
                    title: "Error",  
                    description: "Failed to select all keywords"
                  });
                }
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Select All
            </Button>
            <Button 
              variant="outline" 
              onClick={async () => {
                if (!userProfile?.company_id) return;

                try {
                  // Clear all selections in the database
                  const { error } = await supabase
                    .from('keyword_research_data')
                    .update({ 
                      selected_for_blog_generation: false,
                      updated_at: new Date().toISOString()
                    })
                    .eq('company_id', userProfile.company_id);

                  if (error) {
                    console.error('Error clearing selections:', error);
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: "Failed to clear selections"
                    });
                    return;
                  }

                  setSelectedForBlog(new Set());
                  setSelectedKeywords([]);
                  setGeneratedTopics([]);

                  toast({
                    title: "Selection Cleared",
                    description: "Cleared all keyword selections"
                  });
                } catch (error: any) {
                  console.error('Error clearing selections:', error);
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to clear selections"
                  });
                }
              }}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <Label>Filter:</Label>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All keywords" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Keywords</SelectItem>
                <SelectItem value="high-priority">High Priority</SelectItem>
                <SelectItem value="high-volume">High Volume</SelectItem>
                <SelectItem value="low-difficulty">Low Difficulty</SelectItem>
                {keywordStats.categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Label>Sort:</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="volume">Volume</SelectItem>
                <SelectItem value="difficulty">Difficulty</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

         {/* Keywords List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredKeywords.map((keyword, index) => {
            const isUsed = (keyword.usedCount || 0) > 0;
            const isSelected = selectedForBlog.has(keyword.keyword);

            return (
            <div
              key={index}
              className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
                        isUsed 
                          ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-700' 
                          : isSelected 
                            ? 'border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-700'
                            : ''
                      }`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedForDeletion.has(keyword.keyword)}
                    onChange={() => toggleKeywordForDeletion(keyword.keyword)}
                    className="rounded"
                  />
                  <Button
                    size="sm"
                    variant={selectedForBlog.has(keyword.keyword) ? "default" : "outline"}
                    onClick={() => toggleKeywordForBlog(keyword.keyword)}
                    className="h-6 w-6 p-0"
                  >
                    {selectedForBlog.has(keyword.keyword) ? 
                      <Minus className="h-3 w-3" /> : 
                      <Plus className="h-3 w-3" />
                    }
                  </Button>
                </div>
                <div className={`w-2 h-2 rounded-full ${getPriorityColor(keyword.priority)}`}></div>
                <div>
                  <div className={`font-medium flex items-center gap-2 ${
                            isUsed ? 'text-orange-700 dark:text-orange-300' : ''
                          }`}>
                    {keyword.keyword}
                    {isUsed && (
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                        Used {keyword.usedCount}x
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {keyword.category} • {keyword.intent}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm font-medium">{keyword.searchVolume.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">volume</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{keyword.difficulty}%</div>
                  <div className="text-xs text-muted-foreground">difficulty</div>
                </div>
                <div className="flex items-center space-x-2">
                  {getIntentIcon(keyword.intent)}
                  <div className="text-xs">
                    {isUsed ? (
                      <span className="text-orange-600 dark:text-orange-400 font-medium">● Used</span>
                    ) : isSelected ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">✓ Selected</span>
                    ) : (
                      <span className="text-muted-foreground">○ Available</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
