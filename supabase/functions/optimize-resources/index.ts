// Optimize Resources Edge Function
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const openAIApiKey = Deno.env.get('OpenAI_API_KEY');

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RESOURCE-OPTIMIZATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { company_id, optimization_scope = 'company', scope_id, date_range_start, date_range_end, config_id } = await req.json();
    if (!company_id) throw new Error("Company ID is required");

    logStep("Starting resource optimization", {  company_id, optimization_scope, scope_id });

    // Get optimization configuration with site isolation
    const { data: config, error: configError } = await supabaseClient
      .from('resource_optimization_configs')
      .select('*')
        // CRITICAL: Site isolation
      .eq('company_id', company_id)
      .eq('id', config_id || 'default')
      .maybeSingle();

    // Use default config if none found
    const defaultConfig = {
      optimization_strategy: 'balanced',
      max_crew_utilization: 85.0,
      max_equipment_utilization: 90.0,
      prefer_dedicated_crews: true,
      allow_overtime: true,
      max_overtime_hours: 10,
      travel_time_factor: 1.5,
      skill_matching_weight: 0.7,
      availability_weight: 0.8,
      cost_weight: 0.6,
      priority_weight: 0.9,
      weather_consideration: true
    } as const;

    const effectiveConfig = config ?? defaultConfig;

    // Create optimization run record with site isolation
    const { data: optimizationRun, error: runError } = await supabaseClient
      .from('resource_optimization_runs')
      .insert({  // CRITICAL: Site isolation
        company_id,
        config_id: config_id,
        run_type: 'manual',
        optimization_scope,
        scope_id,
        date_range_start,
        date_range_end,
        status: 'running',
        created_by: user.id
      })
      .select()
      .single();

    if (runError) throw runError;

    logStep("Created optimization run", { run_id: optimizationRun.id });

    // Load company data for optimization with site isolation
    const dataPromises = [
      // Load teams/crews
      supabaseClient.from('teams').select('*')
          // CRITICAL: Site isolation
        .eq('company_id', company_id),
      // Load projects
      supabaseClient.from('projects').select(`
        *,
        tasks(*),
        project_team_assignments(*)
      `)
          // CRITICAL: Site isolation
        .eq('company_id', company_id),
      // Load equipment
      supabaseClient.from('equipment_assignments').select(`
        *,
        projects(name, priority)
      `)
          // CRITICAL: Site isolation
        .eq('company_id', company_id),
      // Load existing assignments
      supabaseClient.from('project_team_assignments').select(`
        *,
        projects(name, priority, start_date, end_date),
        teams(name, skills)
      `)
          // CRITICAL: Site isolation
        .eq('company_id', company_id)
    ];

    const [teamsResult, projectsResult, equipmentResult, assignmentsResult] = await Promise.all(dataPromises);

    if (teamsResult.error) throw teamsResult.error;
    if (projectsResult.error) throw projectsResult.error;
    if (equipmentResult.error) throw equipmentResult.error;
    if (assignmentsResult.error) throw assignmentsResult.error;

    const teams = teamsResult.data || [];
    const projects = projectsResult.data || [];
    const equipment = equipmentResult.data || [];
    const assignments = assignmentsResult.data || [];

    logStep("Loaded company data", {
      teams: teams.length,
      projects: projects.length,
      equipment: equipment.length,
      assignments: assignments.length
    });

    // Detect conflicts with site isolation
    const conflicts = await detectResourceConflicts(assignments, equipment, supabaseClient, optimizationRun.id);
    
    logStep("Detected conflicts", { count: conflicts.length });

    // Generate AI optimization recommendations
    const optimizationPrompt = `
You are a construction resource optimization expert. Analyze the following data and provide optimal resource allocation recommendations.

Company Data:
- Teams: ${teams.length} crews available
- Projects: ${projects.length} active projects
- Equipment: ${equipment.length} equipment items
- Current Assignments: ${assignments.length}
- Conflicts Detected: ${conflicts.length}

Optimization Configuration:
- Strategy: ${effectiveConfig.optimization_strategy}
- Max Crew Utilization: ${effectiveConfig.max_crew_utilization}%
- Max Equipment Utilization: ${effectiveConfig.max_equipment_utilization}%
- Allow Overtime: ${effectiveConfig.allow_overtime}
- Travel Time Factor: ${effectiveConfig.travel_time_factor}

Current Conflicts:
${conflicts.slice(0, 5).map(c => `- ${c.conflict_type} on ${c.resource_type} from ${c.conflict_start_datetime} to ${c.conflict_end_datetime}`).join('\n')}

Provide optimization recommendations in JSON format:
{
  "optimizations": [
    {
      "resourceType": "crew|equipment",
      "resourceId": "uuid",
      "projectId": "uuid",
      "recommendedAction": "reschedule|reallocate|split|overtime",
      "newStartTime": "2024-01-15T08:00:00Z",
      "newEndTime": "2024-01-15T17:00:00Z",
      "efficiency_improvement": 15.5,
      "cost_impact": -500.00,
      "confidence": 0.85,
      "reasoning": "Explanation of recommendation"
    }
  ],
  "summary": {
    "total_improvements": 5,
    "estimated_efficiency_gain": 12.3,
    "estimated_cost_savings": 2500.00,
    "conflicts_resolved": 3,
    "implementation_priority": "high"
  }
}

Focus on maximizing efficiency while minimizing conflicts and costs.
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: 'You are a construction resource optimization expert that provides JSON responses only.' },
          { role: 'user', content: optimizationPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${await response.text()}`);
    }

    const aiResult = await response.json();
    const optimizationData = JSON.parse(aiResult.choices[0].message.content);

    logStep("Generated AI recommendations", { 
      optimizations: optimizationData.optimizations?.length || 0,
      estimated_savings: optimizationData.summary?.estimated_cost_savings || 0
    });

    // Store optimization results with site isolation
    const assignmentPromises = optimizationData.optimizations?.map((opt: any) =>
      supabaseClient.from('optimized_resource_assignments').insert({  // CRITICAL: Site isolation
        optimization_run_id: optimizationRun.id,
        company_id,
        resource_type: opt.resourceType,
        resource_id: opt.resourceId,
        project_id: opt.projectId,
        optimized_start_datetime: opt.newStartTime,
        optimized_end_datetime: opt.newEndTime,
        confidence_score: opt.confidence,
        efficiency_score: opt.efficiency_improvement,
        cost_impact: opt.cost_impact,
        optimization_reason: opt.reasoning
      })
    ) || [];

    await Promise.all(assignmentPromises);

        await supabaseClient
      .from('resource_optimization_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_resources_analyzed: teams.length + equipment.length,
        conflicts_detected: conflicts.length,
        conflicts_resolved: optimizationData.summary?.conflicts_resolved || 0,
        efficiency_improvement_percentage: optimizationData.summary?.estimated_efficiency_gain || 0,
        cost_savings_estimated: optimizationData.summary?.estimated_cost_savings || 0,
        optimization_data: optimizationData,
        recommendations: optimizationData.optimizations || []
      })
        // CRITICAL: Site isolation
      .eq('id', optimizationRun.id);

    // Store metrics with site isolation
    await supabaseClient.from('resource_optimization_metrics').insert({  // CRITICAL: Site isolation
      company_id,
      optimization_run_id: optimizationRun.id,
      total_resources: teams.length + equipment.length,
      efficiency_improvement: optimizationData.summary?.estimated_efficiency_gain || 0,
      cost_savings: optimizationData.summary?.estimated_cost_savings || 0,
      conflicts_resolved: optimizationData.summary?.conflicts_resolved || 0,
      projects_impacted: new Set(optimizationData.optimizations?.map((o: any) => o.projectId) || []).size
    });

    logStep("Optimization completed successfully");

    return new Response(JSON.stringify({
      success: true,
      optimization_run_id: optimizationRun.id,
      summary: optimizationData.summary,
      optimizations: optimizationData.optimizations,
      conflicts_detected: conflicts.length,
      processing_time: Date.now() - new Date(optimizationRun.started_at).getTime()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function detectResourceConflicts(assignments: any[], equipment: any[], supabaseClient: any, runId: string, siteId: string): Promise<any[]> {
  const conflicts: any[] = [];
  const resourceMap = new Map();

  // Group assignments by resource
  assignments.forEach(assignment => {
    const key = `crew-${assignment.team_id}`;
    if (!resourceMap.has(key)) {
      resourceMap.set(key, []);
    }
    resourceMap.get(key).push(assignment);
  });

  equipment.forEach(eq => {
    const key = `equipment-${eq.equipment_id}`;
    if (!resourceMap.has(key)) {
      resourceMap.set(key, []);
    }
    resourceMap.get(key).push(eq);
  });

  // Check for overlapping assignments
  for (const [resourceKey, resourceAssignments] of resourceMap.entries()) {
    const [resourceType, resourceId] = resourceKey.split('-');

    for (let i = 0; i < resourceAssignments.length; i++) {
      for (let j = i + 1; j < resourceAssignments.length; j++) {
        const assignment1 = resourceAssignments[i];
        const assignment2 = resourceAssignments[j];

        const start1 = new Date(assignment1.start_date || assignment1.assigned_date);
        const end1 = new Date(assignment1.end_date || assignment1.return_date);
        const start2 = new Date(assignment2.start_date || assignment2.assigned_date);
        const end2 = new Date(assignment2.end_date || assignment2.return_date);

        // Check for overlap
        if (start1 < end2 && start2 < end1) {
          const conflict = {  // CRITICAL: Site isolation
            optimization_run_id: runId,
            company_id: assignment1.company_id,
            conflict_type: 'double_booking',
            severity: 'high',
            resource_type: resourceType,
            resource_id: resourceId,
            primary_project_id: assignment1.project_id,
            secondary_project_id: assignment2.project_id,
            conflict_start_datetime: new Date(Math.max(start1.getTime(), start2.getTime())).toISOString(),
            conflict_end_datetime: new Date(Math.min(end1.getTime(), end2.getTime())).toISOString(),
            overlap_duration_minutes: Math.floor((Math.min(end1.getTime(), end2.getTime()) - Math.max(start1.getTime(), start2.getTime())) / 60000),
            auto_resolvable: true
          };

          conflicts.push(conflict);

          // Store in database with site isolation
          await supabaseClient.from('resource_conflicts').insert(conflict);
        }
      }
    }
  }

  return conflicts;
}