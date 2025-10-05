import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Server-side validation schema for time entries
 * Mirrors client-side validation from src/lib/validations/time-tracking.ts
 */
interface TimeEntryInput {
  project_id: string;
  task_description: string;
  start_time: string;
  end_time?: string;
  break_duration?: number;
  notes?: string;
  location_latitude?: number;
  location_longitude?: number;
  location_accuracy?: number;
  location_address?: string;
}

/**
 * Validate time entry input server-side
 */
function validateTimeEntry(data: any): { valid: boolean; errors: string[]; data?: TimeEntryInput } {
  const errors: string[] = [];

  // Validate project_id
  if (!data.project_id || typeof data.project_id !== 'string') {
    errors.push('project_id is required and must be a valid UUID');
  }

  // Validate task_description
  if (!data.task_description || typeof data.task_description !== 'string') {
    errors.push('task_description is required');
  } else if (data.task_description.trim().length === 0) {
    errors.push('task_description cannot be empty');
  } else if (data.task_description.length > 500) {
    errors.push('task_description must be less than 500 characters');
  }

  // Validate start_time
  if (!data.start_time || typeof data.start_time !== 'string') {
    errors.push('start_time is required');
  } else {
    try {
      new Date(data.start_time);
    } catch {
      errors.push('start_time must be a valid datetime');
    }
  }

  // Validate end_time if provided
  if (data.end_time) {
    if (typeof data.end_time !== 'string') {
      errors.push('end_time must be a valid datetime string');
    } else {
      try {
        const start = new Date(data.start_time);
        const end = new Date(data.end_time);
        if (end <= start) {
          errors.push('end_time must be after start_time');
        }
      } catch {
        errors.push('end_time must be a valid datetime');
      }
    }
  }

  // Validate break_duration if provided
  if (data.break_duration !== undefined) {
    if (typeof data.break_duration !== 'number' || data.break_duration < 0) {
      errors.push('break_duration must be a non-negative number');
    } else if (data.break_duration > 480) {
      errors.push('break_duration cannot exceed 8 hours (480 minutes)');
    }
  }

  // Validate notes if provided
  if (data.notes && typeof data.notes !== 'string') {
    errors.push('notes must be a string');
  } else if (data.notes && data.notes.length > 1000) {
    errors.push('notes must be less than 1000 characters');
  }

  // Validate location data if provided
  if (data.location_latitude !== undefined) {
    if (typeof data.location_latitude !== 'number' || data.location_latitude < -90 || data.location_latitude > 90) {
      errors.push('location_latitude must be between -90 and 90');
    }
  }

  if (data.location_longitude !== undefined) {
    if (typeof data.location_longitude !== 'number' || data.location_longitude < -180 || data.location_longitude > 180) {
      errors.push('location_longitude must be between -180 and 180');
    }
  }

  if (data.location_accuracy !== undefined) {
    if (typeof data.location_accuracy !== 'number' || data.location_accuracy < 0) {
      errors.push('location_accuracy must be a non-negative number');
    }
  }

  if (data.location_address && typeof data.location_address !== 'string') {
    errors.push('location_address must be a string');
  } else if (data.location_address && data.location_address.length > 500) {
    errors.push('location_address must be less than 500 characters');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      project_id: data.project_id,
      task_description: data.task_description.trim(),
      start_time: data.start_time,
      end_time: data.end_time,
      break_duration: data.break_duration,
      notes: data.notes?.trim(),
      location_latitude: data.location_latitude,
      location_longitude: data.location_longitude,
      location_accuracy: data.location_accuracy,
      location_address: data.location_address?.trim(),
    },
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    console.log('Validating time entry:', { user_id: user.id });

    // Validate input
    const validation = validateTimeEntry(body);
    if (!validation.valid) {
      console.error('Validation failed:', validation.errors);
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validation.errors }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Insert time entry with validated data
    const { data, error } = await supabaseClient
      .from('time_entries')
      .insert({
        ...validation.data,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create time entry', details: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Time entry created successfully:', data.id);
    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
