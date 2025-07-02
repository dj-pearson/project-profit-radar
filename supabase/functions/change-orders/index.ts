import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
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
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw new Error(`Profile error: ${profileError.message}`);

    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname.split('/').pop();

    switch (method) {
      case "GET":
        if (path === "list") {
          const projectId = url.searchParams.get('project_id');
          
          let query = supabaseClient
            .from('change_orders')
            .select(`
              *,
              projects(name)
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

        break;

      case "POST":
        if (path === "create") {
          const body = await req.json();
          logStep("Creating change order", body);

          // Verify user can create change orders
          if (!['admin', 'project_manager', 'root_admin'].includes(userProfile.role)) {
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
            ...body,
            change_order_number: changeOrderNumber,
            created_by: user.id,
            status: 'pending'
          };

          const { data: newOrder, error: createError } = await supabaseClient
            .from('change_orders')
            .insert([changeOrderData])
            .select(`
              *,
              projects(name)
            `)
            .single();

          if (createError) throw new Error(`Change order creation error: ${createError.message}`);

          logStep("Change order created", { orderId: newOrder.id, changeOrderNumber });
          return new Response(JSON.stringify({ changeOrder: newOrder }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 201,
          });
        }

        if (path === "approve") {
          const body = await req.json();
          const { orderId, approvalType, approved } = body;
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
          } else if (approvalType === 'client') {
            updateData = {
              client_approved: approved,
              client_approved_date: approved ? new Date().toISOString() : null
            };
          }

          const { data: updatedOrder, error: updateError } = await supabaseClient
            .from('change_orders')
            .update(updateData)
            .eq('id', orderId)
            .select(`
              *,
              projects(name)
            `)
            .single();

          if (updateError) throw new Error(`Change order approval error: ${updateError.message}`);

          logStep("Change order approval processed", { orderId, approvalType, approved });
          return new Response(JSON.stringify({ changeOrder: updatedOrder }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        break;
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