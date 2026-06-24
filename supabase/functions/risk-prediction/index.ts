// Risk Prediction Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RiskPredictionRequest {
  tenant_id: string
  project_id: string
  user_id: string
}

interface ProjectData {
  id: string
  name: string
  budget: number
  actual_cost: number
  start_date: string
  end_date: string
  status: string
  square_footage?: number
  location_zip?: string
}

interface HistoricalProject {
  id: string
  budget: number
  actual_cost: number
  planned_duration: number
  actual_duration: number
  delay_days: number
  cost_overrun: number
  safety_incidents: number
  quality_issues: number
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
        const authContext = await initializeAuthContext(req)
    if (!authContext) {
      return errorResponse('Unauthorized', 401)
    }

    const { user, supabase: supabaseClient } = authContext
    console.log('[RISK-PREDICTION] User authenticated', { userId: user.id })

    const { tenant_id, project_id, user_id } = await req.json() as RiskPredictionRequest

    if (!tenant_id || !project_id || !user_id) {
      throw new Error('Missing required fields: tenant_id, project_id, user_id')
    }

    console.log(`[RISK-PREDICTION] Generating risk prediction for project ${project_id}`)

    // 1. Get current project data
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      throw new Error('Project not found')
    }

    // 2. Get historical projects for comparison
    const { data: historicalProjects, error: histError } = await supabaseClient
      .from('projects')
      .select('id, budget, actual_cost, start_date, end_date, status')
      .eq('tenant_id', tenant_id)
      .eq('status', 'completed')
      .limit(50)

    // 3. Get current project's time entries for labor analysis
    const { data: timeEntries } = await supabaseClient
      .from('time_entries')
      .select('hours_worked, created_at')
      .eq('project_id', project_id)

    // 4. Get safety incidents
    const { data: safetyIncidents } = await supabaseClient
      .from('osha_300_log')
      .select('severity, incident_date')
      .eq('project_id', project_id)

    // 5. Get change orders
    const { data: changeOrders } = await supabaseClient
      .from('change_orders')
      .select('amount, status')
      .eq('project_id', project_id)

    // 6. Calculate risk scores
    const riskScores = calculateRiskScores(
      project as ProjectData,
      historicalProjects || [],
      timeEntries || [],
      safetyIncidents || [],
      changeOrders || []
    )

    // 7. Generate risk factors
    const riskFactors = generateRiskFactors(
      project as ProjectData,
      riskScores,
      timeEntries || [],
      safetyIncidents || [],
      changeOrders || []
    )

    // 8. Generate recommendations
    const recommendations = generateRecommendations(riskScores, riskFactors)

    // 9. Calculate predictions
    const predictions = calculatePredictions(
      project as ProjectData,
      riskScores,
      historicalProjects || []
    )

    // 10. Save risk prediction to database
    const { data: riskPrediction, error: insertError } = await supabaseClient
      .from('risk_predictions')
      .insert({
        tenant_id,
        project_id,
        overall_risk_score: riskScores.overall,
        delay_risk_score: riskScores.delay,
        budget_risk_score: riskScores.budget,
        safety_risk_score: riskScores.safety,
        quality_risk_score: riskScores.quality,
        risk_level: getRiskLevel(riskScores.overall),
        predicted_delay_days: predictions.delay_days,
        predicted_cost_overrun: predictions.cost_overrun,
        predicted_completion_date: predictions.completion_date,
        model_version: 'v1.0',
        confidence_score: riskScores.confidence,
        prediction_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting risk prediction:', insertError)
      throw insertError
    }

    // 11. Save risk factors
    const factorsToInsert = riskFactors.map(factor => ({
      risk_prediction_id: riskPrediction.id,
      ...factor
    }))

    const { error: factorsError } = await supabaseClient
      .from('risk_factors')
      .insert(factorsToInsert)

    if (factorsError) {
      console.error('Error inserting risk factors:', factorsError)
    }

    // 12. Save recommendations
    const recsToInsert = recommendations.map(rec => ({
      risk_prediction_id: riskPrediction.id,
      ...rec
    }))

    const { error: recsError } = await supabaseClient
      .from('risk_recommendations')
      .insert(recsToInsert)

    if (recsError) {
      console.error('Error inserting recommendations:', recsError)
    }

    // 13. Create alerts for high-risk areas
    const alerts = generateAlerts(project as ProjectData, riskScores, tenant_id, project_id, riskPrediction.id)

    if (alerts.length > 0) {
      const { error: alertsError } = await supabaseClient
        .from('risk_alerts')
        .insert(alerts)

      if (alertsError) {
        console.error('Error inserting risk alerts:', alertsError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        prediction: riskPrediction,
        risk_factors: riskFactors,
        recommendations: recommendations,
        alerts: alerts,
        predictions: predictions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in risk-prediction function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function calculateRiskScores(
  project: ProjectData,
  historicalProjects: any[],
  timeEntries: any[],
  safetyIncidents: any[],
  changeOrders: any[]
): {
  overall: number
  delay: number
  budget: number
  safety: number
  quality: number
  confidence: number
} {
  // Budget Risk Score (0-100)
  let budgetRisk = 0
  if (project.budget > 0) {
    const spendRate = project.actual_cost / project.budget
    if (spendRate > 0.9) budgetRisk = 80
    else if (spendRate > 0.8) budgetRisk = 60
    else if (spendRate > 0.7) budgetRisk = 40
    else if (spendRate > 0.5) budgetRisk = 20
    else budgetRisk = 10

    // Adjust based on change orders
    const pendingChangeOrders = changeOrders.filter(co => co.status === 'pending' || co.status === 'approved')
    const changeOrderValue = pendingChangeOrders.reduce((sum, co) => sum + (co.amount || 0), 0)
    const changeOrderImpact = (changeOrderValue / project.budget) * 100
    budgetRisk = Math.min(100, budgetRisk + changeOrderImpact)
  }

  // Delay Risk Score (0-100)
  let delayRisk = 0
  const startDate = new Date(project.start_date)
  const endDate = new Date(project.end_date)
  const today = new Date()
  const totalDuration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  const elapsedDuration = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  const progressRate = project.budget > 0 ? project.actual_cost / project.budget : 0
  const timeRate = elapsedDuration / totalDuration

  if (timeRate > progressRate + 0.2) delayRisk = 80
  else if (timeRate > progressRate + 0.1) delayRisk = 60
  else if (timeRate > progressRate) delayRisk = 40
  else delayRisk = 20

  // Safety Risk Score (0-100)
  let safetyRisk = 0
  if (safetyIncidents.length === 0) {
    safetyRisk = 10 // Low baseline risk
  } else {
    const severeIncidents = safetyIncidents.filter(i =>
      i.severity === 'fatality' || i.severity === 'lost_time'
    ).length
    const mediumIncidents = safetyIncidents.filter(i =>
      i.severity === 'restricted_work' || i.severity === 'medical_treatment'
    ).length

    safetyRisk = Math.min(100, (severeIncidents * 30) + (mediumIncidents * 15) + 10)
  }

  // Quality Risk Score (0-100)
  let qualityRisk = 30 // Default medium risk
  const recentChangeOrders = changeOrders.filter(co => co.status !== 'cancelled').length
  if (recentChangeOrders > 10) qualityRisk = 70
  else if (recentChangeOrders > 5) qualityRisk = 50
  else if (recentChangeOrders > 2) qualityRisk = 30
  else qualityRisk = 15

  // Overall Risk Score (weighted average)
  const overall = (
    budgetRisk * 0.35 +
    delayRisk * 0.30 +
    safetyRisk * 0.20 +
    qualityRisk * 0.15
  )

  // Confidence Score
  const confidence = Math.min(95, 50 + (historicalProjects.length * 2) + (timeEntries.length / 10))

  return {
    overall: Math.round(overall * 100) / 100,
    delay: Math.round(delayRisk * 100) / 100,
    budget: Math.round(budgetRisk * 100) / 100,
    safety: Math.round(safetyRisk * 100) / 100,
    quality: Math.round(qualityRisk * 100) / 100,
    confidence: Math.round(confidence * 100) / 100
  }
}

function generateRiskFactors(
  project: ProjectData,
  riskScores: any,
  timeEntries: any[],
  safetyIncidents: any[],
  changeOrders: any[]
): any[] {
  const factors = []

  // Budget-related factors
  if (riskScores.budget > 50) {
    factors.push({
      factor_type: 'financial',
      factor_name: 'Budget Overrun Risk',
      description: `Project spending at ${((project.actual_cost / project.budget) * 100).toFixed(1)}% of budget`,
      impact_score: riskScores.budget,
      likelihood: riskScores.budget > 70 ? 80 : 60,
      mitigation_strategy: 'Review vendor contracts, reduce scope, or secure additional funding',
      is_mitigated: false
    })
  }

  // Change orders factor
  const pendingChangeOrders = changeOrders.filter(co => co.status === 'pending' || co.status === 'approved')
  if (pendingChangeOrders.length > 0) {
    const changeOrderValue = pendingChangeOrders.reduce((sum, co) => sum + (co.amount || 0), 0)
    factors.push({
      factor_type: 'financial',
      factor_name: 'Pending Change Orders',
      description: `${pendingChangeOrders.length} pending change orders worth $${changeOrderValue.toLocaleString()}`,
      impact_score: Math.min(80, (changeOrderValue / project.budget) * 100),
      likelihood: 70,
      mitigation_strategy: 'Expedite change order approvals and update budget forecasts',
      is_mitigated: false
    })
  }

  // Delay factors
  if (riskScores.delay > 50) {
    factors.push({
      factor_type: 'schedule',
      factor_name: 'Schedule Delay Risk',
      description: 'Project progress is behind schedule based on time vs cost analysis',
      impact_score: riskScores.delay,
      likelihood: riskScores.delay > 70 ? 75 : 55,
      mitigation_strategy: 'Increase crew size, optimize workflow, or adjust timeline',
      is_mitigated: false
    })
  }

  // Safety factors
  if (safetyIncidents.length > 0) {
    factors.push({
      factor_type: 'safety',
      factor_name: 'Safety Incidents',
      description: `${safetyIncidents.length} safety incident(s) recorded`,
      impact_score: riskScores.safety,
      likelihood: safetyIncidents.length > 3 ? 70 : 50,
      mitigation_strategy: 'Increase safety training, conduct more frequent inspections, review procedures',
      is_mitigated: false
    })
  }

  // Labor factors
  const recentTimeEntries = timeEntries.filter(te => {
    const entryDate = new Date(te.created_at)
    const daysAgo = (new Date().getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysAgo <= 7
  })

  if (recentTimeEntries.length < 5 && project.status === 'active') {
    factors.push({
      factor_type: 'labor',
      factor_name: 'Low Recent Activity',
      description: 'Fewer time entries than expected in the past week',
      impact_score: 40,
      likelihood: 60,
      mitigation_strategy: 'Verify crew assignments and address any staffing shortages',
      is_mitigated: false
    })
  }

  return factors
}

function generateRecommendations(riskScores: any, riskFactors: any[]): any[] {
  const recommendations = []

  // High budget risk recommendations
  if (riskScores.budget > 70) {
    recommendations.push({
      recommendation_type: 'action',
      priority: 'urgent',
      title: 'Immediate Budget Review Required',
      description: 'Schedule emergency meeting with project stakeholders to review budget and identify cost-cutting opportunities',
      expected_cost_savings: 0,
      expected_time_savings: 0,
      success_probability: 75,
      status: 'pending'
    })
  } else if (riskScores.budget > 50) {
    recommendations.push({
      recommendation_type: 'monitoring',
      priority: 'high',
      title: 'Increase Budget Monitoring Frequency',
      description: 'Implement daily budget reviews and require approval for all purchases over $1,000',
      expected_cost_savings: riskScores.budget * 100,
      expected_time_savings: 0,
      success_probability: 65,
      status: 'pending'
    })
  }

  // Delay risk recommendations
  if (riskScores.delay > 60) {
    recommendations.push({
      recommendation_type: 'resource',
      priority: 'high',
      title: 'Add Additional Crew Members',
      description: 'Consider adding 2-3 additional crew members to accelerate progress and meet deadlines',
      expected_cost_savings: 0,
      expected_time_savings: Math.round(riskScores.delay / 10),
      success_probability: 70,
      status: 'pending'
    })
  }

  // Safety recommendations
  if (riskScores.safety > 50) {
    recommendations.push({
      recommendation_type: 'action',
      priority: riskScores.safety > 70 ? 'urgent' : 'high',
      title: 'Enhanced Safety Training',
      description: 'Conduct immediate safety training and toolbox talks focusing on recent incident types',
      expected_cost_savings: 0,
      expected_time_savings: 0,
      success_probability: 80,
      status: 'pending'
    })
  }

  // General monitoring recommendation
  if (riskScores.overall > 40) {
    recommendations.push({
      recommendation_type: 'monitoring',
      priority: 'medium',
      title: 'Weekly Risk Assessment',
      description: 'Implement weekly risk assessment meetings to proactively identify and address emerging issues',
      expected_cost_savings: riskScores.overall * 50,
      expected_time_savings: 2,
      success_probability: 85,
      status: 'pending'
    })
  }

  return recommendations
}

function calculatePredictions(
  project: ProjectData,
  riskScores: any,
  historicalProjects: any[]
): {
  delay_days: number
  cost_overrun: number
  completion_date: string
} {
  // Calculate predicted delay based on risk score and historical data
  let predictedDelayDays = 0
  if (riskScores.delay > 70) predictedDelayDays = 30
  else if (riskScores.delay > 50) predictedDelayDays = 14
  else if (riskScores.delay > 30) predictedDelayDays = 7
  else predictedDelayDays = 0

  // Calculate predicted cost overrun
  let predictedCostOverrun = 0
  if (riskScores.budget > 70) {
    predictedCostOverrun = project.budget * 0.15
  } else if (riskScores.budget > 50) {
    predictedCostOverrun = project.budget * 0.08
  } else if (riskScores.budget > 30) {
    predictedCostOverrun = project.budget * 0.03
  }

  // Calculate predicted completion date
  const endDate = new Date(project.end_date)
  endDate.setDate(endDate.getDate() + predictedDelayDays)
  const completionDate = endDate.toISOString().split('T')[0]

  return {
    delay_days: predictedDelayDays,
    cost_overrun: Math.round(predictedCostOverrun * 100) / 100,
    completion_date: completionDate
  }
}

function getRiskLevel(score: number): string {
  if (score >= 75) return 'critical'
  if (score >= 50) return 'high'
  if (score >= 25) return 'medium'
  return 'low'
}

function generateAlerts(
  project: ProjectData,
  riskScores: any,
  tenant_id: string,
  project_id: string,
  risk_prediction_id: string
): any[] {
  const alerts = []

  // Budget alert
  if (riskScores.budget > 70) {
    alerts.push({
      tenant_id,
      project_id,
      risk_prediction_id,
      alert_type: 'budget_risk',
      severity: 'critical',
      title: 'Critical Budget Risk',
      message: `Project "${project.name}" is at ${riskScores.budget.toFixed(0)}% budget risk. Immediate action required.`,
      status: 'active'
    })
  } else if (riskScores.budget > 50) {
    alerts.push({
      tenant_id,
      project_id,
      risk_prediction_id,
      alert_type: 'budget_risk',
      severity: 'high',
      title: 'High Budget Risk',
      message: `Project "${project.name}" budget risk is ${riskScores.budget.toFixed(0)}%. Monitor closely.`,
      status: 'active'
    })
  }

  // Delay alert
  if (riskScores.delay > 60) {
    alerts.push({
      tenant_id,
      project_id,
      risk_prediction_id,
      alert_type: 'schedule_risk',
      severity: riskScores.delay > 75 ? 'critical' : 'high',
      title: 'Schedule Delay Risk',
      message: `Project "${project.name}" is at risk of delays. Current risk score: ${riskScores.delay.toFixed(0)}%`,
      status: 'active'
    })
  }

  // Safety alert
  if (riskScores.safety > 60) {
    alerts.push({
      tenant_id,
      project_id,
      risk_prediction_id,
      alert_type: 'safety_risk',
      severity: riskScores.safety > 75 ? 'critical' : 'high',
      title: 'Safety Risk Alert',
      message: `Project "${project.name}" has elevated safety risk (${riskScores.safety.toFixed(0)}%). Review safety protocols.`,
      status: 'active'
    })
  }

  return alerts
}
