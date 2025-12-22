// Payment Reminders Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
        const authContext = await initializeAuthContext(req)
    if (!authContext) {
      return errorResponse('Unauthorized', 401)
    }

    const { user, supabase: supabaseClient } = authContext
    console.log('[PAYMENT-REMINDERS] User authenticated', { userId: user.id })

    const { tenant_id, action, invoice_id } = await req.json()

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'tenant_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    switch (action) {
      case 'check_pending_reminders':
        return await checkPendingReminders(supabaseClient, tenant_id)
      case 'send_reminder':
        return await sendReminder(supabaseClient, tenant_id, invoice_id)
      case 'generate_reminders':
        return await generateReminders(supabaseClient, tenant_id)
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: check_pending_reminders, send_reminder, generate_reminders' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in payment-reminders:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function checkPendingReminders(supabase: any, tenant_id: string) {
  console.log('[PAYMENT-REMINDERS] Checking pending reminders', { tenant_id })

  // Get all pending reminders
  const { data: reminders, error: reminderError } = await supabase
    .from('payment_reminders')
    .select(`
      *,
      projects:project_id (
        name,
        client_name
      )
    `)
    .eq('tenant_id', tenant_id)
    .eq('status', 'pending')
    .is('sent_at', null)
    .order('created_at', { ascending: true })
    .limit(50)

  if (reminderError) {
    throw new Error(`Failed to fetch reminders: ${reminderError.message}`)
  }

  const today = new Date()
  const remindersToSend = []

  for (const reminder of reminders || []) {
    // Determine if reminder should be sent based on type and days_before_after
    let shouldSend = false

    // For simplicity, we'll send all pending reminders in this demo
    // In production, you'd check invoice due dates and calculate timing
    shouldSend = true

    if (shouldSend) {
      remindersToSend.push(reminder)
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      pending_reminders: remindersToSend.length,
      reminders: remindersToSend
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  )
}

async function sendReminder(supabase: any, tenant_id: string, invoice_id: string) {
  console.log('[PAYMENT-REMINDERS] Sending reminder for invoice:', invoice_id)

  if (!invoice_id) {
    throw new Error('invoice_id is required for send_reminder action')
  }

  // Get reminder details
  const { data: reminder, error: reminderError } = await supabase
    .from('payment_reminders')
    .select(`
      *,
      projects:project_id (
        name,
        client_name,
        client_email
      )
    `)
    .eq('tenant_id', tenant_id)
    .eq('invoice_id', invoice_id)
    .eq('status', 'pending')
    .single()

  if (reminderError || !reminder) {
    throw new Error(`Failed to fetch reminder: ${reminderError?.message || 'Not found'}`)
  }

  // In production, this would integrate with email/SMS services
  // For now, we'll simulate sending
  const emailSubject = getReminderSubject(reminder.reminder_type)
  const emailBody = getReminderBody(reminder)

  console.log('Would send email:')
  console.log('To:', reminder.projects?.client_email)
  console.log('Subject:', emailSubject)
  console.log('Body:', emailBody)

  // Update reminder status
  const { error: updateError } = await supabase
    .from('payment_reminders')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString()
    })
    .eq('id', reminder.id)

  if (updateError) {
    throw new Error(`Failed to update reminder: ${updateError.message}`)
  }

  return new Response(
    JSON.stringify({
      success: true,
      reminder_sent: true,
      reminder_id: reminder.id,
      sent_to: reminder.projects?.client_email,
      delivery_method: reminder.delivery_method
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  )
}

async function generateReminders(supabase: any, tenant_id: string) {
  console.log('[PAYMENT-REMINDERS] Generating reminders', { tenant_id })

  // Get active billing automation rules
  const { data: rules, error: rulesError } = await supabase
    .from('billing_automation_rules')
    .select('*')
    .eq('tenant_id', tenant_id)
    .eq('is_active', true)

  if (rulesError) {
    throw new Error(`Failed to fetch automation rules: ${rulesError.message}`)
  }

  // Get projects with unpaid invoices
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, client_name, budget, actual_cost')
    .eq('tenant_id', tenant_id)
    .eq('status', 'active')
    .limit(20)

  if (projectsError) {
    throw new Error(`Failed to fetch projects: ${projectsError.message}`)
  }

  const reminders = []
  const today = new Date()

  for (const project of projects || []) {
    // In production, you'd check actual invoices
    // For demo, we'll generate reminders for each active project

    for (const rule of rules || []) {
      const paymentTermsDays = rule.payment_terms_days || 30

      // Create different reminder types
      const reminderTypes = [
        { type: 'upcoming', daysBefore: 7 },
        { type: 'due_today', daysBefore: 0 },
        { type: 'overdue', daysAfter: 3 },
        { type: 'final_notice', daysAfter: 14 }
      ]

      for (const reminderConfig of reminderTypes) {
        // Check if reminder already exists
        const { data: existingReminder } = await supabase
          .from('payment_reminders')
          .select('id')
          .eq('tenant_id', tenant_id)
          .eq('project_id', project.id)
          .eq('reminder_type', reminderConfig.type)
          .single()

        if (existingReminder) {
          continue // Skip if already exists
        }

        const daysBeforeAfter = reminderConfig.daysBefore || -reminderConfig.daysAfter

        const reminder = {
          tenant_id,
          invoice_id: `inv_${project.id}_${Date.now()}`, // Simulated invoice ID
          project_id: project.id,
          reminder_type: reminderConfig.type,
          days_before_after: daysBeforeAfter,
          delivery_method: 'email',
          status: 'pending'
        }

        const { error: insertError } = await supabase
          .from('payment_reminders')
          .insert(reminder)

        if (!insertError) {
          reminders.push(reminder)
        }
      }
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      reminders_generated: reminders.length,
      reminders: reminders.slice(0, 10) // Return first 10 for brevity
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  )
}

function getReminderSubject(reminderType: string): string {
  switch (reminderType) {
    case 'upcoming':
      return 'Payment Due Soon - BuildDesk Invoice'
    case 'due_today':
      return 'Payment Due Today - BuildDesk Invoice'
    case 'overdue':
      return 'Overdue Payment Notice - BuildDesk Invoice'
    case 'final_notice':
      return 'Final Notice - Overdue Payment - BuildDesk Invoice'
    default:
      return 'Payment Reminder - BuildDesk Invoice'
  }
}

function getReminderBody(reminder: any): string {
  const projectName = reminder.projects?.name || 'Your Project'
  const clientName = reminder.projects?.client_name || 'Valued Client'

  switch (reminder.reminder_type) {
    case 'upcoming':
      return `Dear ${clientName},\n\nThis is a friendly reminder that your payment for ${projectName} will be due in 7 days.\n\nThank you for your business!`
    case 'due_today':
      return `Dear ${clientName},\n\nYour payment for ${projectName} is due today. Please submit payment at your earliest convenience.\n\nThank you!`
    case 'overdue':
      return `Dear ${clientName},\n\nYour payment for ${projectName} is now overdue. Please submit payment as soon as possible to avoid late fees.\n\nThank you!`
    case 'final_notice':
      return `Dear ${clientName},\n\nThis is a final notice regarding your overdue payment for ${projectName}. Immediate payment is required.\n\nPlease contact us to resolve this matter.`
    default:
      return `Dear ${clientName},\n\nThis is a reminder about your payment for ${projectName}.\n\nThank you!`
  }
}
