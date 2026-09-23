import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import type { SEOAnalyticsSummaryRow } from './types';

interface SEOAnalyticsTabProps {
  mcpConfigured: boolean;
  analytics: SEOAnalyticsSummaryRow[];
  checkAPICredentials: () => void;
}

export function SEOAnalyticsTab({ mcpConfigured, analytics, checkAPICredentials }: SEOAnalyticsTabProps) {
  return (
    <>
      {mcpConfigured ? (
        <div className="space-y-4">
          {/* Top Keywords */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Keywords</CardTitle>
              <CardDescription>Keywords driving the most traffic</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.[0]?.top_queries?.slice(0, 10).map((query: { query: string; position: string; ctr: string; impressions: number; clicks: number }, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{query.query}</h4>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        <span>Position: {query.position}</span>
                        <span>CTR: {query.ctr}%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{query.impressions?.toLocaleString()} impressions</div>
                      <div className="text-sm text-muted-foreground">{query.clicks?.toLocaleString()} clicks</div>
                    </div>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-center py-8">
                    No keyword data available. Refresh data to load latest metrics.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Pages */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Pages</CardTitle>
              <CardDescription>Pages with highest search visibility</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.[0]?.top_pages?.slice(0, 10).map((page: { page: string; ctr: string; impressions: number; clicks: number }, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{page.page}</h4>
                      <div className="text-sm text-muted-foreground mt-1">
                        CTR: {page.ctr}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{page.impressions?.toLocaleString()} impressions</div>
                      <div className="text-sm text-muted-foreground">{page.clicks?.toLocaleString()} clicks</div>
                    </div>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-center py-8">
                    No page data available. Refresh data to load latest metrics.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Analytics Not Available</h3>
            <p className="text-muted-foreground mb-4">
              Configure Google Analytics and Search Console APIs to see detailed analytics data.
            </p>
            <Button onClick={checkAPICredentials}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Check Configuration
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
