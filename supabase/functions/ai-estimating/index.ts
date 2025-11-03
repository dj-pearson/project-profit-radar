// AI Estimating Engine Edge Function
// Generates project cost estimates using ML predictions and historical data

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EstimateRequest {
  tenant_id: string
  user_id: string
  project_name: string
  project_type: string
  square_footage: number
  location_zip: string
  estimated_duration_days?: number
}

interface SimilarProject {
  id: string
  similarity_score: number
  total_cost: number
  bid_amount: number
  won: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestData: EstimateRequest = await req.json()

    const {
      tenant_id,
      user_id,
      project_name,
      project_type,
      square_footage,
      location_zip,
      estimated_duration_days = 30
    } = requestData

    // Step 1: Find similar historical projects
    const { data: similarProjects, error: similarError } = await supabaseClient
      .rpc('get_similar_projects', {
        p_tenant_id: tenant_id,
        p_project_type: project_type,
        p_square_footage: square_footage,
        p_location_zip: location_zip
      })

    if (similarError) {
      console.error('Error finding similar projects:', similarError)
    }

    const similar = (similarProjects || []) as SimilarProject[]

    // Step 2: Get market pricing data
    const { data: marketData, error: marketError } = await supabaseClient
      .from('market_pricing_data')
      .select('*')
      .eq('project_type', project_type)
      .or(`location_zip.eq.${location_zip},location_region.eq.nationwide`)
      .order('valid_from', { ascending: false })
      .limit(1)
      .single()

    if (marketError) {
      console.warn('No market data found, using defaults')
    }

    // Step 3: Calculate predictions using simple ML algorithms
    const predictions = calculatePredictions(
      project_type,
      square_footage,
      estimated_duration_days,
      similar,
      marketData
    )

    // Step 4: Get win rate for this project type
    const { data: winRateData } = await supabaseClient
      .rpc('get_win_rate_by_project_type', {
        p_tenant_id: tenant_id,
        p_project_type: project_type
      })

    const historicalWinRate = winRateData || 30.0

    // Step 5: Calculate recommended markup and bid amount
    const { recommendedMarkup, winProbability } = calculateMarkupRecommendation(
      predictions.totalCost,
      marketData?.average_markup_percentage || 20.0,
      historicalWinRate,
      similar
    )

    const recommendedBidAmount = predictions.totalCost * (1 + recommendedMarkup / 100)

    // Step 6: Create AI estimate record
    const { data: estimate, error: estimateError } = await supabaseClient
      .from('ai_estimates')
      .insert({
        tenant_id,
        user_id,
        estimate_name: project_name,
        project_type,
        square_footage,
        location_zip,
        estimated_duration_days,
        predicted_labor_hours: predictions.laborHours,
        predicted_labor_cost: predictions.laborCost,
        predicted_material_cost: predictions.materialCost,
        predicted_equipment_cost: predictions.equipmentCost,
        predicted_subcontractor_cost: predictions.subcontractorCost,
        predicted_total_cost: predictions.totalCost,
        confidence_score: predictions.confidenceScore,
        recommended_markup: recommendedMarkup,
        recommended_bid_amount: recommendedBidAmount,
        win_probability: winProbability,
        similar_projects_count: similar.length,
        training_data_quality: determineDataQuality(similar.length),
        model_version: 'v1.0',
        status: 'draft'
      })
      .select()
      .single()

    if (estimateError) throw estimateError

    // Step 7: Create detailed line item predictions
    const lineItems = generateLineItemPredictions(
      project_type,
      square_footage,
      predictions,
      marketData
    )

    const { error: lineItemError } = await supabaseClient
      .from('estimate_predictions')
      .insert(
        lineItems.map(item => ({
          ai_estimate_id: estimate.id,
          ...item
        }))
      )

    if (lineItemError) {
      console.error('Error creating line items:', lineItemError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        estimate: {
          id: estimate.id,
          estimate_name: project_name,
          predictions: {
            labor_hours: predictions.laborHours,
            labor_cost: predictions.laborCost,
            material_cost: predictions.materialCost,
            equipment_cost: predictions.equipmentCost,
            subcontractor_cost: predictions.subcontractorCost,
            total_cost: predictions.totalCost
          },
          recommendations: {
            markup_percentage: recommendedMarkup,
            bid_amount: recommendedBidAmount,
            win_probability: winProbability
          },
          confidence: {
            score: predictions.confidenceScore,
            similar_projects: similar.length,
            data_quality: determineDataQuality(similar.length)
          },
          line_items: lineItems
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('AI Estimating Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Calculate cost predictions using weighted average from similar projects
function calculatePredictions(
  projectType: string,
  squareFootage: number,
  durationDays: number,
  similarProjects: SimilarProject[],
  marketData: any
) {
  let laborCost = 0
  let materialCost = 0
  let equipmentCost = 0
  let subcontractorCost = 0
  let confidenceScore = 0

  if (similarProjects.length > 0) {
    // Use weighted average based on similarity score
    const totalWeight = similarProjects.reduce((sum, p) => sum + p.similarity_score, 0)

    const avgCostPerSqft = similarProjects.reduce(
      (sum, p) => sum + (p.total_cost / 100) * p.similarity_score,
      0
    ) / totalWeight

    const totalCost = avgCostPerSqft * squareFootage

    // Typical cost breakdown by category
    laborCost = totalCost * 0.40 // 40% labor
    materialCost = totalCost * 0.35 // 35% materials
    equipmentCost = totalCost * 0.10 // 10% equipment
    subcontractorCost = totalCost * 0.15 // 15% subcontractors

    // Confidence based on number of similar projects
    confidenceScore = Math.min(50 + (similarProjects.length * 5), 95)

  } else if (marketData) {
    // Use market data as fallback
    const costPerSqft = marketData.average_cost_per_sqft || 100
    const totalCost = costPerSqft * squareFootage

    laborCost = totalCost * 0.40
    materialCost = totalCost * 0.35
    equipmentCost = totalCost * 0.10
    subcontractorCost = totalCost * 0.15

    confidenceScore = 30 // Lower confidence without historical data

  } else {
    // Use industry averages as last resort
    const defaultCostPerSqft = getDefaultCostPerSqft(projectType)
    const totalCost = defaultCostPerSqft * squareFootage

    laborCost = totalCost * 0.40
    materialCost = totalCost * 0.35
    equipmentCost = totalCost * 0.10
    subcontractorCost = totalCost * 0.15

    confidenceScore = 20 // Very low confidence
  }

  const totalCost = laborCost + materialCost + equipmentCost + subcontractorCost
  const laborHours = laborCost / 45 // Assuming $45/hour average

  return {
    laborHours: Math.round(laborHours * 10) / 10,
    laborCost: Math.round(laborCost * 100) / 100,
    materialCost: Math.round(materialCost * 100) / 100,
    equipmentCost: Math.round(equipmentCost * 100) / 100,
    subcontractorCost: Math.round(subcontractorCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    confidenceScore: Math.round(confidenceScore * 10) / 10
  }
}

// Calculate recommended markup based on market conditions and historical data
function calculateMarkupRecommendation(
  totalCost: number,
  marketMarkup: number,
  historicalWinRate: number,
  similarProjects: SimilarProject[]
) {
  let recommendedMarkup = marketMarkup

  // Adjust based on historical win rate
  if (historicalWinRate < 25) {
    recommendedMarkup = marketMarkup * 0.85 // Lower markup to win more
  } else if (historicalWinRate > 40) {
    recommendedMarkup = marketMarkup * 1.15 // Can afford higher markup
  }

  // Adjust based on similar won/lost projects
  if (similarProjects.length > 0) {
    const wonProjects = similarProjects.filter(p => p.won)
    const winRate = (wonProjects.length / similarProjects.length) * 100

    if (winRate < 30) {
      recommendedMarkup *= 0.9
    } else if (winRate > 50) {
      recommendedMarkup *= 1.1
    }
  }

  // Calculate win probability (simplified model)
  let winProbability = 50.0

  if (recommendedMarkup < 15) {
    winProbability = 70.0
  } else if (recommendedMarkup < 20) {
    winProbability = 55.0
  } else if (recommendedMarkup < 25) {
    winProbability = 40.0
  } else {
    winProbability = 30.0
  }

  return {
    recommendedMarkup: Math.round(recommendedMarkup * 10) / 10,
    winProbability: Math.round(winProbability * 10) / 10
  }
}

// Generate detailed line item predictions
function generateLineItemPredictions(
  projectType: string,
  squareFootage: number,
  predictions: any,
  marketData: any
) {
  const lineItems = []

  // Labor line items
  lineItems.push({
    category: 'labor',
    item_name: 'General Labor',
    item_description: 'Skilled and unskilled labor',
    predicted_quantity: predictions.laborHours * 0.6,
    predicted_unit_cost: 35.0,
    predicted_total_cost: predictions.laborCost * 0.6,
    confidence_score: 70.0,
    prediction_model: 'weighted_average'
  })

  lineItems.push({
    category: 'labor',
    item_name: 'Specialized Labor',
    item_description: 'Electricians, plumbers, HVAC techs',
    predicted_quantity: predictions.laborHours * 0.4,
    predicted_unit_cost: 65.0,
    predicted_total_cost: predictions.laborCost * 0.4,
    confidence_score: 65.0,
    prediction_model: 'weighted_average'
  })

  // Material line items
  lineItems.push({
    category: 'materials',
    item_name: 'Primary Materials',
    item_description: 'Lumber, concrete, steel',
    predicted_quantity: squareFootage,
    predicted_unit_cost: (predictions.materialCost * 0.6) / squareFootage,
    predicted_total_cost: predictions.materialCost * 0.6,
    confidence_score: 75.0,
    prediction_model: 'market_pricing'
  })

  lineItems.push({
    category: 'materials',
    item_name: 'Finishing Materials',
    item_description: 'Drywall, paint, flooring',
    predicted_quantity: squareFootage,
    predicted_unit_cost: (predictions.materialCost * 0.4) / squareFootage,
    predicted_total_cost: predictions.materialCost * 0.4,
    confidence_score: 70.0,
    prediction_model: 'market_pricing'
  })

  // Equipment line items
  lineItems.push({
    category: 'equipment',
    item_name: 'Equipment Rental',
    item_description: 'Heavy machinery, tools, scaffolding',
    predicted_quantity: 1,
    predicted_unit_cost: predictions.equipmentCost,
    predicted_total_cost: predictions.equipmentCost,
    confidence_score: 60.0,
    prediction_model: 'industry_standard'
  })

  // Subcontractor line items
  lineItems.push({
    category: 'subcontractor',
    item_name: 'Subcontractor Services',
    item_description: 'Electrical, plumbing, HVAC, specialty trades',
    predicted_quantity: 1,
    predicted_unit_cost: predictions.subcontractorCost,
    predicted_total_cost: predictions.subcontractorCost,
    confidence_score: 65.0,
    prediction_model: 'industry_standard'
  })

  return lineItems
}

// Determine data quality based on number of similar projects
function determineDataQuality(similarCount: number): string {
  if (similarCount >= 10) return 'high'
  if (similarCount >= 5) return 'medium'
  return 'low'
}

// Default cost per sqft by project type
function getDefaultCostPerSqft(projectType: string): number {
  const defaults: Record<string, number> = {
    'residential_new': 150,
    'residential_renovation': 100,
    'commercial_new': 200,
    'commercial_renovation': 150,
    'industrial': 180,
    'multi_family': 140
  }

  return defaults[projectType] || 120
}
