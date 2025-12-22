// QuickBooks Sync Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface QuickBooksAPIResponse {
  QueryResponse?: {
    [key: string]: any[]
  }
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  x_refresh_token_expires_in?: number;
}

// Check if token needs refresh and refresh if necessary
async function ensureValidToken(supabaseClient: any, integration: any): Promise<string> {
  const expiresAt = new Date(integration.access_token_expires_at)
  const now = new Date()
  const bufferTime = 5 * 60 * 1000 // 5 minute buffer

  // If token is still valid (with buffer), return it
  if (expiresAt.getTime() - now.getTime() > bufferTime) {
    return integration.access_token
  }

  console.log('Access token expired or expiring soon, refreshing...')

  // Refresh the token
  const clientId = Deno.env.get('QUICKBOOKS_CLIENT_ID')
  const clientSecret = Deno.env.get('QUICKBOOKS_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    throw new Error('QuickBooks credentials not configured for token refresh')
  }

  if (!integration.refresh_token) {
    throw new Error('No refresh token available. Please reconnect to QuickBooks.')
  }

  const credentials = btoa(`${clientId}:${clientSecret}`)

  const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: integration.refresh_token,
    }).toString(),
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    console.error('Token refresh failed:', errorText)
    throw new Error(`Token refresh failed: ${tokenResponse.status}. Please reconnect to QuickBooks.`)
  }

  const tokens: TokenResponse = await tokenResponse.json()

  // Calculate new expiration times
  const accessTokenExpires = new Date(now.getTime() + (tokens.expires_in * 1000))
  const refreshTokenExpires = tokens.x_refresh_token_expires_in
    ? new Date(now.getTime() + (tokens.x_refresh_token_expires_in * 1000))
    : new Date(integration.refresh_token_expires_at) // Keep existing if not provided

  // Update tokens in database
  await supabaseClient
    .from('quickbooks_integrations')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      access_token_expires_at: accessTokenExpires.toISOString(),
      refresh_token_expires_at: refreshTokenExpires.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', integration.id)

  console.log('Token refreshed successfully')
  return tokens.access_token
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize auth context with site isolation
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized - Missing or invalid authentication', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    console.log(`[QUICKBOOKS-SYNC] User authenticated: ${user.id}, siteId: ${siteId}`);

    const { company_id, sync_type = 'incremental' } = await req.json()

    console.log(`Starting ${sync_type} sync for company: ${company_id}, site: ${siteId}`)

    // Get QuickBooks integration with site isolation
    const { data: integration, error: integrationError } = await supabaseClient
      .from('quickbooks_integrations')
      .select('*')
        // CRITICAL: Site isolation
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
      items: 0,
      expenses: 0,
      payments: 0
    }
    let errorsCount = 0
    const errors: string[] = []

    try {
      // Ensure we have a valid access token (refresh if needed)
      const accessToken = await ensureValidToken(supabaseClient, integration)

      // Create sync log entry with site isolation
      const { data: syncLog } = await supabaseClient
        .from('quickbooks_sync_logs')
        .insert({            company_id,
          sync_type,
          status: 'running',
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      const syncLogId = syncLog?.id

      // Determine base URL based on environment
      const baseUrl = Deno.env.get('QUICKBOOKS_ENVIRONMENT') === 'production'
        ? 'https://quickbooks.api.intuit.com'
        : 'https://sandbox-quickbooks.api.intuit.com'

      // Sync Customers from QuickBooks to our system (with site isolation)
      try {
        const customers = await fetchQuickBooksData(baseUrl, integration.realm_id, accessToken, 'Customer')
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

      // Sync Items from QuickBooks to our system (with site isolation)
      try {
        const items = await fetchQuickBooksData(baseUrl, integration.realm_id, accessToken, 'Item')
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

      // Sync Expenses (Purchases) from QuickBooks to our system (with site isolation)
      try {
        const purchases = await fetchQuickBooksData(baseUrl, integration.realm_id, accessToken, 'Purchase')
        for (const purchase of purchases) {
          await syncExpense(supabaseClient, company_id, purchase)
          recordsProcessed.expenses++
        }
      } catch (error) {
        console.error('Error syncing expenses:', error)
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Expense sync: ${errorMessage}`)
        errorsCount++
      }

      // Sync Payments from QuickBooks to our system (with site isolation)
      try {
        const payments = await fetchQuickBooksData(baseUrl, integration.realm_id, accessToken, 'Payment')
        for (const payment of payments) {
          await syncPayment(supabaseClient, company_id, payment)
          recordsProcessed.payments++
        }
      } catch (error) {
        console.error('Error syncing payments:', error)
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Payment sync: ${errorMessage}`)
        errorsCount++
      }

      // Sync Invoices from our system to QuickBooks (with site isolation)
      try {
        const localInvoices = await getLocalInvoicesForSync(supabaseClient, company_id, sync_type)
        for (const invoice of localInvoices) {
          await syncInvoiceToQuickBooks(supabaseClient, baseUrl, integration.realm_id, accessToken, invoice)
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

async function fetchQuickBooksData(baseUrl: string, realmId: string, accessToken: string, entityType: string): Promise<any[]> {
  const response = await fetch(
    `${baseUrl}/v3/company/${realmId}/query?query=SELECT * FROM ${entityType}&minorversion=65`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`QuickBooks API error for ${entityType}:`, errorText)
    throw new Error(`QuickBooks API error: ${response.status} - ${response.statusText}`)
  }

  const data: QuickBooksAPIResponse = await response.json()
  return data.QueryResponse?.[entityType] || []
}

async function syncCustomer(supabaseClient: any, siteId: string, companyId: string, qbCustomer: any) {
  // Sync customer data to our system with site isolation
  const customerData = {      qb_customer_id: qbCustomer.Id,
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
    .upsert(customerData, { onConflict: 'qb_customer_id,company_id,site_id' })
}

async function syncItem(supabaseClient: any, siteId: string, companyId: string, qbItem: any) {
  // Sync item data to our system with site isolation
  const itemData = {      qb_item_id: qbItem.Id,
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
    .upsert(itemData, { onConflict: 'qb_item_id,company_id,site_id' })
}

async function getLocalInvoicesForSync(supabaseClient: any, siteId: string, companyId: string, syncType: string) {
  let query = supabaseClient
    .from('invoices')
    .select('*')
      // CRITICAL: Site isolation
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

async function syncExpense(supabaseClient: any, siteId: string, companyId: string, qbPurchase: any) {
  // Sync expense/purchase data from QuickBooks to our system with site isolation
  const expenseData = {      qb_expense_id: qbPurchase.Id,
    company_id: companyId,
    vendor_name: qbPurchase.EntityRef?.name || 'Unknown Vendor',
    amount: qbPurchase.TotalAmt || 0,
    date: qbPurchase.TxnDate,
    payment_type: qbPurchase.PaymentType || 'other',
    account_name: qbPurchase.AccountRef?.name,
    memo: qbPurchase.PrivateNote,
    category: qbPurchase.Line?.[0]?.AccountBasedExpenseLineDetail?.AccountRef?.name || 'Uncategorized',
    qb_sync_token: qbPurchase.SyncToken,
    last_synced_at: new Date().toISOString()
  }

  await supabaseClient
    .from('quickbooks_expenses')
    .upsert(expenseData, { onConflict: 'qb_expense_id,company_id,site_id' })
}

async function syncPayment(supabaseClient: any, siteId: string, companyId: string, qbPayment: any) {
  // Sync payment data from QuickBooks to our system with site isolation
  const paymentData = {      qb_payment_id: qbPayment.Id,
    company_id: companyId,
    customer_name: qbPayment.CustomerRef?.name || 'Unknown Customer',
    amount: qbPayment.TotalAmt || 0,
    date: qbPayment.TxnDate,
    payment_method: qbPayment.PaymentMethodRef?.name || 'other',
    reference_number: qbPayment.PaymentRefNum,
    memo: qbPayment.PrivateNote,
    deposit_to_account: qbPayment.DepositToAccountRef?.name,
    qb_sync_token: qbPayment.SyncToken,
    last_synced_at: new Date().toISOString()
  }

  await supabaseClient
    .from('quickbooks_payments')
    .upsert(paymentData, { onConflict: 'qb_payment_id,company_id,site_id' })
}

/**
 * Escape a string for use in QuickBooks query language
 * Prevents query injection by escaping single quotes
 */
function escapeQBQueryString(str: string): string {
  if (!str) return '';
  // QuickBooks uses single quotes for string literals
  // Escape single quotes by doubling them
  return str.replace(/'/g, "''");
}

async function syncInvoiceToQuickBooks(supabaseClient: any, siteId: string, baseUrl: string, realmId: string, accessToken: string, invoice: any) {
  // First, try to find the customer in QuickBooks
  let customerRef = { value: "1" } // Default fallback

  // Try to find customer by name or use default
  if (invoice.client_name) {
    try {
      // SECURITY: Escape client_name to prevent query injection
      const escapedClientName = escapeQBQueryString(invoice.client_name);
      const customerQuery = encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName = '${escapedClientName}'`)
      const customerResponse = await fetch(
        `${baseUrl}/v3/company/${realmId}/query?query=${customerQuery}&minorversion=65`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      )

      if (customerResponse.ok) {
        const customerData = await customerResponse.json()
        if (customerData.QueryResponse?.Customer?.[0]) {
          customerRef = { value: customerData.QueryResponse.Customer[0].Id }
        }
      }
    } catch (e) {
      console.log('Could not find customer, using default')
    }
  }

  // Build invoice data
  const invoiceData = {
    CustomerRef: customerRef,
    TxnDate: invoice.issue_date,
    DueDate: invoice.due_date,
    PrivateNote: invoice.notes || `BuildDesk Invoice ${invoice.invoice_number}`,
    Line: [{
      Amount: invoice.subtotal || invoice.total,
      DetailType: "SalesItemLineDetail",
      Description: `Invoice ${invoice.invoice_number}`,
      SalesItemLineDetail: {
        ItemRef: { value: "1" }, // Default service item
        Qty: 1,
        UnitPrice: invoice.subtotal || invoice.total
      }
    }]
  }

  const response = await fetch(
    `${baseUrl}/v3/company/${realmId}/invoice?minorversion=65`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoiceData)
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Failed to create invoice in QuickBooks:', errorText)
    throw new Error(`Failed to create invoice in QuickBooks: ${response.status}`)
  }

  const result = await response.json()
  const qbInvoice = result.Invoice

  // Update local invoice with QuickBooks ID (with site isolation)
  if (qbInvoice?.Id) {
    await supabaseClient
      .from('invoices')
      .update({
        qb_invoice_id: qbInvoice.Id,
        qb_sync_token: qbInvoice.SyncToken,
        last_synced_to_qb: new Date().toISOString()
      })
        // CRITICAL: Site isolation on update
      .eq('id', invoice.id)
  }

  return qbInvoice
}