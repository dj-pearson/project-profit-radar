# Fixed GA4 API Format Issue

## 🎯 Problem Identified

You were getting this error:
```
Analytics API error: Invalid JSON payload received. Unknown name "entity" at 'requests[0]': Cannot find field.
```

## 🔧 Root Cause

The Google Analytics 4 API format in our Edge Function was using the old **batch reports** format instead of the current **single report** format.

### ❌ Old Format (Causing Error)
```javascript
// This was WRONG
const requestBody = {
  requests: [{
    entity: { propertyId },  // ← "entity" field not recognized
    dateRanges: [...]
  }]
}

// Using batchRunReports endpoint
fetch(`...properties/${propertyId}:batchRunReports`)
```

### ✅ New Format (Fixed)
```javascript
// This is CORRECT  
const requestBody = {
  dateRanges: [...],        // ← Direct structure
  metrics: [...],
  dimensions: [...]
}

// Using runReport endpoint
fetch(`...properties/${propertyId}:runReport`)
```

## 🚀 Changes Made

### **1. Fixed Request Structure**
- Removed `requests` array wrapper
- Removed `entity` field
- Direct property structure

### **2. Fixed API Endpoints**
- Changed from `:batchRunReports` to `:runReport`
- Updated all functions: `getMetrics`, `getPages`, `getTrafficSources`

### **3. Fixed Metric Names**
- Changed `pageviews` to `screenPageViews` (GA4 standard)
- Updated sorting to use correct metric names

### **4. Fixed Response Parsing**
- Removed `data.reports[0]` wrapper
- Direct access to `data.rows`

## 📦 Deploy the Fix

```bash
supabase functions deploy google-analytics-api
```

## 🎯 Expected Results

After deployment, you should see:
- ✅ **200 response codes** instead of 400 errors
- ✅ **Real analytics data** loading
- ✅ **Proper metrics** displaying in dashboard
- ✅ **No more "Invalid JSON payload" errors**

## 🔍 Verify Success

Check the function logs for:
- `Fetching Analytics metrics...`
- `Analytics API response status: 200` ← Should be 200 now
- `Analytics metrics processed successfully`

The GA4 API is now using the correct current format! 🎉 