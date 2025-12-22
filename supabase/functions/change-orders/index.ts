import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CHANGE-ORDERS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    logStep("Function started", { method: req.method });

    // Initialize auth context
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized - Missing or invalid authentication', 401);
    }

    const { user, supabase } = authContext;
    logStep("User authenticated", { userId: user.id });

    // Get user profile to check role and company
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logStep("Profile lookup error", { error: profileError.message, code: profileError.code });
      return errorResponse(`Profile error: ${profileError.message}`, 400);
    }
    if (!userProfile) {
      logStep("No user profile found", { userId: user.id });
      return errorResponse(`User profile not found for user ${user.id}`, 404);
    }

    logStep("User profile found", { userId: user.id, role: userProfile.role, companyId: userProfile.company_id });

    const url = new URL(req.url);
    const method = req.method;

    // Handle different request types
    if (method === "GET") {
      // GET requests for listing change orders
      const projectId = url.searchParams.get('project_id');

      let query = supabase
        .from('change_orders')
        .select(`
          *,
          projects!inner(name, client_name, company_id)
        `)
        .eq('projects.company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data: changeOrders, error: ordersError } = await query;

      if (ordersError) {
        logStep("Change orders fetch error", { error: ordersError.message });
        return errorResponse(`Change orders fetch error: ${ordersError.message}`, 500);
      }

      logStep("Change orders retrieved", { count: changeOrders?.length });
      return successResponse({ changeOrders });
    }

    if (method === "POST") {
      const body = await req.json();
      const { action } = body;

      if (action === "list") {
        // POST request for listing change orders
        const projectId = body.project_id;

        logStep("Listing change orders", { projectId, companyId: userProfile.company_id });

        let query = supabase
          .from('change_orders')
          .select(`
            *,
            projects!inner(name, client_name, company_id)
          `)
          .eq('projects.company_id', userProfile.company_id)
          .order('created_at', { ascending: false });

        if (projectId && projectId !== 'all') {
          query = query.eq('project_id', projectId);
        }

        const { data: changeOrders, error: ordersError } = await query;

        if (ordersError) {
          logStep("Change orders fetch error", { error: ordersError.message });
          return errorResponse(`Change orders fetch error: ${ordersError.message}`, 500);
        }

        logStep("Change orders retrieved successfully", { count: changeOrders?.length });
        return successResponse({ changeOrders });
      }

      if (action === "create") {
        logStep("Creating change order", { body, userRole: userProfile.role });

        // Verify user can create change orders
        if (!['admin', 'project_manager', 'root_admin'].includes(userProfile.role)) {
          logStep("Permission denied", { role: userProfile.role });
          return errorResponse("Insufficient permissions to create change orders", 403);
        }

        // Generate change order number
        const { data: existingOrders } = await supabase
          .from('change_orders')
          .select('change_order_number')
          .eq('project_id', body.project_id)
          .order('change_order_number', { ascending: false })
          .limit(1);

        let changeOrderNumber = 'CO-001';
        if (existingOrders && existingOrders.length > 0) {
          const lastNumber = existingOrders[0].change_order_number;
          const numberPart = parseInt(lastNumber.split('-')[1]) + 1;
          changeOrderNumber = `CO-${numberPart.toString().padStart(3, '0')}`;
        }

        const changeOrderData = {
          project_id: body.project_id,
          title: body.title,
          description: body.description,
          amount: body.amount,
          reason: body.reason,
          change_order_number: changeOrderNumber,
          created_by: user.id,
          status: 'pending',
          assigned_approvers: body.assigned_approvers || [],
          approval_due_date: body.approval_due_date || null,
          approval_notes: body.approval_notes || null
        };

        const { data: newOrder, error: createError } = await supabase
          .from('change_orders')
          .insert([changeOrderData])
          .select(`
            *,
            projects(name, client_name)
          `)
          .single();

        if (createError) {
          logStep("Change order creation error", { error: createError.message });
          return errorResponse(`Change order creation error: ${createError.message}`, 500);
        }

        // Create approval tasks for assigned approvers
        if (body.assigned_approvers && body.assigned_approvers.length > 0) {
          logStep("Creating approval tasks", { approvers: body.assigned_approvers });

          const approvalTasks = body.assigned_approvers.map((approverId: string) => ({
            name: `Approve Change Order ${changeOrderNumber}`,
            description: `Review and approve change order: ${body.title}`,
            project_id: body.project_id,
            assigned_to: approverId,
            status: 'pending',
            priority: 'high',
            due_date: body.approval_due_date || null,
            company_id: userProfile.company_id,
            created_by: user.id,
            category: 'approval'
          }));

          const { error: tasksError } = await supabase
            .from('tasks')
            .insert(approvalTasks);

          if (tasksError) {
            logStep("Task creation error", { error: tasksError.message });
            // Don't fail the change order creation, just log the error
          } else {
            logStep("Approval tasks created", { count: approvalTasks.length });
          }
        }

        logStep("Change order created", { orderId: newOrder.id, changeOrderNumber });
        return successResponse({ changeOrder: newOrder });
      }

      if (action === "update") {
        const { orderId, title, description, amount, reason, assigned_approvers, approval_due_date, approval_notes } = body;
        logStep("Updating change order", { orderId, title, userRole: userProfile.role });

        // Verify user can update change orders
        if (!['admin', 'project_manager', 'root_admin'].includes(userProfile.role)) {
          logStep("Permission denied", { role: userProfile.role });
          return errorResponse("Insufficient permissions to update change orders", 403);
        }

        const updateData = {
          title,
          description,
          amount,
          reason,
          assigned_approvers: assigned_approvers || [],
          approval_due_date: approval_due_date || null,
          approval_notes: approval_notes || null,
          updated_at: new Date().toISOString()
        };

        const { data: updatedOrder, error: updateError } = await supabase
          .from('change_orders')
          .update(updateData)
          .eq('id', orderId)
          .select(`
            *,
            projects(name, client_name)
          `)
          .single();

        if (updateError) {
          logStep("Change order update error", { error: updateError.message });
          return errorResponse(`Change order update error: ${updateError.message}`, 500);
        }

        logStep("Change order updated", { orderId });
        return successResponse({ changeOrder: updatedOrder });
      }

      if (action === "approve") {
        const { orderId, approvalType, approved, rejectionReason } = body;
        logStep("Processing approval", { orderId, approvalType, approved });

        // Verify user can approve change orders
        if (!['admin', 'project_manager', 'root_admin'].includes(userProfile.role)) {
          return errorResponse("Insufficient permissions to approve change orders", 403);
        }

        let updateData: any = {};

        if (approvalType === 'internal') {
          updateData = {
            internal_approved: approved,
            internal_approved_by: approved ? user.id : null,
            internal_approved_date: approved ? new Date().toISOString() : null
          };

          if (!approved) {
            updateData.status = 'rejected';
            updateData.approval_notes = rejectionReason || 'Internal rejection';
          }
        } else if (approvalType === 'client') {
          updateData = {
            client_approved: approved,
            client_approved_date: approved ? new Date().toISOString() : null
          };

          if (!approved) {
            updateData.status = 'rejected';
            updateData.approval_notes = rejectionReason || 'Client rejection';
          }
        }

        // Update the change order
        const { data: updatedOrder, error: updateError } = await supabase
          .from('change_orders')
          .update(updateData)
          .eq('id', orderId)
          .select(`
            *,
            projects(name, client_name)
          `)
          .single();

        if (updateError) {
          logStep("Change order approval error", { error: updateError.message });
          return errorResponse(`Change order approval error: ${updateError.message}`, 500);
        }

        // Update related approval tasks
        if (approved || !approved) {
          const { error: taskUpdateError } = await supabase
            .from('tasks')
            .update({
              status: approved ? 'completed' : 'cancelled',
              completion_percentage: approved ? 100 : 0,
              updated_at: new Date().toISOString()
            })
            .eq('project_id', updatedOrder.project_id)
            .eq('category', 'approval')
            .ilike('name', `%${updatedOrder.change_order_number}%`);

          if (taskUpdateError) {
            logStep("Task update error", { error: taskUpdateError.message });
          }
        }

        logStep("Change order approval processed", { orderId, approvalType, approved });
        return successResponse({ changeOrder: updatedOrder });
      }

      if (action === "reject") {
        const { orderId, rejectionReason, rejectedBy } = body;
        logStep("Processing rejection", { orderId, rejectionReason, rejectedBy });

        // Verify user can reject change orders
        if (!['admin', 'project_manager', 'root_admin'].includes(userProfile.role)) {
          return errorResponse("Insufficient permissions to reject change orders", 403);
        }

        const updateData = {
          status: 'rejected',
          internal_approved: false,
          client_approved: false,
          internal_approved_by: null,
          internal_approved_date: null,
          client_approved_date: null,
          approval_notes: rejectionReason || 'Change order rejected',
          updated_at: new Date().toISOString()
        };

        const { data: updatedOrder, error: updateError } = await supabase
          .from('change_orders')
          .update(updateData)
          .eq('id', orderId)
          .select(`
            *,
            projects(name, client_name)
          `)
          .single();

        if (updateError) {
          logStep("Change order rejection error", { error: updateError.message });
          return errorResponse(`Change order rejection error: ${updateError.message}`, 500);
        }

        // Cancel related approval tasks
        const { error: taskUpdateError } = await supabase
          .from('tasks')
          .update({
            status: 'cancelled',
            completion_percentage: 0,
            updated_at: new Date().toISOString()
          })
          .eq('project_id', updatedOrder.project_id)
          .eq('category', 'approval')
          .ilike('name', `%${updatedOrder.change_order_number}%`);

        if (taskUpdateError) {
          logStep("Task update error", { error: taskUpdateError.message });
        }

        logStep("Change order rejected", { orderId, reason: rejectionReason });
        return successResponse({ changeOrder: updatedOrder });
      }
    }

    // If no route matched
    return errorResponse("Route not found", 404);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return errorResponse(errorMessage, 500);
  }
});
