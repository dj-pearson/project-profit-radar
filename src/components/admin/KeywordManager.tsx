import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { ErrorState } from '@/components/common/ErrorState';
import { confirmAction } from '@/components/ui/confirm-dialog';
import { useKeywordResearch } from '@/hooks/useKeywordResearch';
import { Upload, Target, TrendingUp, Search, Download, RefreshCw, Eye, AlertTriangle, BarChart3, Lightbulb, Trash2, Plus } from 'lucide-react';

import {
  generateKeywordBlogTopics,
  parseKeywordStatsCSV,
  selectKeywordsForBlogGeneration,
  type KeywordData,
  type ParsedKeywordStats,
} from './keyword-manager/keywordData';
import { KeywordsTab } from './keyword-manager/KeywordsTab';

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

const KeywordManager = () => {
  const research = useKeywordResearch();
  const loading = research.isFetching || research.isWriting;
  const [uploading, setUploading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('priority');
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());

  // Everything below is derived from the saved rows, so after a write the
  // screen shows what the database holds rather than what was intended.
  const keywordStats: ParsedKeywordStats | null = useMemo(() => {
    const keywords = research.data?.keywords ?? [];
    if (keywords.length === 0) return null;
    return {
      keywords,
      totalKeywords: keywords.length,
      highPriorityKeywords: keywords.filter(k => k.priority === 'high'),
      categories: [...new Set(keywords.map(k => k.category).filter(Boolean))] as string[],
    };
  }, [research.data]);
  const selectedKeywords: KeywordData[] = useMemo(() => research.data?.selected ?? [], [research.data]);
  const selectedForBlog = useMemo(() => new Set(selectedKeywords.map(k => k.keyword)), [selectedKeywords]);
  const generatedTopics = useMemo(
    () => (selectedKeywords.length > 0 ? generateKeywordBlogTopics(selectedKeywords) : []),
    [selectedKeywords]
  );

  const loadKeywordData = () => { void research.refetch(); };

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
      await research.importKeywords(parsedData.keywords, append);

      toast({
        title: "Success",
        description: append 
          ? `Added ${parsedData.totalKeywords} new keywords successfully`
          : `Imported ${parsedData.totalKeywords} keywords successfully`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: message(error) || "Failed to parse CSV file"
      });
    } finally {
      setUploading(false);
    }
  };

  const selectOptimalKeywords = async () => {
    if (!keywordStats) return;

    const optimal = selectKeywordsForBlogGeneration(keywordStats.keywords, {
      maxKeywords: 5,
      preferHighVolume: true,
      preferLowDifficulty: true,
      minSearchVolume: 100
    });

    try {
      await research.setBlogSelection(optimal.map(k => k.keyword));
      toast({
        title: "Keywords Selected",
        description: `Selected ${optimal.length} optimal keywords for blog generation`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to select optimal keywords: ${message(error)}`
      });
    }
  };

  const toggleKeywordForBlog = async (keyword: string) => {
    const isCurrentlySelected = selectedForBlog.has(keyword);
    try {
      await research.setKeywordSelected(keyword, !isCurrentlySelected);
      toast({
        title: isCurrentlySelected ? "Keyword Deselected" : "Keyword Selected",
        description: `"${keyword}" ${isCurrentlySelected ? 'removed from' : 'added to'} blog generation queue`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to update keyword selection: ${message(error)}`
      });
    }
  };

  const setAllSelected = async (selected: boolean) => {
    try {
      const changed = await research.setAllSelected(selected);
      toast(selected
        ? { title: "All Keywords Selected", description: `Selected all ${changed} keywords for blog generation` }
        : { title: "Selection Cleared", description: "Cleared all keyword selections" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${selected ? 'select all keywords' : 'clear selections'}: ${message(error)}`
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
    if (!(await confirmAction({
      title: 'Delete ALL keywords?',
      description: 'This action cannot be undone.',
      confirmLabel: 'Delete all',
      destructive: true,
    }))) {
      return;
    }

    try {
      await research.deleteKeywords();
      setSelectedForDeletion(new Set());
      toast({
        title: "Success",
        description: "All keywords have been cleared"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to clear keywords: ${message(error)}`
      });
    }
  };

  const deleteSelectedKeywords = async () => {
    if (selectedForDeletion.size === 0) return;

    if (!(await confirmAction({
      title: `Delete ${selectedForDeletion.size} selected keywords?`,
      confirmLabel: 'Delete',
      destructive: true,
    }))) {
      return;
    }

    try {
      const keywordsToDelete = Array.from(selectedForDeletion);
      await research.deleteKeywords(keywordsToDelete);
      setSelectedForDeletion(new Set());
      toast({
        title: "Success",
        description: `Deleted ${keywordsToDelete.length} keywords`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to delete selected keywords: ${message(error)}`
      });
    }
  };

  const cancelUpload = () => {
    setUploading(false);
    
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

  if (research.error) {
    return (
      <ErrorState
        title="Keywords could not be loaded"
        error={research.error}
        onRetry={loadKeywordData}
      />
    );
  }

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
              keywordStats={keywordStats}
              filteredKeywords={filteredKeywords}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              selectedForBlog={selectedForBlog}
              selectedForDeletion={selectedForDeletion}
              selectAll={() => { void setAllSelected(true); }}
              clearSelection={() => { void setAllSelected(false); }}
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