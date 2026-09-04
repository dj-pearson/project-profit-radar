// QuickBooks Sync Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { fetchQuickBooksData } from '../_shared/quickbooks-paging.ts';
import { captureException } from '../_shared/observability.ts';
import {
  mapPurchase, mapPayment, type MappingContext,
} from '../_shared/quickbooks-mapping.ts';

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

  // Update tokens in database. Intuit rotates the refresh token on every
  // exchange and invalidates the old one, so failing to persist these breaks the
  // integration on the next run and the user has to reconnect by hand. The error
  // was discarded, so this run carried on with the in-memory token and looked
  // fine (US-300).
  const { error: tokenError } = await supabaseClient
    .from('quickbooks_integrations')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      access_token_expires_at: accessTokenExpires.toISOString(),
      refresh_token_expires_at: refreshTokenExpires.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', integration.id)

  if (tokenError) {
    throw new Error(
      `Refreshed QuickBooks tokens were not saved; the next sync would use an invalidated refresh token: ${tokenError.message}`,
    )
  }

  console.log('Token refreshed successfully')
  return tokens.access_token
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize auth context
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized - Missing or invalid authentication', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    console.log(`[QUICKBOOKS-SYNC] User authenticated: ${user.id}`);

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
    const recordsProcessed = {
      invoices: 0,
      customers: 0,
      items: 0,
      expenses: 0,
      payments: 0
    }
    // What QuickBooks actually handed us, per entity, so a truncated import is
    // visible in the log rather than looking like a small account (US-252).
    const recordsFetched: Record<string, number> = {}
    const truncatedEntities: string[] = []
    let throttleRetries = 0
    let errorsCount = 0
    const errors: string[] = []

    try {
      // Ensure we have a valid access token (refresh if needed)
      const accessToken = await ensureValidToken(supabaseClient, integration)

      // Create sync log entry
      // A missing sync log means the run has no record at all: syncLogId below
      // is undefined and every later update silently matches nothing. The error
      // was discarded (US-300).
      const { data: syncLog, error: syncLogError } = await supabaseClient
        .from('quickbooks_sync_logs')
        .insert({
          company_id,
          sync_type,
          status: 'running',
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (syncLogError || !syncLog) {
        throw new Error(
          `Could not open a sync log, so this run would leave no record: ${syncLogError?.message ?? 'no row returned'}`,
        )
      }

      const syncLogId = syncLog.id

      // Determine base URL based on environment
      const baseUrl = Deno.env.get('QUICKBOOKS_ENVIRONMENT') === 'production'
        ? 'https://quickbooks.api.intuit.com'
        : 'https://sandbox-quickbooks.api.intuit.com'

      // Everything the mapper needs to resolve a QuickBooks reference to a
      // Brikly row, fetched once rather than per imported record (US-333).
      const mappingContext = await buildMappingContext(supabaseClient, company_id)

      // Sync Customers from QuickBooks to our system
      try {
        const fetched = await fetchQuickBooksData(baseUrl, integration.realm_id, accessToken, 'Customer')
        recordsFetched.customers = fetched.rows.length
        throttleRetries += fetched.throttleRetries
        if (fetched.truncated) truncatedEntities.push('Customer')
        for (const customer of fetched.rows) {
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
        const fetched = await fetchQuickBooksData(baseUrl, integration.realm_id, accessToken, 'Item')
        recordsFetched.items = fetched.rows.length
        throttleRetries += fetched.throttleRetries
        if (fetched.truncated) truncatedEntities.push('Item')
        for (const item of fetched.rows) {
          await syncItem(supabaseClient, company_id, item)
          recordsProcessed.items++
        }
      } catch (error) {
        console.error('Error syncing items:', error)
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Item sync: ${errorMessage}`)
        errorsCount++
      }

      // Sync Expenses (Purchases) from QuickBooks to our system
      try {
        const fetched = await fetchQuickBooksData(baseUrl, integration.realm_id, accessToken, 'Purchase')
        recordsFetched.expenses = fetched.rows.length
        throttleRetries += fetched.throttleRetries
        if (fetched.truncated) truncatedEntities.push('Purchase')
        for (const purchase of fetched.rows) {
          await syncExpense(supabaseClient, company_id, purchase, mappingContext)
          recordsProcessed.expenses++
        }
      } catch (error) {
        console.error('Error syncing expenses:', error)
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Expense sync: ${errorMessage}`)
        errorsCount++
      }

      // Sync Payments from QuickBooks to our system
      try {
        const fetched = await fetchQuickBooksData(baseUrl, integration.realm_id, accessToken, 'Payment')
        recordsFetched.payments = fetched.rows.length
        throttleRetries += fetched.throttleRetries
        if (fetched.truncated) truncatedEntities.push('Payment')
        for (const payment of fetched.rows) {
          await syncPayment(supabaseClient, company_id, payment, mappingContext)
          recordsProcessed.payments++
        }
      } catch (error) {
        console.error('Error syncing payments:', error)
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Payment sync: ${errorMessage}`)
        errorsCount++
      }

      // Sync Invoices from our system to QuickBooks
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

      // Update sync log. This row is the record of what the sync actually did;
      // the error was discarded, so a run could finish with its log stuck on
      // 'running' forever (US-300).
      const { error: logCompleteError } = await supabaseClient
        .from('quickbooks_sync_logs')
        .update({
          status: errorsCount > 0 ? 'completed_with_errors' : 'completed',
          completed_at: new Date().toISOString(),
          records_processed: recordsProcessed,
          // records_fetched vs records_processed is what makes a silently
          // truncated import visible: equal counts mean everything QuickBooks
          // returned was written, a gap means rows were dropped on our side.
          records_fetched: recordsFetched,
          truncated_entities: truncatedEntities.length > 0 ? truncatedEntities : null,
          throttle_retries: throttleRetries,
          errors_count: errorsCount,
          duration_seconds: duration,
          error_details: errors.length > 0 ? errors : null
        })
        .eq('id', syncLogId)

      if (logCompleteError) {
        console.error('[quickbooks-sync] sync log not closed:', logCompleteError.message)
      }

      // Update integration status. last_sync_at is what the UI shows and what
      // the next incremental sync reads to pick its window, so a discarded error
      // here made the integration look like it had never run (US-300).
      const { error: statusError } = await supabaseClient
        .from('quickbooks_integrations')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: errorsCount > 0 ? 'error' : 'success',
          last_error_message: errors.length > 0 ? errors[0] : null
        })
        .eq('id', integration.id)

      if (statusError) {
        console.error('[quickbooks-sync] integration status not updated:', statusError.message)
      }

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
      const { error: errorStatusError } = await supabaseClient
        .from('quickbooks_integrations')
        .update({
          last_sync_status: 'error',
          last_error_message: syncErrorMessage
        })
        .eq('id', integration.id)

      // Recording the failure is the only way the user finds out the sync broke.
      // Discarded before (US-300); logged rather than thrown, so the original
      // error below is what surfaces.
      if (errorStatusError) {
        console.error('[quickbooks-sync] failure not recorded on the integration:', errorStatusError.message)
      }

      throw syncError
    }

  } catch (error) {
    console.error('Error in quickbooks-sync:', error)
    const errorMessage = error instanceof Error ? error.message : String(error);
    // A sync that stops working is invisible until someone notices missing
    // data, which is exactly the failure US-252 was about (US-251).
    await captureException(error, { fn: 'quickbooks-sync' });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

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

  // recordsProcessed is incremented by the caller for every row this is
  // called with, so a discarded error here reported an import that wrote
  // nothing - the silent truncation records_fetched vs records_processed
  // exists to expose (US-300). Throwing lands in the caller's per-entity
  // catch, which records the failure against that entity.
  const { error } = await supabaseClient
    .from('quickbooks_customers')
    .upsert(customerData, { onConflict: 'qb_customer_id,company_id' })

  if (error) {
    throw new Error(`quickbooks_customers upsert failed: ${error.message}`)
  }
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

  const { error } = await supabaseClient
    .from('quickbooks_items')
    .upsert(itemData, { onConflict: 'qb_item_id,company_id' })

  if (error) {
    throw new Error(`quickbooks_items upsert failed: ${error.message}`)
  }
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

/**
 * The lookups the mapper needs, fetched once per sync run (US-333).
 *
 * Per-record lookups would be one round trip per imported row, and US-252 made
 * these syncs paginate through everything a company has.
 */
async function buildMappingContext(
  supabaseClient: any,
  companyId: string,
): Promise<MappingContext> {
  const [projects, costCodes, invoices] = await Promise.all([
    supabaseClient.from('projects').select('id, name').eq('company_id', companyId),
    supabaseClient.from('cost_codes').select('id, code, name').eq('company_id', companyId),
    supabaseClient.from('invoices')
      .select('id, invoice_number, amount_due, qb_invoice_id')
      .eq('company_id', companyId),
  ])

  const failure = [projects, costCodes, invoices].find((r: any) => r.error)
  if (failure?.error) {
    throw new Error(`Could not build the QuickBooks mapping context: ${failure.error.message}`)
  }

  const projectsByName = new Map<string, string>()
  for (const p of projects.data ?? []) {
    if (p.name) projectsByName.set(String(p.name).trim().toLowerCase(), p.id)
  }

  // Both the code and the name, because QuickBooks accounts are named either
  // way depending on how the bookkeeper set the chart of accounts up.
  const costCodesByName = new Map<string, string>()
  for (const c of costCodes.data ?? []) {
    if (c.code) costCodesByName.set(String(c.code).trim().toLowerCase(), c.id)
    if (c.name) costCodesByName.set(String(c.name).trim().toLowerCase(), c.id)
  }

  const invoicesByNumber = new Map<string, { id: string; amountDue: number }>()
  const invoicesByQbId = new Map<string, { id: string; amountDue: number }>()
  for (const i of invoices.data ?? []) {
    const entry = { id: i.id, amountDue: Number(i.amount_due) || 0 }
    if (i.invoice_number) invoicesByNumber.set(String(i.invoice_number).trim(), entry)
    if (i.qb_invoice_id) invoicesByQbId.set(String(i.qb_invoice_id), entry)
  }

  return { companyId, projectsByName, costCodesByName, invoicesByNumber, invoicesByQbId }
}

async function syncExpense(
  supabaseClient: any,
  companyId: string,
  qbPurchase: any,
  ctx: MappingContext,
) {
  // Was: upsert into quickbooks_expenses, a table read by no file in src/ and
  // absent from types.ts. A contractor was told their expenses synced and their
  // job costing did not move (US-333).
  const mapped = mapPurchase(qbPurchase, ctx)

  if (mapped.kind === 'unmatched') {
    await queueForReview(supabaseClient, companyId, mapped)
    return { imported: false }
  }

  // Idempotent on the QuickBooks id, so a second run updates rather than
  // importing the same cost twice.
  const { error } = await supabaseClient
    .from('expenses')
    .upsert(
      { ...mapped.row, qb_purchase_id: mapped.qbId },
      { onConflict: 'company_id,qb_purchase_id' },
    )

  if (error) {
    throw new Error(`expenses upsert failed for QuickBooks purchase ${mapped.qbId}: ${error.message}`)
  }

  // Imported, but nobody knows which job it belongs to. It is a real cost and
  // belongs in the expense list; the queue is how it gets assigned.
  if (mapped.projectMatch === 'none') {
    await queueForReview(supabaseClient, companyId, {
      kind: 'unmatched',
      qbId: mapped.qbId,
      entity: 'purchase',
      reason: 'Imported, but no project matched the QuickBooks customer or job',
      amount: mapped.row.amount,
      occurredOn: mapped.row.expense_date,
      counterparty: mapped.row.vendor_name,
      raw: qbPurchase,
    })
  }

  return { imported: true }
}

async function queueForReview(
  supabaseClient: any,
  companyId: string,
  item: { qbId: string; entity: string; reason: string; amount: number; occurredOn: string | null; counterparty: string | null; raw: unknown },
) {
  const { error } = await supabaseClient
    .from('quickbooks_sync_review')
    .upsert({
      company_id: companyId,
      entity: item.entity,
      qb_id: item.qbId,
      reason: item.reason,
      amount: item.amount,
      occurred_on: item.occurredOn,
      counterparty: item.counterparty,
      raw: item.raw,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'company_id,entity,qb_id' })

  if (error) {
    // Not fatal to the run, but never silent: an unread failure here is how a
    // row goes missing in both directions at once.
    console.error(`quickbooks_sync_review upsert failed for ${item.entity} ${item.qbId}: ${error.message}`)
  }
}

async function syncPayment(
  supabaseClient: any,
  companyId: string,
  qbPayment: any,
  ctx: MappingContext,
) {
  // Was: upsert into quickbooks_payments, read by nothing. Unlike an expense, a
  // payment with no invoice is NOT imported: a payment row pointing at the
  // wrong invoice marks it paid, and an AR list that says a customer has paid
  // when they have not is worse than one missing a row (US-333).
  const mapped = mapPayment(qbPayment, ctx)

  if (mapped.kind === 'unmatched') {
    await queueForReview(supabaseClient, companyId, mapped)
    return { imported: false }
  }

  const { error } = await supabaseClient
    .from('invoice_payments')
    .upsert(
      { ...mapped.row, qb_payment_id: mapped.qbId },
      { onConflict: 'company_id,qb_payment_id' },
    )

  if (error) {
    throw new Error(`invoice_payments upsert failed for QuickBooks payment ${mapped.qbId}: ${error.message}`)
  }

  return { imported: true }
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

async function syncInvoiceToQuickBooks(supabaseClient: any, baseUrl: string, realmId: string, accessToken: string, invoice: any) {
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
    PrivateNote: invoice.notes || `Brikly Invoice ${invoice.invoice_number}`,
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

  // Update local invoice with QuickBooks ID
  if (qbInvoice?.Id) {
    const { error: updateInvoicesError } = await supabaseClient
      .from('invoices')
      .update({
        qb_invoice_id: qbInvoice.Id,
        qb_sync_token: qbInvoice.SyncToken,
        last_synced_to_qb: new Date().toISOString()
      })
      .eq('id', invoice.id);
    if (updateInvoicesError) {
      console.error(`[invoices] update failed`, updateInvoicesError);
    }
  }

  return qbInvoice
}