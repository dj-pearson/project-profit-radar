import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get user profile to check permissions
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      throw new Error("User not associated with a company");
    }

    const { method } = req;
    const url = new URL(req.url);
    const changeOrderId = url.pathname.split('/').pop();
    const action = url.searchParams.get("action");

    switch (method) {
      case "GET":
        const projectId = url.searchParams.get("project_id");
        
        let query = supabaseClient
          .from('change_orders')
          .select(`
            *,
            projects (name, company_id)
          `);

        if (changeOrderId && changeOrderId !== "change-orders") {
          // Get single change order
          const { data: changeOrder, error } = await query
            .eq('id', changeOrderId)
            .single();

          if (error) throw error;
          
          // Check if user has access to this change order's project
          if (changeOrder.projects.company_id !== profile.company_id) {
            throw new Error("Access denied");
          }

          return new Response(JSON.stringify(changeOrder), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          // List change orders, optionally filtered by project
          if (projectId) {
            query = query.eq('project_id', projectId);
          }
          
          const { data: changeOrders, error } = await query
            .order('created_at', { ascending: false });

          if (error) throw error;

          // Filter by company access
          const filteredOrders = changeOrders.filter(co => 
            co.projects.company_id === profile.company_id
          );

          return new Response(JSON.stringify(filteredOrders), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

      case "POST":
        const changeOrderData = await req.json();
        
        // Check if user can create change orders
        if (!['admin', 'project_manager', 'root_admin'].includes(profile.role)) {
          throw new Error("Insufficient permissions to create change orders");
        }

        // Verify project belongs to user's company
        const { data: project } = await supabaseClient
          .from('projects')
          .select('company_id')
          .eq('id', changeOrderData.project_id)
          .single();

        if (!project || project.company_id !== profile.company_id) {
          throw new Error("Invalid project or access denied");
        }

        // Generate change order number
        const { data: existingCOs } = await supabaseClient
          .from('change_orders')
          .select('change_order_number')
          .eq('project_id', changeOrderData.project_id)
          .order('change_order_number', { ascending: false })
          .limit(1);

        const nextNumber = existingCOs && existingCOs.length > 0 
          ? (parseInt(existingCOs[0].change_order_number.replace(/\D/g, '')) || 0) + 1 
          : 1;

        const changeOrderNumber = `CO-${String(nextNumber).padStart(3, '0')}`;

        const { data: newChangeOrder, error } = await supabaseClient
          .from('change_orders')
          .insert({
            ...changeOrderData,
            change_order_number: changeOrderNumber,
            created_by: user.id,
            status: 'pending'
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify(newChangeOrder), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 201,
        });

      case "PUT":
        if (!changeOrderId) {
          throw new Error("Change order ID required for update");
        }

        const updateData = await req.json();
        
        // Check permissions and ownership
        const { data: existingCO } = await supabaseClient
          .from('change_orders')
          .select(`
            *,
            projects (company_id)
          `)
          .eq('id', changeOrderId)
          .single();

        if (!existingCO || existingCO.projects.company_id !== profile.company_id) {
          throw new Error("Change order not found or access denied");
        }

        // Check if user can update change orders
        if (!['admin', 'project_manager', 'root_admin'].includes(profile.role)) {
          throw new Error("Insufficient permissions to update change orders");
        }

        // Handle approval workflow
        if (action === "approve" && updateData.status === "approved") {
          // Update project budget if change order is approved
          const { data: project } = await supabaseClient
            .from('projects')
            .select('budget')
            .eq('id', existingCO.project_id)
            .single();

          if (project) {
            const newBudget = (project.budget || 0) + (existingCO.amount || 0);
            await supabaseClient
              .from('projects')
              .update({ budget: newBudget })
              .eq('id', existingCO.project_id);
          }

          updateData.approved_at = new Date().toISOString();
          updateData.approved_by = user.id;
        }

        const { data: updatedChangeOrder, error } = await supabaseClient
          .from('change_orders')
          .update(updateData)
          .eq('id', changeOrderId)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify(updatedChangeOrder), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "DELETE":
        if (!changeOrderId) {
          throw new Error("Change order ID required for deletion");
        }

        // Check permissions - only admins can delete change orders
        if (!['admin', 'root_admin'].includes(profile.role)) {
          throw new Error("Insufficient permissions to delete change orders");
        }

        // Verify ownership
        const { data: coToDelete } = await supabaseClient
          .from('change_orders')
          .select(`
            projects (company_id)
          `)
          .eq('id', changeOrderId)
          .single();

        if (!coToDelete || coToDelete.projects.company_id !== profile.company_id) {
          throw new Error("Change order not found or access denied");
        }

        const { error: deleteError } = await supabaseClient
          .from('change_orders')
          .delete()
          .eq('id', changeOrderId);

        if (deleteError) throw deleteError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      default:
        throw new Error(`Method ${method} not allowed`);
    }

  } catch (error) {
    console.error("Error in change-orders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});