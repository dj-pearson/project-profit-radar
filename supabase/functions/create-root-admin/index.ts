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
    // Use service role key to create admin user
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log("Creating root admin user...");

    // Create the root admin user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'Pearsonperformance@gmail.com',
      password: 'Infomax1!',
      email_confirm: true,
      user_metadata: {
        first_name: 'Root',
        last_name: 'Admin',
        role: 'root_admin'
      }
    });

    if (authError) {
      console.error("Auth error:", authError);
      throw authError;
    }

    console.log("Root admin user created:", authData.user?.id);

    // Update the user profile with root_admin role
    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          role: 'root_admin',
          first_name: 'Root',
          last_name: 'Admin',
          is_active: true
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
      } else {
        console.log("Root admin profile updated successfully");
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Root admin user created successfully",
        user_id: authData.user?.id,
        email: 'Pearsonperformance@gmail.com'
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error creating root admin:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});