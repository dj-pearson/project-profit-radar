import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STORE-STRIPE-KEYS] ${step}${detailsStr}`);
};

// SECURITY: Strong AES-256-GCM encryption for sensitive data
const encryptKey = async (key: string): Promise<string> => {
  try {
    // Get encryption key from environment (should be 32 bytes for AES-256)
    const encryptionKey = Deno.env.get("STRIPE_ENCRYPTION_KEY");
    if (!encryptionKey) {
      throw new Error("STRIPE_ENCRYPTION_KEY environment variable not set");
    }

    // Convert the encryption key to bytes
    const keyBuffer = new TextEncoder().encode(encryptionKey.padEnd(32, '0').slice(0, 32));
    
    // Generate a random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Import the key for AES-GCM
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );
    
    // Encrypt the data
    const encodedData = new TextEncoder().encode(key);
    const encryptedData = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      cryptoKey,
      encodedData
    );
    
    // Combine IV and encrypted data, then base64 encode
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    const errorObj = error as Error;
    logStep("ERROR encrypting key", { error: errorObj.message });
    throw new Error("Failed to encrypt key securely");
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Create Supabase client using service role key for secure operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Extract site_id from JWT metadata for multi-tenant isolation
    const siteId = user.app_metadata?.site_id || user.user_metadata?.site_id;
    if (!siteId) throw new Error("Site ID not found in user context");

    logStep("User authenticated", { userId: user.id, siteId });

    const { company_id, secret_key, webhook_secret } = await req.json();
    if (!company_id || !secret_key) {
      throw new Error("company_id and secret_key are required");
    }

    logStep("Request data received", { company_id, hasSecretKey: !!secret_key, hasWebhookSecret: !!webhook_secret });

    // Encrypt the sensitive keys using strong AES-256-GCM encryption
    const encryptedSecretKey = await encryptKey(secret_key);
    const encryptedWebhookSecret = webhook_secret ? await encryptKey(webhook_secret) : null;

    // Update the company payment settings with encrypted keys and site isolation
    const { error: updateError } = await supabaseClient
      .from('company_payment_settings')
      .update({
        stripe_secret_key_encrypted: encryptedSecretKey,
        stripe_webhook_secret_encrypted: encryptedWebhookSecret,
        updated_at: new Date().toISOString()
      })
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .eq('company_id', company_id);

    if (updateError) throw updateError;

    logStep("Keys stored successfully", { company_id });

    return new Response(JSON.stringify({ 
      success: true,
      message: "Stripe keys stored securely"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in store-stripe-keys", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});