/** Keyword CSV parsing and blog-topic selection for KeywordManager. Pure: no React, no Supabase. */

export interface KeywordData {
  keyword: string;
  searchVolume: number;
  difficulty: number;
  cpc?: number;
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  category?: string;
  priority: 'high' | 'medium' | 'low';
  currentRank?: number;
  targetRank?: number;
  usedCount?: number;
}

export interface ParsedKeywordStats {
  keywords: KeywordData[];
  totalKeywords: number;
  highPriorityKeywords: KeywordData[];
  categories: string[];
}
// Temporary CSV parsing function
export const parseKeywordStatsCSV = async (file: File): Promise<ParsedKeywordStats> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        lines[0].split(',').map(h => h.trim());
        
        const keywords: KeywordData[] = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',');
            return {
              keyword: values[0]?.trim() || '',
              searchVolume: parseInt(values[1]) || 0,
              difficulty: parseFloat(values[2]) || 0,
              cpc: values[3] ? parseFloat(values[3]) : undefined,
              intent: (values[4]?.trim() || 'informational') as KeywordData['intent'],
              category: values[5]?.trim() || 'general',
              priority: (values[6]?.trim() || 'medium') as KeywordData['priority'],
              currentRank: values[7] ? parseInt(values[7]) : undefined,
              targetRank: values[8] ? parseInt(values[8]) : undefined,
            };
          })
          .filter(k => k.keyword);

        const highPriorityKeywords = keywords.filter(k => k.priority === 'high');
        const categories = [...new Set(keywords.map(k => k.category).filter(Boolean))];

        resolve({
          keywords,
          totalKeywords: keywords.length,
          highPriorityKeywords,
          categories
        });
      } catch (error) {
        reject(new Error(`Failed to parse CSV: ${error}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

export const selectKeywordsForBlogGeneration = (keywords: KeywordData[], options: any = {}) => {
  const { maxKeywords = 5 } = options;
  return keywords
    .filter(k => k.priority === 'high' || k.searchVolume >= 100)
    .sort((a, b) => b.searchVolume - a.searchVolume)
    .slice(0, maxKeywords);
};

export const generateKeywordBlogTopics = (keywords: KeywordData[]): string[] => {
  const topics: string[] = [];
  keywords.forEach(keyword => {
    topics.push(
      `Complete Guide to ${keyword.keyword}`,
      `${keyword.keyword}: Best Practices for Construction Teams`,
      `How to Implement ${keyword.keyword} Successfully`
    );
  });
  return [...new Set(topics)];
};
