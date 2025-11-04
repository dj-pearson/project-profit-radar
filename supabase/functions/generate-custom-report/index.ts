import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { report_id, output_format = 'csv' } = await req.json()

    if (!report_id) {
      return new Response(
        JSON.stringify({ error: 'report_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get user from JWT
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const startTime = Date.now()

    // Fetch report configuration
    const { data: report, error: reportError } = await supabaseClient
      .from('custom_reports')
      .select('*')
      .eq('id', report_id)
      .single()

    if (reportError || !report) {
      return new Response(
        JSON.stringify({ error: 'Report not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Generate report data
    const reportData = await generateReportData(supabaseClient, report)

    // Format output based on requested format
    let outputContent: string
    let contentType: string

    switch (output_format) {
      case 'csv':
        outputContent = formatAsCSV(reportData, report.columns)
        contentType = 'text/csv'
        break
      case 'json':
        outputContent = JSON.stringify(reportData, null, 2)
        contentType = 'application/json'
        break
      default:
        throw new Error(`Unsupported output format: ${output_format}. Use csv or json.`)
    }

    const executionTime = Date.now() - startTime

    // Record report generation in history
    const historyRecord = {
      custom_report_id: report_id,
      generated_by: user.id,
      output_format,
      file_size_bytes: new Blob([outputContent]).size,
      delivery_status: 'success',
      execution_time_ms: executionTime
    }

    const { error: historyError } = await supabaseClient
      .from('report_history')
      .insert(historyRecord)

    if (historyError) {
      console.error('Failed to record history:', historyError)
    }

    // Return the report content
    return new Response(
      outputContent,
      {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${report.report_name.replace(/[^a-z0-9]/gi, '_')}.${output_format}"`,
          'X-Execution-Time': executionTime.toString(),
          'X-Row-Count': reportData.length.toString()
        },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in generate-custom-report:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function generateReportData(supabase: any, report: any) {
  console.log('Generating report data for:', report.report_name)

  const dataSources = report.data_sources || []
  const filters = report.filters || {}
  const sorting = report.sorting || {}
  const grouping = report.grouping || {}

  // Build query based on data sources
  let query: any = null
  let data: any[] = []

  for (const source of dataSources) {
    // Start query for this data source
    query = supabase.from(source).select('*')

    // Apply tenant filter
    if (report.tenant_id) {
      query = query.eq('tenant_id', report.tenant_id)
    }

    // Apply filters
    if (filters && filters[source]) {
      const sourceFilters = filters[source]
      for (const [column, filterConfig] of Object.entries(sourceFilters)) {
        const config = filterConfig as any

        if (config.operator === 'eq') {
          query = query.eq(column, config.value)
        } else if (config.operator === 'gt') {
          query = query.gt(column, config.value)
        } else if (config.operator === 'lt') {
          query = query.lt(column, config.value)
        } else if (config.operator === 'gte') {
          query = query.gte(column, config.value)
        } else if (config.operator === 'lte') {
          query = query.lte(column, config.value)
        } else if (config.operator === 'like') {
          query = query.ilike(column, `%${config.value}%`)
        }
      }
    }

    // Apply sorting
    if (sorting && sorting[source]) {
      const sortConfig = sorting[source] as any
      query = query.order(sortConfig.column, { ascending: sortConfig.ascending !== false })
    }

    // Execute query
    const { data: sourceData, error } = await query.limit(1000)

    if (error) {
      console.error(`Error fetching from ${source}:`, error)
      continue
    }

    // Add source identifier to each row
    const annotatedData = (sourceData || []).map((row: any) => ({
      ...row,
      _source: source
    }))

    data = data.concat(annotatedData)
  }

  // Apply grouping if specified
  if (grouping && grouping.enabled && grouping.column) {
    data = applyGrouping(data, grouping)
  }

  // Select only specified columns
  if (report.columns && Array.isArray(report.columns) && report.columns.length > 0) {
    data = data.map((row: any) => {
      const filteredRow: any = {}
      for (const colConfig of report.columns) {
        const col = typeof colConfig === 'string' ? colConfig : colConfig.name
        if (row[col] !== undefined) {
          filteredRow[col] = row[col]
        }
      }
      return filteredRow
    })
  }

  return data
}

function applyGrouping(data: any[], grouping: any) {
  const grouped: { [key: string]: any[] } = {}

  for (const row of data) {
    const key = row[grouping.column] || 'Unknown'
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(row)
  }

  // Calculate aggregates if specified
  if (grouping.aggregate) {
    const result = []
    for (const [key, rows] of Object.entries(grouped)) {
      const aggregated: any = { [grouping.column]: key }

      for (const agg of grouping.aggregate) {
        if (agg.function === 'count') {
          aggregated[`${agg.column}_count`] = rows.length
        } else if (agg.function === 'sum') {
          aggregated[`${agg.column}_sum`] = rows.reduce(
            (sum: number, row: any) => sum + (parseFloat(row[agg.column]) || 0),
            0
          )
        } else if (agg.function === 'avg') {
          const sum = rows.reduce(
            (s: number, row: any) => s + (parseFloat(row[agg.column]) || 0),
            0
          )
          aggregated[`${agg.column}_avg`] = sum / rows.length
        }
      }

      result.push(aggregated)
    }
    return result
  }

  return data
}

function formatAsCSV(data: any[], columns?: any[]): string {
  if (!data || data.length === 0) {
    return 'No data available'
  }

  // Determine columns
  let headers: string[]
  if (columns && columns.length > 0) {
    headers = columns.map(col => typeof col === 'string' ? col : col.name || col.label)
  } else {
    headers = Object.keys(data[0])
  }

  // Build CSV
  const csvRows = []

  // Add header row
  csvRows.push(headers.join(','))

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header]

      // Handle null/undefined
      if (value === null || value === undefined) {
        return ''
      }

      // Escape values containing commas, quotes, or newlines
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }

      return stringValue
    })

    csvRows.push(values.join(','))
  }

  return csvRows.join('\n')
}
