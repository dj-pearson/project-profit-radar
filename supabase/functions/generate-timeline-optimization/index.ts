import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

import { resolveCompanyScope } from '../_shared/caller-company.ts';

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// The caller, src/components/analytics/TimelineOptimization.tsx, sends
// { company_id: userProfile.company_id }.
const TimelineOptimizationSchema = z.object({
  company_id: z.string().uuid(),
}).passthrough();

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const parsed = await validateBody(req, TimelineOptimizationSchema, { name: 'generate-timeline-optimization' });
    if (!parsed.ok) return parsed.response;
    const { company_id: bodyCompanyId } = parsed.data;
    if (!bodyCompanyId) throw new Error("Company ID is required");

    // SECURITY (US-241): the reads below run on the SERVICE ROLE and were
    // filtered only by the body company_id, so any signed-in user could read
    // another tenant's projects (names, ids, dates), crew assignments and
    // equipment back through the optimisation response. The company must now
    // be the caller's own; a disagreeing body value is a 403.
    const callerId = userData?.user?.id;
    if (!callerId) throw new Error("Authentication error: no user");
    const { data: callerProfile } = await supabaseClient
      .from('user_profiles')
      .select('company_id')
      .eq('id', callerId)
      .maybeSingle();
    const scope = resolveCompanyScope(callerProfile?.company_id, bodyCompanyId);
    if (!scope.ok) {
      return new Response(
        JSON.stringify({ success: false, error: scope.error, timestamp: new Date().toISOString() }),
        { status: scope.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const company_id = scope.companyId;

    // Load project and resource data
    const [
      { data: projects },
      { data: crewAssignments },
      { data: equipment }
    ] = await Promise.all([
      supabaseClient.from('projects').select('*').eq('company_id', company_id),
      supabaseClient.from('crew_assignments').select('*').eq('company_id', company_id),
      supabaseClient.from('equipment').select('*').eq('company_id', company_id)
    ]);

    const optimizationPrompt = `
    Analyze the following construction company data and generate timeline optimization recommendations:

    Projects: ${projects?.length || 0} total
    Active Projects: ${projects?.filter(p => ['active', 'in_progress'].includes(p.status)).length || 0}
    Crew Assignments: ${crewAssignments?.length || 0}
    Equipment Available: ${equipment?.length || 0}

    Generate a JSON response with this structure:
    {
      "currentSchedule": [
        {
          "projectId": "uuid",
          "projectName": "Project Name",
          "startDate": "2024-01-15",
          "endDate": "2024-04-15",
          "duration": 90,
          "criticalPath": true,
          "dependencies": ["proj-2"],
          "resourceRequirements": [
            {"type": "labor", "amount": 8, "period": "daily"},
            {"type": "equipment", "amount": 2, "period": "weekly"}
          ]
        }
      ],
      "optimizedSchedule": [
        {
          "projectId": "uuid",
          "projectName": "Project Name", 
          "originalStartDate": "2024-01-15",
          "optimizedStartDate": "2024-01-10",
          "originalEndDate": "2024-04-15",
          "optimizedEndDate": "2024-04-10",
          "timeSaved": 5,
          "resourceEfficiency": 15.5,
          "optimization_type": "resource_leveling"
        }
      ],
      "resourceOptimization": [
        {
          "period": "2024-01",
          "currentUtilization": 85.5,
          "optimizedUtilization": 92.0,
          "efficiency_gain": 6.5,
          "bottlenecks": ["Crane availability", "Skilled welders"]
        }
      ],
      "criticalPathAnalysis": [
        {
          "projectId": "uuid",
          "projectName": "Project Name",
          "criticalTasks": [
            {
              "taskName": "Foundation Pour",
              "duration": 5,
              "slack": 0,
              "impact": 9
            }
          ],
          "totalDuration": 90,
          "optimization_potential": 12
        }
      ],
      "recommendations": [
        {
          "type": "schedule",
          "priority": "high",
          "title": "Parallel Task Execution",
          "description": "Run electrical and plumbing rough-in simultaneously",
          "impact": "Save 7-10 days per project",
          "effort": "Medium - requires coordination",
          "timeframe": "2-3 weeks to implement"
        }
      ]
    }
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
          { role: 'system', content: 'You are a construction project scheduling expert specializing in timeline optimization and resource allocation.' },
          { role: 'user', content: optimizationPrompt }
        ],
        temperature: 0.1,
      }),
    });

    const aiResult = await response.json();
    const optimizationData = JSON.parse(aiResult.choices[0].message.content);

    // Enhance with real project data
    const enhancedOptimization = enhanceOptimizationWithProjects(optimizationData, projects || [], crewAssignments || []);

    return new Response(JSON.stringify({ success: true, timestamp: new Date().toISOString(), ...enhancedOptimization }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('Timeline optimization error:', error);
    return new Response(JSON.stringify({
      success: false,
      timestamp: new Date().toISOString(), 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function enhanceOptimizationWithProjects(
  optimizationData: any,
  projects: any[],
  crewAssignments: Array<{ project_id?: string | null }>,
): any {
  const activeProjects = projects.filter(p => ['active', 'in_progress', 'planning'].includes(p.status));

  // The current schedule is the projects as recorded. criticalPath, the crew
  // size and the equipment count were random; there is no dependency data, so
  // criticalPath is null, and labor is the number of crew assignments on the
  // project. A missing date stays null instead of defaulting to today + 90.
  optimizationData.currentSchedule = activeProjects.map(project => ({
    projectId: project.id,
    projectName: project.name,
    startDate: project.start_date || null,
    endDate: project.end_date || null,
    duration: calculateProjectDuration(project),
    criticalPath: null,
    dependencies: [],
    resourceRequirements: [
      {
        type: "labor",
        amount: crewAssignments.filter(a => a.project_id === project.id).length,
        period: "assignments"
      }
    ]
  }));

  // No optimizer exists yet. timeSaved (2-16 days), resourceEfficiency,
  // optimization_type and the six months of utilization and bottlenecks were
  // all random, shown as savings. Until a real scheduler computes them these
  // are empty, and optimizationAvailable says why.
  optimizationData.optimizedSchedule = [];
  optimizationData.resourceOptimization = [];
  optimizationData.optimizationAvailable = false;
  optimizationData.optimizationNote =
    'Schedule optimization is not available yet: no optimizer computes time saved or utilization.';

  return optimizationData;
}

function calculateProjectDuration(project: any): number | null {
  if (project.start_date && project.end_date) {
    const start = new Date(project.start_date);
    const end = new Date(project.end_date);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }
  return null; // No dates, no duration (was a flat 90).
}
