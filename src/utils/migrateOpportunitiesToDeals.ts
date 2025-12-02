import { supabase } from "@/integrations/supabase/client";

interface Opportunity {
  id: string;
  name: string;
  description?: string;
  estimated_value: number;
  probability_percent: number;
  stage: string;
  expected_close_date?: string;
  lead_id?: string;
  contact_id?: string;
  account_manager?: string;
  company_id: string;
  created_at: string;
}

interface PipelineStage {
  id: string;
  name: string;
  stage_order: number;
  probability_weight: number;
  company_id: string;
}

export async function migrateOpportunitiesToDeals(companyId: string) {
  try {
      "Starting migration of opportunities to deals for company:",
      companyId
    );

    // 1. Load existing opportunities
    const { data: opportunities, error: oppError } = await supabase
      .from("opportunities")
      .select("*")
      .eq("company_id", companyId);

    if (oppError) throw oppError;

    if (!opportunities || opportunities.length === 0) {
      return { success: true, migrated: 0 };
    }

    // 2. Load pipeline stages for this company
    const { data: stages, error: stagesError } = await supabase
      .from("pipeline_stages")
      .select("*")
      .eq("company_id", companyId);

    if (stagesError) throw stagesError;

    // 3. Create stage mapping from opportunity stage names to pipeline stage IDs
    const stageMapping: Record<string, string> = {};

    if (stages && stages.length > 0) {
      stages.forEach((stage: PipelineStage) => {
        const stageName = stage.name.toLowerCase();
        if (stageName.includes("prospect"))
          stageMapping["prospecting"] = stage.id;
        if (stageName.includes("qual"))
          stageMapping["qualification"] = stage.id;
        if (stageName.includes("proposal")) stageMapping["proposal"] = stage.id;
        if (stageName.includes("nego")) stageMapping["negotiation"] = stage.id;
        if (stageName.includes("won")) stageMapping["closed_won"] = stage.id;
        if (stageName.includes("lost")) stageMapping["closed_lost"] = stage.id;
      });
    }

    // 4. Check existing deals to avoid duplicates
    const { data: existingDeals, error: dealsError } = await supabase
      .from("deals")
      .select("name, estimated_value, company_id")
      .eq("company_id", companyId);

    if (dealsError) throw dealsError;

    const existingDealSignatures = new Set(
      (existingDeals || []).map(
        (deal) => `${deal.name}-${deal.estimated_value}-${deal.company_id}`
      )
    );

    // 5. Convert opportunities to deals format
    const dealsToInsert = opportunities
      .filter((opp: Opportunity) => {
        const signature = `${opp.name}-${opp.estimated_value}-${opp.company_id}`;
        return !existingDealSignatures.has(signature);
      })
      .map((opp: Opportunity) => ({
        company_id: opp.company_id,
        name: opp.name,
        description: opp.description,
        estimated_value: opp.estimated_value,
        expected_close_date: opp.expected_close_date,
        current_stage_id: stageMapping[opp.stage] || stages?.[0]?.id,
        primary_contact_id: opp.contact_id,
        status:
          opp.stage === "closed_won"
            ? "won"
            : opp.stage === "closed_lost"
            ? "lost"
            : "active",
        priority: "medium",
        risk_level: "medium",
        source: "migrated_opportunity",
        created_at: opp.created_at,
      }));

    if (dealsToInsert.length === 0) {
        "No new opportunities to migrate (all already exist as deals)"
      );
      return { success: true, migrated: 0 };
    }

    // 6. Insert deals
    const { data: insertedDeals, error: insertError } = await supabase
      .from("deals")
      .insert(dealsToInsert)
      .select();

    if (insertError) throw insertError;

      `Successfully migrated ${dealsToInsert.length} opportunities to deals`
    );

    return {
      success: true,
      migrated: dealsToInsert.length,
      deals: insertedDeals,
    };
  } catch (error) {
    console.error("Error migrating opportunities to deals:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Helper function to trigger migration for current user's company
export async function migrateCurrentUserOpportunities() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) throw new Error("No company ID found for user");

    return await migrateOpportunitiesToDeals(profile.company_id);
  } catch (error) {
    console.error("Error migrating current user opportunities:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
