import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, Target, TrendingUp, Search, Download, RefreshCw, Eye, AlertTriangle, BarChart3, Lightbulb, Trash2, Plus } from 'lucide-react';
import { logger } from '@/lib/logger';

import {
  generateKeywordBlogTopics,
  parseKeywordStatsCSV,
  selectKeywordsForBlogGeneration,
  type KeywordData,
  type ParsedKeywordStats,
} from './keyword-manager/keywordData';
import { KeywordsTab } from './keyword-manager/KeywordsTab';

const KeywordManager = () => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [keywordStats, setKeywordStats] = useState<ParsedKeywordStats | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<KeywordData[]>([]);
  const [generatedTopics, setGeneratedTopics] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('priority');
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [selectedForBlog, setSelectedForBlog] = useState<Set<string>>(new Set());

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, append: boolean = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please upload a CSV file"
      });
      return;
    }

    try {
      setUploading(true);
      
      const parsedData = await parseKeywordStatsCSV(file);
      
      // Save to database with append option
      await saveKeywordData(parsedData.keywords, append);
      
      // Reload all data to get the complete picture
      await loadKeywordData();

      toast({
        title: "Success",
        description: append 
          ? `Added ${parsedData.totalKeywords} new keywords successfully`
          : `Imported ${parsedData.totalKeywords} keywords successfully`
      });

    } catch (error: any) {
      console.error('File upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to parse CSV file"
      });
    } finally {
      setUploading(false);
    }
  };

  const saveKeywordData = async (keywords: KeywordData[], append: boolean = false) => {
    if (!userProfile?.company_id) return;

    try {
      // Only clear existing data if not appending
      if (!append) {
        const { error: deleteError } = await supabase
          .from('keyword_research_data')
          .delete()
          .eq('company_id', userProfile.company_id);

        if (deleteError) logger.warn('Delete warning:', deleteError);
      }

      // Insert new keyword data in batches
      const batchSize = 100;
      for (let i = 0; i < keywords.length; i += batchSize) {
        const batch = keywords.slice(i, i + batchSize);
        const records = batch.map(keyword => ({
          company_id: userProfile.company_id,
          keyword: keyword.keyword,
          search_volume: keyword.searchVolume,
          difficulty: keyword.difficulty,
          cpc: keyword.cpc || null,
          search_intent: keyword.intent,
          category: keyword.category || 'general',
          priority: keyword.priority,
          current_rank: keyword.currentRank || null,
          target_rank: keyword.targetRank || null
        }));

        // If appending, use upsert to avoid duplicates
        if (append) {
          const { error } = await supabase
            .from('keyword_research_data')
            .upsert(records, { 
              onConflict: 'company_id,keyword',
              ignoreDuplicates: true 
            });
          
          if (error) {
            console.error('Upsert error for batch:', i, error);
            throw error;
          }
        } else {
          const { error } = await supabase
            .from('keyword_research_data')
            .insert(records);
          
          if (error) {
            console.error('Insert error for batch:', i, error);
            throw error;
          }
        }
      }

    } catch (error) {
      console.error('Error saving keyword data:', error);
      throw error;
    }
  };

  const loadKeywordData = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);
      
      // Get keyword data using direct table access
      const { data, error } = await supabase
        .from('keyword_research_data')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('search_volume', { ascending: false });

      if (error) throw error;

      if (data && Array.isArray(data) && data.length > 0) {
        const keywords: KeywordData[] = data.map((row: any) => ({
          keyword: row.keyword,
          searchVolume: row.search_volume,
          difficulty: row.difficulty,
          cpc: row.cpc,
          intent: row.search_intent as KeywordData['intent'],
          category: row.category,
          priority: row.priority as KeywordData['priority'],
          currentRank: row.current_rank,
          targetRank: row.target_rank,
          usedCount: row.used_count || 0
        }));

        const categories = [...new Set(keywords.map(k => k.category).filter(Boolean))];
        const highPriorityKeywords = keywords.filter(k => k.priority === 'high');

        setKeywordStats({
          keywords,
          totalKeywords: keywords.length,
          highPriorityKeywords,
          categories
        });

        // Load the current selections for blog generation
        const selectedKeywords = keywords.filter(k => {
          const dbRow = data.find(d => d.keyword === k.keyword);
          return dbRow?.selected_for_blog_generation === true;
        });
        
        const selectedKeywordSet = new Set(selectedKeywords.map(k => k.keyword));
        setSelectedForBlog(selectedKeywordSet);
        setSelectedKeywords(selectedKeywords);
        
        if (selectedKeywords.length > 0) {
          const topics = generateKeywordBlogTopics(selectedKeywords);
          setGeneratedTopics(topics);
        }
      }

    } catch (error) {
      console.error('Error loading keyword data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load keyword data"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectOptimalKeywords = async () => {
    if (!keywordStats || !userProfile?.company_id) return;

    const optimal = selectKeywordsForBlogGeneration(keywordStats.keywords, {
      maxKeywords: 5,
      preferHighVolume: true,
      preferLowDifficulty: true,
      minSearchVolume: 100
    });

    try {
      // First, clear all existing selections
      const { error: updateKeywordResearchDataError } = await supabase
        .from('keyword_research_data')
        .update({ 
          selected_for_blog_generation: false,
          updated_at: new Date().toISOString()
        })
        .eq('company_id', userProfile.company_id);
      if (updateKeywordResearchDataError) {
        throw new Error(`Failed to update keyword_research_data: ${updateKeywordResearchDataError.message}`);
      }

      // Then, select the optimal keywords
      const optimalKeywords = optimal.map(k => k.keyword);
      
      if (optimalKeywords.length > 0) {
        const { error } = await supabase
          .from('keyword_research_data')
          .update({ 
            selected_for_blog_generation: true,
            updated_at: new Date().toISOString()
          })
          .eq('company_id', userProfile.company_id)
          .in('keyword', optimalKeywords);

        if (error) {
          console.error('Error selecting optimal keywords:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to select optimal keywords"
          });
          return;
        }
      }

      setSelectedKeywords(optimal);
      const topics = generateKeywordBlogTopics(optimal);
      setGeneratedTopics(topics);
      
      // Also update the blog selection UI
      const optimalKeywordSet = new Set(optimalKeywords);
      setSelectedForBlog(optimalKeywordSet);

      toast({
        title: "Keywords Selected",
        description: `Selected ${optimal.length} optimal keywords for blog generation`
      });

    } catch (error: any) {
      console.error('Error selecting optimal keywords:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to select optimal keywords"
      });
    }
  };

  const toggleKeywordForBlog = async (keyword: string) => {
    if (!userProfile?.company_id) return;
    
    const newSelected = new Set(selectedForBlog);
    const isCurrentlySelected = newSelected.has(keyword);
    
    if (isCurrentlySelected) {
      newSelected.delete(keyword);
    } else {
      newSelected.add(keyword);
    }
    
    setSelectedForBlog(newSelected);
    
    try {
      // Update the database to mark keywords as selected for blog generation
      const { error } = await supabase
        .from('keyword_research_data')
        .update({ 
          selected_for_blog_generation: !isCurrentlySelected,
          updated_at: new Date().toISOString()
        })
        .eq('company_id', userProfile.company_id)
        .eq('keyword', keyword);

      if (error) {
        console.error('Error updating keyword selection:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update keyword selection"
        });
        return;
      }
      
      // Update selectedKeywords based on selection
      if (keywordStats) {
        const keywords = keywordStats.keywords.filter(k => newSelected.has(k.keyword));
        setSelectedKeywords(keywords);
        const topics = generateKeywordBlogTopics(keywords);
        setGeneratedTopics(topics);
      }

      toast({
        title: isCurrentlySelected ? "Keyword Deselected" : "Keyword Selected",
        description: `"${keyword}" ${isCurrentlySelected ? 'removed from' : 'added to'} blog generation queue`
      });

    } catch (error: any) {
      console.error('Error updating keyword selection:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update keyword selection"
      });
    }
  };

  const toggleKeywordForDeletion = useCallback((keyword: string) => {
    setSelectedForDeletion(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(keyword)) {
        newSelected.delete(keyword);
      } else {
        newSelected.add(keyword);
      }
      return newSelected;
    });
  }, []);

  // Memoized filtered and sorted keywords to prevent recalculation on every render
  const filteredKeywords = useMemo(() => {
    if (!keywordStats) return [];

    let filtered = keywordStats.keywords;

    if (activeFilter !== 'all') {
      if (activeFilter === 'high-priority') {
        filtered = filtered.filter(k => k.priority === 'high');
      } else if (activeFilter === 'high-volume') {
        filtered = filtered.filter(k => k.searchVolume >= 1000);
      } else if (activeFilter === 'low-difficulty') {
        filtered = filtered.filter(k => k.difficulty <= 30);
      } else {
        filtered = filtered.filter(k => k.category === activeFilter);
      }
    }

    // Sort keywords (create new array to avoid mutating)
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'volume':
          return b.searchVolume - a.searchVolume;
        case 'difficulty':
          return a.difficulty - b.difficulty;
        case 'priority': {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [keywordStats, activeFilter, sortBy]);

  const clearAllKeywords = async () => {
    if (!userProfile?.company_id) return;
    
    if (!confirm('Are you sure you want to delete ALL keywords? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('keyword_research_data')
        .delete()
        .eq('company_id', userProfile.company_id);

      if (error) throw error;

      setKeywordStats(null);
      setSelectedKeywords([]);
      setGeneratedTopics([]);
      setSelectedForDeletion(new Set());

      toast({
        title: "Success",
        description: "All keywords have been cleared"
      });

    } catch (error: any) {
      console.error('Error clearing keywords:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear keywords"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteSelectedKeywords = async () => {
    if (!userProfile?.company_id || selectedForDeletion.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedForDeletion.size} selected keywords?`)) {
      return;
    }

    try {
      setLoading(true);
      
      const keywordsToDelete = Array.from(selectedForDeletion);
      
      const { error } = await supabase
        .from('keyword_research_data')
        .delete()
        .eq('company_id', userProfile.company_id)
        .in('keyword', keywordsToDelete);

      if (error) throw error;

      // Refresh the data
      await loadKeywordData();
      setSelectedForDeletion(new Set());

      toast({
        title: "Success",
        description: `Deleted ${keywordsToDelete.length} keywords`
      });

    } catch (error: any) {
      console.error('Error deleting keywords:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete selected keywords"
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelUpload = () => {
    setUploading(false);
    setKeywordStats(null);
    
    // Reset file input
    const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    
    toast({
      title: "Upload Cancelled",
      description: "Keyword import has been cancelled"
    });
  };

  const downloadSampleCSV = () => {
    const sampleData = `keyword,search_volume,difficulty,cpc,intent,category,priority,current_rank,target_rank
construction management software,2400,45,12.50,commercial,software,high,,3
project management tools,1800,38,8.90,commercial,tools,high,,5
construction scheduling,1200,42,15.20,informational,management,medium,,
safety management system,800,35,22.10,commercial,safety,high,,
cost tracking software,600,40,18.75,commercial,finance,medium,,
construction reporting,450,30,12.30,informational,reporting,low,,`;

    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'keyword_stats_sample.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    loadKeywordData();
  }, [userProfile?.company_id]);

  // Memoized helper functions
  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  }, []);

  const getIntentIcon = useCallback((intent: string) => {
    switch (intent) {
      case 'commercial': return <TrendingUp className="h-3 w-3" />;
      case 'transactional': return <Target className="h-3 w-3" />;
      case 'navigational': return <Search className="h-3 w-3" />;
      default: return <Eye className="h-3 w-3" />;
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6" />
            Keyword Research Manager
          </h2>
          <p className="text-muted-foreground">
            Import and manage keywords for targeted blog content generation
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={downloadSampleCSV}>
            <Download className="h-4 w-4 mr-2" />
            Sample CSV
          </Button>
          <Button onClick={loadKeywordData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {keywordStats && (
            <Button variant="outline" onClick={clearAllKeywords} disabled={loading}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
          {selectedForDeletion.size > 0 && (
            <Button variant="destructive" onClick={deleteSelectedKeywords} disabled={loading}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedForDeletion.size})
            </Button>
          )}
        </div>
      </div>

      {/* Upload Section */}
      {!keywordStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Keyword Stats CSV
            </CardTitle>
            <CardDescription>
              Import your keyword research data to optimize blog content generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
              onDrop={(e) => {
                e.preventDefault();
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                  const event = { target: { files } } as any;
                  handleFileUpload(event);
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={(e) => e.preventDefault()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <div className="space-y-4">
                <div>
                  <Label htmlFor="csv-upload" className="text-base font-medium cursor-pointer hover:text-primary">
                    Drop your CSV file here or click to browse
                  </Label>
                  <p className="text-sm text-muted-foreground mt-2">
                    Supported format: CSV with columns for keyword, search_volume, difficulty, intent, etc.
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => document.getElementById('csv-upload')?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileUpload(e)}
                  disabled={uploading}
                  className="hidden"
                />
              </div>
            </div>

            {uploading && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Processing CSV file...</span>
                  <Button variant="outline" size="sm" onClick={cancelUpload}>
                    Cancel
                  </Button>
                </div>
                <Progress value={45} className="h-2" />
              </div>
            )}

            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <strong>Expected CSV Format:</strong> keyword, search_volume, difficulty, cpc, intent, category, priority, current_rank, target_rank
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Add More Keywords Section */}
      {keywordStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add More Keywords
            </CardTitle>
            <CardDescription>
              Upload additional keyword CSV files to expand your keyword database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => document.getElementById('csv-append')?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Add Keywords from CSV
              </Button>
              <Input
                id="csv-append"
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, true)}
                disabled={uploading}
                className="hidden"
              />
            </div>
            
            {uploading && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Adding keywords...</span>
                  <Button variant="outline" size="sm" onClick={cancelUpload}>
                    Cancel
                  </Button>
                </div>
                <Progress value={45} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Keywords Overview */}
      {keywordStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{keywordStats.totalKeywords}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total Keywords</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="font-medium">{keywordStats.highPriorityKeywords.length}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">High Priority</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-green-500" />
                <span className="font-medium">{selectedKeywords.length}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Selected for Blogs</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Lightbulb className="h-4 w-4 text-purple-500" />
                <span className="font-medium">{keywordStats.categories.length}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Categories</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {keywordStats && (
        <Tabs defaultValue="keywords" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="selected">Selected Keywords</TabsTrigger>
            <TabsTrigger value="topics">Blog Topics</TabsTrigger>
          </TabsList>

          {/* Keywords Tab */}
          <TabsContent value="keywords" className="space-y-4">
            <KeywordsTab
              userProfile={userProfile}
              keywordStats={keywordStats}
              filteredKeywords={filteredKeywords}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              selectedForBlog={selectedForBlog}
              setSelectedForBlog={setSelectedForBlog}
              selectedForDeletion={selectedForDeletion}
              setSelectedKeywords={setSelectedKeywords}
              setGeneratedTopics={setGeneratedTopics}
              selectOptimalKeywords={selectOptimalKeywords}
              toggleKeywordForBlog={toggleKeywordForBlog}
              toggleKeywordForDeletion={toggleKeywordForDeletion}
              getPriorityColor={getPriorityColor}
              getIntentIcon={getIntentIcon}
            />
          </TabsContent>

          {/* Selected Keywords Tab */}
          <TabsContent value="selected" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Selected Keywords for Blog Generation</CardTitle>
                <CardDescription>
                  Keywords chosen for AI blog content generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedKeywords.length > 0 ? (
                  <div className="space-y-4">
                    {selectedKeywords.map((keyword, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{keyword.keyword}</h4>
                          <Badge className={getPriorityColor(keyword.priority)}>
                            {keyword.priority}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Volume:</span> {keyword.searchVolume.toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Difficulty:</span> {keyword.difficulty}%
                          </div>
                          <div>
                            <span className="font-medium">Intent:</span> {keyword.intent}
                          </div>
                          <div>
                            <span className="font-medium">Category:</span> {keyword.category}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No keywords selected. Click "Auto-Select Optimal" to choose keywords automatically.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Blog Topics Tab */}
          <TabsContent value="topics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Generated Blog Topic Ideas</CardTitle>
                <CardDescription>
                  AI-generated blog topics based on selected keywords
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generatedTopics.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {generatedTopics.map((topic, index) => (
                      <div key={index} className="p-3 border rounded-lg hover:bg-muted/50">
                        <div className="font-medium">{topic}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Select keywords first to generate blog topic ideas.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default KeywordManager;