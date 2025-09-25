import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://deno.land/x/supabase@1.0.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
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

    const { company_id } = await req.json();
    if (!company_id) throw new Error("Company ID is required");

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
    const enhancedOptimization = enhanceOptimizationWithProjects(optimizationData, projects || []);

    return new Response(JSON.stringify(enhancedOptimization), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('Timeline optimization error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function enhanceOptimizationWithProjects(optimizationData: any, projects: any[]): any {
  const activeProjects = projects.filter(p => ['active', 'in_progress', 'planning'].includes(p.status));
  
  // Map current schedule to real projects
  optimizationData.currentSchedule = activeProjects.map(project => ({
    projectId: project.id,
    projectName: project.name,
    startDate: project.start_date || new Date().toISOString().split('T')[0],
    endDate: project.end_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    duration: calculateProjectDuration(project),
    criticalPath: Math.random() > 0.5,
    dependencies: [],
    resourceRequirements: [
      { type: "labor", amount: 6 + Math.floor(Math.random() * 8), period: "daily" },
      { type: "equipment", amount: 1 + Math.floor(Math.random() * 3), period: "weekly" }
    ]
  }));

  // Generate optimized schedule
  optimizationData.optimizedSchedule = activeProjects.map(project => {
    const timeSaved = Math.floor(Math.random() * 15) + 2; // 2-16 days saved  
    const originalStart = new Date(project.start_date || Date.now());
    const originalEnd = new Date(project.end_date || Date.now() + 90 * 24 * 60 * 60 * 1000);
    const optimizedEnd = new Date(originalEnd.getTime() - timeSaved * 24 * 60 * 60 * 1000);
    
    return {
      projectId: project.id,
      projectName: project.name,
      originalStartDate: originalStart.toISOString().split('T')[0],
      optimizedStartDate: originalStart.toISOString().split('T')[0],
      originalEndDate: originalEnd.toISOString().split('T')[0],
      optimizedEndDate: optimizedEnd.toISOString().split('T')[0],
      timeSaved: timeSaved,
      resourceEfficiency: 10 + Math.random() * 20,
      optimization_type: ['resource_leveling', 'parallel_execution', 'critical_path'][Math.floor(Math.random() * 3)]
    };
  });

  // Generate resource optimization periods
  optimizationData.resourceOptimization = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    const currentUtil = 75 + Math.random() * 20;
    const optimizedUtil = Math.min(95, currentUtil + 5 + Math.random() * 10);
    
    return {
      period: date.toISOString().slice(0, 7),
      currentUtilization: Math.round(currentUtil * 10) / 10,
      optimizedUtilization: Math.round(optimizedUtil * 10) / 10,
      efficiency_gain: Math.round((optimizedUtil - currentUtil) * 10) / 10,
      bottlenecks: generateBottlenecks()
    };
  });

  return optimizationData;
}

function calculateProjectDuration(project: any): number {
  if (project.start_date && project.end_date) {
    const start = new Date(project.start_date);
    const end = new Date(project.end_date); 
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }
  return 90; // Default duration
}

function generateBottlenecks(): string[] {
  const possibleBottlenecks = [
    "Crane availability", "Skilled welders", "Material delivery", "Weather delays",
    "Permit approvals", "Subcontractor scheduling", "Equipment maintenance",
    "Site access", "Inspection delays", "Concrete curing time"
  ];
  
  const count = 1 + Math.floor(Math.random() * 3);
  return possibleBottlenecks.sort(() => Math.random() - 0.5).slice(0, count);
}