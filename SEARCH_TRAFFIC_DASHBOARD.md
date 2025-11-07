# Search Traffic Analytics Dashboard

## Overview

The Search Traffic Analytics Dashboard is an enterprise-level unified analytics platform that integrates with multiple search and analytics providers to give you comprehensive insights into your website's traffic, search performance, and SEO metrics in one centralized location.

## Features

### 🎯 Unified Multi-Platform Integration

Connect and monitor all major analytics and webmaster platforms:

- **Google Analytics 4 (GA4)** - Website traffic, user behavior, conversions
- **Google Search Console** - Search rankings, impressions, clicks from Google
- **Bing Webmaster Tools** - Bing search performance and site health
- **Yandex Webmaster** - Yandex search performance (popular in Russia and Eastern Europe)

### 📊 Comprehensive Analytics

- **Traffic Metrics** - Sessions, users, pageviews, bounce rates
- **Search Performance** - Impressions, clicks, CTR, average position
- **Keyword Analysis** - Track keyword rankings and performance across all platforms
- **Page Performance** - Individual page analytics with engagement metrics
- **Traffic Sources** - Detailed source/medium/campaign attribution
- **Device Breakdown** - Desktop, mobile, and tablet metrics
- **Geographic Data** - Country and city-level traffic insights

### 🔍 Advanced Features

- **Real-time Data Syncing** - Automated data fetching from all connected platforms
- **Historical Trends** - Compare current vs. previous period performance
- **Cross-Platform Comparison** - See how you're performing on different search engines
- **SEO Insights** - AI-powered recommendations for improving search performance
- **Drill-Down Views** - From high-level overview to granular keyword-level data
- **Custom Date Ranges** - Analyze any time period with flexible date filtering

### 🔐 Enterprise-Grade Security

- **OAuth 2.0 Authentication** - Secure platform connections with industry-standard OAuth
- **Encrypted Token Storage** - All access tokens are encrypted at rest
- **Automatic Token Refresh** - Seamless re-authentication without user intervention
- **Row-Level Security** - Data isolation at the database level
- **Role-Based Access** - Root admin-only access for sensitive analytics data

## Architecture

### Database Schema

The system uses a comprehensive database schema designed for scalability and performance:

```sql
-- Core Tables
analytics_platform_connections  -- Central registry for all platform connections
unified_traffic_metrics        -- Aggregated daily traffic metrics
unified_keyword_performance    -- Keyword rankings across all platforms
unified_page_performance       -- Page-level analytics
seo_insights                   -- AI-powered SEO recommendations
traffic_source_attribution     -- Detailed source/medium tracking

-- Platform-Specific Tables
ga4_properties                 -- Google Analytics 4 properties
gsc_properties                 -- Google Search Console properties
bing_webmaster_properties      -- Bing Webmaster sites
yandex_webmaster_properties    -- Yandex Webmaster hosts
```

### Edge Functions

OAuth and data synchronization are handled via Supabase Edge Functions:

- `analytics-oauth-google` - OAuth flow for Google Analytics & Search Console
- `analytics-oauth-bing` - OAuth flow for Bing Webmaster Tools
- `analytics-oauth-yandex` - OAuth flow for Yandex Webmaster
- `sync-analytics-data` - Automated data fetching and aggregation

## Setup Instructions

### Prerequisites

1. **Supabase Project** - Running Supabase instance with database access
2. **OAuth Credentials** - API credentials from each platform you want to connect

### Step 1: Database Migration

Run the database migration to create all required tables:

```bash
# The migration file is located at:
supabase/migrations/20251107000001_search_traffic_analytics_platform.sql

# If using Supabase CLI:
supabase db push
```

### Step 2: Configure OAuth Applications

#### Google (Analytics & Search Console)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable the following APIs:
   - Google Analytics Data API
   - Google Analytics Admin API
   - Google Search Console API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://your-domain.com/api/oauth/google/callback`
5. Add environment variables to Supabase:
   ```
   GOOGLE_OAUTH_CLIENT_ID=your_client_id
   GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
   GOOGLE_OAUTH_REDIRECT_URI=your_redirect_uri
   ```

#### Bing Webmaster Tools

1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Navigate to Settings > API Access
3. Create API credentials
4. Add environment variables:
   ```
   BING_WEBMASTER_API_KEY=your_api_key
   ```

#### Yandex Webmaster

1. Go to [Yandex OAuth](https://oauth.yandex.com)
2. Register a new application
3. Request permissions: `webmaster:read`
4. Add environment variables:
   ```
   YANDEX_OAUTH_CLIENT_ID=your_client_id
   YANDEX_OAUTH_CLIENT_SECRET=your_client_secret
   YANDEX_OAUTH_REDIRECT_URI=your_redirect_uri
   ```

### Step 3: Deploy Edge Functions

Deploy the OAuth edge functions to Supabase:

```bash
# Deploy Google OAuth function
supabase functions deploy analytics-oauth-google

# Set environment variables
supabase secrets set GOOGLE_OAUTH_CLIENT_ID=xxx
supabase secrets set GOOGLE_OAUTH_CLIENT_SECRET=xxx
supabase secrets set GOOGLE_OAUTH_REDIRECT_URI=xxx
```

### Step 4: Access the Dashboard

1. Navigate to `/admin/search-traffic-dashboard` (root admin access required)
2. Go to the "Platforms" tab
3. Click "Connect" on each platform you want to integrate
4. Complete the OAuth flow for each platform
5. Data will begin syncing automatically

## Usage Guide

### Connecting a Platform

1. Navigate to Settings tab in the dashboard
2. Click "Connect" next to the desired platform
3. You'll be redirected to the platform's OAuth consent screen
4. Grant the necessary permissions
5. You'll be redirected back with a successful connection

### Syncing Data

- **Automatic Sync**: Data syncs automatically every 24 hours (configurable)
- **Manual Sync**: Click the "Sync All" button to trigger immediate data fetch
- **Sync Status**: Connection cards show last sync time and status

### Viewing Analytics

#### Overview Tab
- High-level KPIs with period-over-period comparison
- Traffic trends chart showing sessions and clicks over time
- Platform breakdown showing traffic distribution
- Connection status for all platforms

#### Search Performance Tab
- Detailed search metrics: impressions, clicks, CTR
- Multi-line chart showing trends over time
- Platform comparison views

#### Keywords Tab
- Top performing keywords across all search engines
- Ranking positions and changes
- Click-through rates and impressions
- Filter by platform, device, country

#### Pages Tab
- Individual page performance metrics
- Top landing pages by traffic
- Bounce rates and engagement metrics
- Conversion tracking per page

#### Insights Tab
- AI-generated SEO recommendations
- Identified opportunities and issues
- Actionable improvement suggestions
- Track implemented changes

### Date Range Selection

Use the date picker to analyze different time periods:
- Today
- Last 7 days
- Last 30 days
- Last 90 days
- Custom range

### Comparing Periods

Enable comparison mode to see:
- Period-over-period changes
- Trend indicators (up/down/stable)
- Percentage changes
- Visual trend arrows

## Data Model

### Unified Traffic Metrics

Each day's data is aggregated from all platforms and stored with:

```typescript
{
  date: string;
  platform_name: 'google_analytics' | 'google_search_console' | 'bing' | 'yandex';
  sessions: number;
  users: number;
  pageviews: number;
  impressions: number;
  clicks: number;
  ctr: number;
  average_position: number;
  // ... and many more metrics
}
```

### Keyword Performance

Track individual keywords across platforms:

```typescript
{
  keyword: string;
  platform_name: 'google' | 'bing' | 'yandex';
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  position_change: number;
  device_type: 'desktop' | 'mobile' | 'tablet';
  country: string;
}
```

### SEO Insights

AI-generated recommendations:

```typescript
{
  insight_type: 'opportunity' | 'issue' | 'trend' | 'achievement';
  category: 'keywords' | 'traffic' | 'technical' | 'content' | 'competitors';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendations: Array<{
    title: string;
    description: string;
    priority: number;
  }>;
  status: 'active' | 'acknowledged' | 'in_progress' | 'resolved';
}
```

## API Reference

### OAuth Endpoints

#### Initiate OAuth Flow
```typescript
POST /analytics-oauth-google?action=initiate&platform=google_analytics
Response: {
  authorization_url: string;
  state: string;
}
```

#### Handle OAuth Callback
```typescript
POST /analytics-oauth-google?action=callback
Body: {
  code: string;
  state: string;
}
Response: {
  connection_id: string;
  platform: string;
  account: string;
}
```

#### Refresh Token
```typescript
POST /analytics-oauth-google?action=refresh
Body: {
  connection_id: string;
}
```

#### Disconnect
```typescript
POST /analytics-oauth-google?action=disconnect
Body: {
  connection_id: string;
}
```

### Data Sync

```typescript
POST /sync-analytics-data
Body: {
  connection_id: string;
  platform: AnalyticsPlatform;
  date_range: {
    start_date: string;
    end_date: string;
  };
}
```

## Performance Considerations

### Database Indexes

All high-traffic queries are optimized with indexes:
- Company ID + Date for metrics queries
- Keyword + Date for keyword lookups
- Platform + Date for platform filtering
- URL + Date for page performance

### Caching Strategy

- **Client-side**: TanStack Query with 5-minute stale time
- **Database**: Materialized views for common aggregations
- **Edge Functions**: Rate limiting to respect API quotas

### Data Retention

- Raw daily data: 90 days (configurable)
- Aggregated weekly data: 1 year
- Monthly summaries: Indefinite

## Troubleshooting

### Connection Issues

**Problem**: OAuth connection fails
- **Solution**: Check OAuth credentials in Supabase secrets
- **Solution**: Verify redirect URI matches exactly in OAuth app settings
- **Solution**: Check that required API scopes are enabled

**Problem**: Token expired error
- **Solution**: The system should auto-refresh, but you can manually disconnect and reconnect
- **Solution**: Check that refresh token was properly stored

### Data Sync Issues

**Problem**: No data appearing after connection
- **Solution**: Click "Sync All" to trigger manual sync
- **Solution**: Check edge function logs for errors
- **Solution**: Verify platform API access is working

**Problem**: Incomplete data
- **Solution**: Some platforms have data delays (24-48 hours)
- **Solution**: Check if property/site is verified in the source platform
- **Solution**: Verify date range doesn't exceed platform limits

### Performance Issues

**Problem**: Dashboard loading slowly
- **Solution**: Reduce date range to improve query performance
- **Solution**: Check database indexes are in place
- **Solution**: Consider aggregating older data

## Future Enhancements

### Planned Features

- [ ] **More Platforms**: Adobe Analytics, Matomo, Plausible
- [ ] **Export Functionality**: PDF reports, CSV exports, scheduled emails
- [ ] **Custom Dashboards**: User-configurable dashboard layouts
- [ ] **Alerts & Notifications**: Automated alerts for significant changes
- [ ] **Competitor Tracking**: Track competitor rankings and compare
- [ ] **Advanced Segmentation**: Custom audience segments and cohorts
- [ ] **A/B Test Integration**: Track experiment performance
- [ ] **Heatmap Integration**: User behavior heatmaps
- [ ] **Goal Funnels**: Visual funnel analysis
- [ ] **Real-time Dashboard**: Live traffic monitoring

### API Improvements

- [ ] GraphQL API for flexible data querying
- [ ] Webhook support for real-time updates
- [ ] Bulk export API endpoints
- [ ] Public API for third-party integrations

## Support

### Resources

- [Google Analytics Data API Documentation](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Google Search Console API Documentation](https://developers.google.com/webmaster-tools)
- [Bing Webmaster API Documentation](https://docs.microsoft.com/en-us/bingwebmaster/)
- [Yandex Webmaster API Documentation](https://yandex.com/dev/webmaster/)

### Getting Help

For issues or questions:
1. Check the troubleshooting section above
2. Review edge function logs in Supabase dashboard
3. Check browser console for client-side errors
4. Review database query performance

## Security Considerations

### Data Privacy

- All OAuth tokens are encrypted before storage
- Database RLS policies ensure data isolation
- No sensitive data is logged in edge functions
- HTTPS required for all connections

### Access Control

- Root admin access only for dashboard
- Company-level data isolation via RLS
- Audit logging for all connections and disconnections

### Compliance

- GDPR compliant (data deletion on request)
- OAuth 2.0 industry standard implementation
- Encrypted data at rest and in transit
- Regular security audits recommended

## License

This feature is part of the BuildDesk platform and follows the same license terms.

## Version History

- **v1.0.0** (2025-11-07)
  - Initial release
  - Support for Google Analytics 4, Google Search Console
  - OAuth 2.0 authentication flow
  - Unified traffic metrics dashboard
  - Basic keyword and page performance tracking
  - Edge function infrastructure for Bing and Yandex (to be completed)

---

**Built with ❤️ for BuildDesk - Making search traffic analytics simple and powerful**
