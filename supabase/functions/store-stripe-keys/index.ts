// Store Stripe Keys Edge Function
// SECURITY: Uses secure CORS whitelist and AES-256-GCM encryption
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { getCorsHeaders } from '../_shared/secure-cors.ts';

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
  const corsHeaders = getCorsHeaders(req);

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

    logStep("User authenticated", { userId: user.id });

    const { company_id, secret_key, webhook_secret } = await req.json();
    if (!company_id || !secret_key) {
      throw new Error("company_id and secret_key are required");
    }

    // SECURITY: Verify user has access to this company
    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.company_id !== company_id) {
      logStep("Unauthorized company access attempt", { userId: user.id, attemptedCompanyId: company_id });
      throw new Error("Unauthorized");
    }

    // Only admins can store Stripe keys
    if (userProfile.role !== 'admin' && userProfile.role !== 'root_admin') {
      logStep("Non-admin attempted to store Stripe keys", { userId: user.id, role: userProfile.role });
      throw new Error("Unauthorized");
    }

    logStep("Request data received", { company_id, hasSecretKey: !!secret_key, hasWebhookSecret: !!webhook_secret });

    // Encrypt the sensitive keys using strong AES-256-GCM encryption
    const encryptedSecretKey = await encryptKey(secret_key);
    const encryptedWebhookSecret = webhook_secret ? await encryptKey(webhook_secret) : null;

    // Update the company payment settings with encrypted keys
    const { error: updateError } = await supabaseClient
      .from('company_payment_settings')
      .update({
        stripe_secret_key_encrypted: encryptedSecretKey,
        stripe_webhook_secret_encrypted: encryptedWebhookSecret,
        updated_at: new Date().toISOString()
      })
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

    // SECURITY: Return generic error message to prevent information disclosure
    return new Response(JSON.stringify({
      error: "Failed to store Stripe keys",
      success: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});