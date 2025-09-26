import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QuickBooksAPIResponse {
  QueryResponse?: {
    [key: string]: any[]
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      throw new Error('Unauthorized')
    }

    const { company_id, sync_type = 'incremental' } = await req.json()

    console.log(`Starting ${sync_type} sync for company: ${company_id}`)

    // Get QuickBooks integration
    const { data: integration, error: integrationError } = await supabaseClient
      .from('quickbooks_integrations')
      .select('*')
      .eq('company_id', company_id)
      .eq('is_connected', true)
      .single()

    if (integrationError || !integration) {
      throw new Error('QuickBooks integration not found or not connected')
    }

    const startTime = Date.now()
    let recordsProcessed = {
      invoices: 0,
      customers: 0,
      items: 0
    }
    let errorsCount = 0
    const errors: string[] = []

    try {
      // Create sync log entry
      const { data: syncLog } = await supabaseClient
        .from('quickbooks_sync_logs')
        .insert({
          company_id,
          sync_type,
          status: 'running',
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      const syncLogId = syncLog?.id

      // Sync Customers from QuickBooks to our system
      try {
        const customers = await fetchQuickBooksData(integration, 'customers')
        for (const customer of customers) {
          await syncCustomer(supabaseClient, company_id, customer)
          recordsProcessed.customers++
        }
      } catch (error) {
        console.error('Error syncing customers:', error)
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Customer sync: ${errorMessage}`)
        errorsCount++
      }

      // Sync Items from QuickBooks to our system
      try {
        const items = await fetchQuickBooksData(integration, 'items')
        for (const item of items) {
          await syncItem(supabaseClient, company_id, item)
          recordsProcessed.items++
        }
      } catch (error) {
        console.error('Error syncing items:', error)
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Item sync: ${errorMessage}`)
        errorsCount++
      }

      // Sync Invoices from our system to QuickBooks
      try {
        const localInvoices = await getLocalInvoicesForSync(supabaseClient, company_id, sync_type)
        for (const invoice of localInvoices) {
          await syncInvoiceToQuickBooks(integration, invoice)
          recordsProcessed.invoices++
        }
      } catch (error) {
        console.error('Error syncing invoices:', error)
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Invoice sync: ${errorMessage}`)
        errorsCount++
      }

      const duration = Math.round((Date.now() - startTime) / 1000)

      // Update sync log
      await supabaseClient
        .from('quickbooks_sync_logs')
        .update({
          status: errorsCount > 0 ? 'completed_with_errors' : 'completed',
          completed_at: new Date().toISOString(),
          records_processed: recordsProcessed,
          errors_count: errorsCount,
          duration_seconds: duration,
          error_details: errors.length > 0 ? errors : null
        })
        .eq('id', syncLogId)

      // Update integration status
      await supabaseClient
        .from('quickbooks_integrations')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: errorsCount > 0 ? 'error' : 'success',
          last_error_message: errors.length > 0 ? errors[0] : null
        })
        .eq('id', integration.id)

      return new Response(
        JSON.stringify({ 
          success: true,
          records_processed: recordsProcessed,
          errors_count: errorsCount,
          duration_seconds: duration
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )

    } catch (syncError) {
      console.error('Sync error:', syncError)
      
      // Update integration with error
      const syncErrorMessage = syncError instanceof Error ? syncError.message : String(syncError);
      await supabaseClient
        .from('quickbooks_integrations')
        .update({
          last_sync_status: 'error',
          last_error_message: syncErrorMessage
        })
        .eq('id', integration.id)

      throw syncError
    }

  } catch (error) {
    console.error('Error in quickbooks-sync:', error)
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

async function fetchQuickBooksData(integration: any, entityType: string): Promise<any[]> {
  const baseUrl = integration.sandbox_mode 
    ? 'https://sandbox-quickbooks.api.intuit.com'
    : 'https://quickbooks.api.intuit.com'
  
  const response = await fetch(
    `${baseUrl}/v3/company/${integration.qb_company_id}/query?query=SELECT * FROM ${entityType}`,
    {
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Accept': 'application/json'
      }
    }
  )

  if (!response.ok) {
    throw new Error(`QuickBooks API error: ${response.statusText}`)
  }

  const data: QuickBooksAPIResponse = await response.json()
  return data.QueryResponse?.[entityType] || []
}

async function syncCustomer(supabaseClient: any, companyId: string, qbCustomer: any) {
  // Sync customer data to our system
  const customerData = {
    qb_customer_id: qbCustomer.Id,
    company_id: companyId,
    name: qbCustomer.Name,
    email: qbCustomer.PrimaryEmailAddr?.Address,
    phone: qbCustomer.PrimaryPhone?.FreeFormNumber,
    address: qbCustomer.BillAddr ? JSON.stringify(qbCustomer.BillAddr) : null,
    qb_sync_token: qbCustomer.SyncToken,
    last_synced_at: new Date().toISOString()
  }

  await supabaseClient
    .from('quickbooks_customers')
    .upsert(customerData, { onConflict: 'qb_customer_id,company_id' })
}

async function syncItem(supabaseClient: any, companyId: string, qbItem: any) {
  // Sync item data to our system
  const itemData = {
    qb_item_id: qbItem.Id,
    company_id: companyId,
    name: qbItem.Name,
    description: qbItem.Description,
    unit_price: qbItem.UnitPrice || 0,
    type: qbItem.Type,
    qb_sync_token: qbItem.SyncToken,
    last_synced_at: new Date().toISOString()
  }

  await supabaseClient
    .from('quickbooks_items')
    .upsert(itemData, { onConflict: 'qb_item_id,company_id' })
}

async function getLocalInvoicesForSync(supabaseClient: any, companyId: string, syncType: string) {
  let query = supabaseClient
    .from('invoices')
    .select('*')
    .eq('company_id', companyId)
    .is('qb_invoice_id', null) // Only sync invoices not yet in QuickBooks

  if (syncType === 'incremental') {
    // Only sync invoices created in the last 24 hours
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    query = query.gte('created_at', yesterday.toISOString())
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

async function syncInvoiceToQuickBooks(integration: any, invoice: any) {
  // Create invoice in QuickBooks
  const baseUrl = integration.sandbox_mode 
    ? 'https://sandbox-quickbooks.api.intuit.com'
    : 'https://quickbooks.api.intuit.com'

  const invoiceData = {
    CustomerRef: {
      value: "1" // Default customer - should be mapped properly
    },
    Line: [{
      Amount: invoice.total_amount,
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: {
          value: "1" // Default item - should be mapped properly
        }
      }
    }]
  }

  const response = await fetch(
    `${baseUrl}/v3/company/${integration.qb_company_id}/invoice`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoiceData)
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to create invoice in QuickBooks: ${response.statusText}`)
  }

  const result = await response.json()
  return result.QueryResponse?.Invoice?.[0]
}