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
    // Create service role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    console.log('Checking for scheduled reports to generate...')

    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}:00`
    const currentDayOfWeek = now.getDay() // 0 = Sunday, 6 = Saturday
    const currentDayOfMonth = now.getDate()

    console.log('Current time:', currentTime)
    console.log('Current day of week:', currentDayOfWeek)
    console.log('Current day of month:', currentDayOfMonth)

    // Get active scheduled reports that should run now
    const { data: schedules, error: schedulesError } = await supabaseAdmin
      .from('report_schedules')
      .select(`
        *,
        custom_reports:custom_report_id (
          id,
          tenant_id,
          report_name,
          report_type,
          data_sources,
          filters,
          grouping,
          sorting,
          columns,
          schedule_recipients
        )
      `)
      .eq('is_active', true)
      .or(`schedule_time.eq.${currentTime}`)

    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError)
      throw schedulesError
    }

    console.log(`Found ${schedules?.length || 0} potential schedules`)

    const results = []

    for (const schedule of schedules || []) {
      const report = schedule.custom_reports

      if (!report) {
        console.log('No report found for schedule:', schedule.id)
        continue
      }

      // Check if schedule matches current day
      let shouldRun = false

      if (schedule.schedule_day_of_week !== null) {
        // Weekly schedule
        shouldRun = schedule.schedule_day_of_week === currentDayOfWeek
      } else if (schedule.schedule_day_of_month !== null) {
        // Monthly schedule
        shouldRun = schedule.schedule_day_of_month === currentDayOfMonth
      } else {
        // Daily schedule
        shouldRun = true
      }

      // Check if already run today
      if (schedule.last_run_at) {
        const lastRun = new Date(schedule.last_run_at)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (lastRun >= today) {
          console.log('Report already run today:', report.report_name)
          shouldRun = false
        }
      }

      if (!shouldRun) {
        console.log('Skipping report (schedule not matched):', report.report_name)
        continue
      }

      console.log('Generating scheduled report:', report.report_name)

      try {
        // Generate report
        const reportData = await generateReportData(supabaseAdmin, report)
        const csvContent = formatAsCSV(reportData, report.columns)

        // Record in history
        const historyRecord = {
          custom_report_id: report.id,
          generated_by: null, // System generated
          output_format: 'csv',
          file_size_bytes: new Blob([csvContent]).size,
          delivered_to: report.schedule_recipients || [],
          delivery_status: 'success',
          execution_time_ms: 0
        }

        const { error: historyError } = await supabaseAdmin
          .from('report_history')
          .insert(historyRecord)

        if (historyError) {
          console.error('Failed to record history:', historyError)
        }

        // Update schedule last_run_at and next_run_at
        const nextRun = calculateNextRun(schedule, now)

        const { error: updateError } = await supabaseAdmin
          .from('report_schedules')
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRun.toISOString()
          })
          .eq('id', schedule.id)

        if (updateError) {
          console.error('Failed to update schedule:', updateError)
        }

        // In production, would send emails to recipients
        console.log('Would send report to recipients:', report.schedule_recipients)

        results.push({
          report_id: report.id,
          report_name: report.report_name,
          status: 'generated',
          rows: reportData.length,
          recipients: report.schedule_recipients?.length || 0
        })

      } catch (error) {
        console.error('Error generating report:', error)
        results.push({
          report_id: report.id,
          report_name: report.report_name,
          status: 'failed',
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        reports_checked: schedules?.length || 0,
        reports_generated: results.filter(r => r.status === 'generated').length,
        reports_failed: results.filter(r => r.status === 'failed').length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in schedule-custom-reports:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

function calculateNextRun(schedule: any, currentDate: Date): Date {
  const nextRun = new Date(currentDate)

  if (schedule.schedule_day_of_week !== null) {
    // Weekly schedule - add 7 days
    nextRun.setDate(nextRun.getDate() + 7)
  } else if (schedule.schedule_day_of_month !== null) {
    // Monthly schedule - add 1 month
    nextRun.setMonth(nextRun.getMonth() + 1)
  } else {
    // Daily schedule - add 1 day
    nextRun.setDate(nextRun.getDate() + 1)
  }

  // Set to scheduled time
  if (schedule.schedule_time) {
    const [hours, minutes] = schedule.schedule_time.split(':')
    nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0)
  }

  return nextRun
}

async function generateReportData(supabase: any, report: any) {
  console.log('Generating report data for:', report.report_name)

  const dataSources = report.data_sources || []
  const filters = report.filters || {}
  const sorting = report.sorting || {}

  let data: any[] = []

  for (const source of dataSources) {
    let query = supabase.from(source).select('*')

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
        } else if (config.operator === 'gte') {
          query = query.gte(column, config.value)
        } else if (config.operator === 'lte') {
          query = query.lte(column, config.value)
        }
      }
    }

    // Apply sorting
    if (sorting && sorting[source]) {
      const sortConfig = sorting[source] as any
      query = query.order(sortConfig.column, { ascending: sortConfig.ascending !== false })
    }

    const { data: sourceData, error } = await query.limit(1000)

    if (error) {
      console.error(`Error fetching from ${source}:`, error)
      continue
    }

    data = data.concat(sourceData || [])
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

function formatAsCSV(data: any[], columns?: any[]): string {
  if (!data || data.length === 0) {
    return 'No data available'
  }

  let headers: string[]
  if (columns && columns.length > 0) {
    headers = columns.map(col => typeof col === 'string' ? col : col.name || col.label)
  } else {
    headers = Object.keys(data[0])
  }

  const csvRows = []
  csvRows.push(headers.join(','))

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header]
      if (value === null || value === undefined) {
        return ''
      }
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
