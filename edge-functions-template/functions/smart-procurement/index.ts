// Smart Procurement Edge Function
// Updated with multi-tenant site_id isolation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MaterialUsage {
  material_name: string
  material_category: string
  quantity: number
  unit: string
  project_id: string
  date: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize auth context - extracts user AND site_id from JWT
    const authContext = await initializeAuthContext(req)
    if (!authContext) {
      return errorResponse('Unauthorized', 401)
    }

    const { user, siteId, supabase: supabaseClient } = authContext
    console.log('[SMART-PROCUREMENT] User authenticated', { userId: user.id, siteId })

    const { tenant_id, project_id, action } = await req.json()

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'tenant_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    switch (action) {
      case 'forecast_materials':
        return await forecastMaterials(supabaseClient, siteId, tenant_id, project_id)
      case 'optimize_suppliers':
        return await optimizeSuppliers(supabaseClient, siteId, tenant_id)
      case 'generate_recommendations':
        return await generateRecommendations(supabaseClient, siteId, tenant_id, project_id)
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: forecast_materials, optimize_suppliers, generate_recommendations' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }

  } catch (error) {
    console.error('[SMART-PROCUREMENT] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function forecastMaterials(supabase: any, siteId: string, tenant_id: string, project_id?: string) {
  console.log('[SMART-PROCUREMENT] Forecasting materials', { siteId, tenant_id, project_id })

  // Get historical material usage from projects with site isolation
  let query = supabase
    .from('projects')
    .select('id, name, materials_used:financial_records(material_name, quantity, unit, created_at)')
    .eq('site_id', siteId)  // CRITICAL: Site isolation
    .eq('tenant_id', tenant_id)
    .eq('status', 'completed')
    .limit(10)

  const { data: historicalProjects, error: histError } = await query

  if (histError) {
    throw new Error(`Failed to fetch historical data: ${histError.message}`)
  }

  // Analyze material usage patterns
  const materialStats: { [key: string]: { total: number, count: number, unit: string, category: string } } = {}

  // Process historical data
  for (const project of historicalProjects || []) {
    const materials = project.materials_used || []
    for (const material of materials) {
      if (!material.material_name) continue

      if (!materialStats[material.material_name]) {
        materialStats[material.material_name] = {
          total: 0,
          count: 0,
          unit: material.unit || 'unit',
          category: material.material_category || 'General'
        }
      }
      materialStats[material.material_name].total += parseFloat(material.quantity || 0)
      materialStats[material.material_name].count += 1
    }
  }

  // Generate forecasts
  const forecasts = []
  const forecastDate = new Date()
  forecastDate.setDate(forecastDate.getDate() + 30) // 30 days out

  for (const [materialName, stats] of Object.entries(materialStats)) {
    const avgQuantity = stats.total / stats.count
    const confidence = Math.min(95, (stats.count / 10) * 100) // Higher confidence with more data points

    // Calculate lead time (7-14 days typical)
    const leadTime = Math.floor(Math.random() * 7) + 7

    const recommendedOrderDate = new Date(forecastDate)
    recommendedOrderDate.setDate(recommendedOrderDate.getDate() - leadTime)

    const forecast = {
      site_id: siteId,  // CRITICAL: Include site_id
      tenant_id,
      project_id,
      material_name: materialName,
      material_category: stats.category,
      forecast_date: forecastDate.toISOString().split('T')[0],
      forecast_quantity: Math.round(avgQuantity * 1.15), // Add 15% buffer
      forecast_unit: stats.unit,
      confidence_score: confidence,
      based_on_projects_count: stats.count,
      estimated_lead_time_days: leadTime,
      recommended_order_date: recommendedOrderDate.toISOString().split('T')[0]
    }

    // Insert forecast into database with site_id
    const { error: insertError } = await supabase
      .from('material_forecasts')
      .insert(forecast)

    if (insertError) {
      console.error('[SMART-PROCUREMENT] Error inserting forecast:', insertError)
    } else {
      forecasts.push(forecast)
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      forecasts_generated: forecasts.length,
      forecasts: forecasts
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  )
}

async function optimizeSuppliers(supabase: any, siteId: string, tenant_id: string) {
  console.log('[SMART-PROCUREMENT] Optimizing suppliers', { siteId, tenant_id })

  // Get all suppliers with site isolation
  const { data: suppliers, error: suppError } = await supabase
    .from('supplier_catalog')
    .select('*')
    .eq('site_id', siteId)  // CRITICAL: Site isolation
    .eq('tenant_id', tenant_id)
    .eq('is_active', true)

  if (suppError) {
    throw new Error(`Failed to fetch suppliers: ${suppError.message}`)
  }

  // Score suppliers based on price, lead time, and rating
  const scoredSuppliers = (suppliers || []).map((supplier: any) => {
    const priceScore = 100 - Math.min(100, (supplier.unit_price / 100) * 50) // Lower price = higher score
    const leadTimeScore = 100 - Math.min(100, (supplier.lead_time_days / 30) * 100) // Shorter lead time = higher score
    const ratingScore = (supplier.supplier_rating || 3) * 20 // 5 stars = 100

    const overallScore = (priceScore * 0.4) + (leadTimeScore * 0.3) + (ratingScore * 0.3)

    return {
      ...supplier,
      optimization_score: Math.round(overallScore)
    }
  })

  // Sort by optimization score
  scoredSuppliers.sort((a: any, b: any) => b.optimization_score - a.optimization_score)

  return new Response(
    JSON.stringify({
      success: true,
      suppliers: scoredSuppliers.slice(0, 20), // Top 20
      optimization_criteria: {
        price_weight: 40,
        lead_time_weight: 30,
        rating_weight: 30
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  )
}

async function generateRecommendations(supabase: any, siteId: string, tenant_id: string, project_id?: string) {
  console.log('[SMART-PROCUREMENT] Generating purchase recommendations', { siteId, tenant_id, project_id })

  // Get active forecasts with site isolation
  let forecastQuery = supabase
    .from('material_forecasts')
    .select('*')
    .eq('site_id', siteId)  // CRITICAL: Site isolation
    .eq('tenant_id', tenant_id)
    .gte('forecast_date', new Date().toISOString().split('T')[0])
    .order('forecast_date', { ascending: true })
    .limit(50)

  if (project_id) {
    forecastQuery = forecastQuery.eq('project_id', project_id)
  }

  const { data: forecasts, error: forecastError } = await forecastQuery

  if (forecastError) {
    throw new Error(`Failed to fetch forecasts: ${forecastError.message}`)
  }

  const recommendations = []

  for (const forecast of forecasts || []) {
    // Find best supplier for this material with site isolation
    const { data: suppliers, error: suppError } = await supabase
      .from('supplier_catalog')
      .select('*')
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .eq('tenant_id', tenant_id)
      .eq('material_name', forecast.material_name)
      .eq('is_active', true)
      .order('unit_price', { ascending: true })
      .limit(3)

    if (suppError || !suppliers || suppliers.length === 0) {
      console.log('[SMART-PROCUREMENT] No suppliers found for material:', forecast.material_name)
      continue
    }

    const bestSupplier = suppliers[0]
    const estimatedCost = forecast.forecast_quantity * bestSupplier.unit_price

    // Calculate potential savings if buying in bulk
    let estimatedSavings = 0
    if (
      bestSupplier.bulk_discount_threshold &&
      forecast.forecast_quantity >= bestSupplier.bulk_discount_threshold
    ) {
      estimatedSavings = estimatedCost * (bestSupplier.bulk_discount_percentage / 100)
    }

    // Compare with other suppliers to show savings
    if (suppliers.length > 1) {
      const alternativeCost = forecast.forecast_quantity * suppliers[1].unit_price
      estimatedSavings = Math.max(estimatedSavings, alternativeCost - estimatedCost)
    }

    const recommendation = {
      site_id: siteId,  // CRITICAL: Include site_id
      tenant_id,
      project_id: forecast.project_id,
      material_name: forecast.material_name,
      recommended_quantity: forecast.forecast_quantity,
      recommended_unit: forecast.forecast_unit,
      recommended_supplier_id: bestSupplier.id,
      estimated_cost: estimatedCost,
      estimated_savings: estimatedSavings,
      recommended_order_date: forecast.recommended_order_date,
      expected_delivery_date: new Date(
        new Date(forecast.recommended_order_date).getTime() +
        bestSupplier.lead_time_days * 24 * 60 * 60 * 1000
      ).toISOString().split('T')[0],
      status: 'pending'
    }

    // Insert recommendation with site_id
    const { error: insertError } = await supabase
      .from('purchase_recommendations')
      .insert(recommendation)

    if (insertError) {
      console.error('[SMART-PROCUREMENT] Error inserting recommendation:', insertError)
    } else {
      recommendations.push({
        ...recommendation,
        supplier_name: bestSupplier.supplier_name
      })
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      recommendations_generated: recommendations.length,
      recommendations: recommendations,
      total_estimated_savings: recommendations.reduce((sum: number, r: any) => sum + (r.estimated_savings || 0), 0)
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  )
}
