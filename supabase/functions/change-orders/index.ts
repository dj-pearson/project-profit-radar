import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://deno.land/x/supabase@1.0.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CHANGE-ORDERS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started", { method: req.method });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get user profile to check role
    logStep("Looking up user profile", { userId: user.id });
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logStep("Profile lookup error", { error: profileError.message, code: profileError.code });
      throw new Error(`Profile error: ${profileError.message}`);
    }
    if (!userProfile) {
      logStep("No user profile found", { userId: user.id });
      throw new Error(`User profile not found for user ${user.id}`);
    }
    
    logStep("User profile found", { userId: user.id, role: userProfile.role, companyId: userProfile.company_id });

    const url = new URL(req.url);
    const method = req.method;
    
    // Handle different request types
    if (method === "GET") {
      // GET requests for listing change orders
      const projectId = url.searchParams.get('project_id');
      
      let query = supabaseClient
        .from('change_orders')
        .select(`
          *,
          projects(name, client_name)
        `)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data: changeOrders, error: ordersError } = await query;

      if (ordersError) throw new Error(`Change orders fetch error: ${ordersError.message}`);
      
      logStep("Change orders retrieved", { count: changeOrders?.length });
      return new Response(JSON.stringify({ changeOrders }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (method === "POST") {
      const body = await req.json();
      const { action } = body;

      if (action === "list") {
        // POST request for listing change orders
        const projectId = body.project_id;
        
        logStep("Listing change orders", { projectId, companyId: userProfile.company_id });
        
        let query = supabaseClient
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
          throw new Error(`Change orders fetch error: ${ordersError.message}`);
        }
        
        logStep("Change orders retrieved successfully", { count: changeOrders?.length, orders: changeOrders });
        return new Response(JSON.stringify({ changeOrders }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      if (action === "create") {
        logStep("Creating change order", { body, userRole: userProfile.role });

        // Verify user can create change orders
        if (!['admin', 'project_manager', 'root_admin'].includes(userProfile.role)) {
          logStep("Permission denied", { role: userProfile.role });
          throw new Error("Insufficient permissions to create change orders");
        }

        // Generate change order number
        const { data: existingOrders } = await supabaseClient
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

        const { data: newOrder, error: createError } = await supabaseClient
          .from('change_orders')
          .insert([changeOrderData])
          .select(`
            *,
            projects(name, client_name)
          `)
          .single();

        if (createError) throw new Error(`Change order creation error: ${createError.message}`);

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

          const { error: tasksError } = await supabaseClient
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
        return new Response(JSON.stringify({ changeOrder: newOrder }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 201,
        });
      }

      if (action === "update") {
        const { orderId, title, description, amount, reason, assigned_approvers, approval_due_date, approval_notes } = body;
        logStep("Updating change order", { orderId, title, userRole: userProfile.role });

        // Verify user can update change orders
        if (!['admin', 'project_manager', 'root_admin'].includes(userProfile.role)) {
          logStep("Permission denied", { role: userProfile.role });
          throw new Error("Insufficient permissions to update change orders");
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

        const { data: updatedOrder, error: updateError } = await supabaseClient
          .from('change_orders')
          .update(updateData)
          .eq('id', orderId)
          .select(`
            *,
            projects(name, client_name)
          `)
          .single();

        if (updateError) throw new Error(`Change order update error: ${updateError.message}`);

        logStep("Change order updated", { orderId });
        return new Response(JSON.stringify({ changeOrder: updatedOrder }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      if (action === "approve") {
        const { orderId, approvalType, approved, rejectionReason } = body;
        logStep("Processing approval", { orderId, approvalType, approved });

        // Verify user can approve change orders
        if (!['admin', 'project_manager', 'root_admin'].includes(userProfile.role)) {
          throw new Error("Insufficient permissions to approve change orders");
        }

        let updateData: any = {};
        
        if (approvalType === 'internal') {
          updateData = {
            internal_approved: approved,
            internal_approved_by: approved ? user.id : null,
            internal_approved_date: approved ? new Date().toISOString() : null
          };
          
          // If rejected, also update the overall status and add rejection reason
          if (!approved) {
            updateData.status = 'rejected';
            updateData.approval_notes = rejectionReason || 'Internal rejection';
          }
        } else if (approvalType === 'client') {
          updateData = {
            client_approved: approved,
            client_approved_date: approved ? new Date().toISOString() : null
          };
          
          // If rejected by client, update status
          if (!approved) {
            updateData.status = 'rejected';
            updateData.approval_notes = rejectionReason || 'Client rejection';
          }
        }

        // Update the change order with approval/rejection
        const { data: updatedOrder, error: updateError } = await supabaseClient
          .from('change_orders')
          .update(updateData)
          .eq('id', orderId)
          .select(`
            *,
            projects(name, client_name)
          `)
          .single();

        if (updateError) throw new Error(`Change order approval error: ${updateError.message}`);

        // Update related approval tasks to completed
        if (approved || !approved) {
          const { error: taskUpdateError } = await supabaseClient
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
            // Don't fail the main operation, just log
          }
        }

        logStep("Change order approval processed", { orderId, approvalType, approved });
        return new Response(JSON.stringify({ changeOrder: updatedOrder }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      if (action === "reject") {
        const { orderId, rejectionReason, rejectedBy } = body;
        logStep("Processing rejection", { orderId, rejectionReason, rejectedBy });

        // Verify user can reject change orders
        if (!['admin', 'project_manager', 'root_admin'].includes(userProfile.role)) {
          throw new Error("Insufficient permissions to reject change orders");
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

        const { data: updatedOrder, error: updateError } = await supabaseClient
          .from('change_orders')
          .update(updateData)
          .eq('id', orderId)
          .select(`
            *,
            projects(name, client_name)
          `)
          .single();

        if (updateError) throw new Error(`Change order rejection error: ${updateError.message}`);

        // Cancel related approval tasks
        const { error: taskUpdateError } = await supabaseClient
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
          // Don't fail the main operation, just log
        }

        logStep("Change order rejected", { orderId, reason: rejectionReason });
        return new Response(JSON.stringify({ changeOrder: updatedOrder }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // If no route matched
    return new Response(JSON.stringify({ error: "Route not found" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 404,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});