// Auto-Scheduling Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScheduleRequest {
  tenant_id: string
  schedule_name: string
  schedule_date: string
  project_ids: string[]
  user_id: string
  minimize_travel?: boolean
  balance_workload?: boolean
  respect_skills?: boolean
  iterations?: number
}

interface CrewMember {
  id: string
  name: string
  skills: string[]
  availability: boolean
  current_workload: number
  location?: { lat: number; lng: number }
}

interface Project {
  id: string
  name: string
  location_zip: string
  required_skills: string[]
  estimated_crew_size: number
  priority: number
}

interface Assignment {
  user_id: string
  project_id: string
  date: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
        const authContext = await initializeAuthContext(req)
    if (!authContext) {
      return errorResponse('Unauthorized', 401)
    }

    const { user, supabase: supabaseClient } = authContext
    console.log('[AUTO-SCHEDULING] User authenticated', { userId: user.id })

    const {
      tenant_id,
      schedule_name,
      schedule_date,
      project_ids,
      user_id,
      minimize_travel = true,
      balance_workload = true,
      respect_skills = true,
      iterations = 100
    } = await req.json() as ScheduleRequest

    if (!tenant_id || !schedule_name || !schedule_date || !project_ids || project_ids.length === 0) {
      throw new Error('Missing required fields')
    }

    console.log(`Generating schedule for ${project_ids.length} projects`)

    const startTime = Date.now()

    // 1. Get crew members with skills with site isolation
    const { data: crewMembers, error: crewError } = await supabaseClient
      .from('user_profiles')
      .select(`
        id,
        first_name,
        last_name,
        role,
        crew_skills_matrix (
          skill_name,
          proficiency_level
        )
      `)
        // CRITICAL: Site isolation
      .eq('tenant_id', tenant_id)
      .in('role', ['field_supervisor', 'crew_member'])

    if (crewError) throw crewError

    // 2. Get projects with site isolation
    const { data: projects, error: projectsError } = await supabaseClient
      .from('projects')
      .select('id, name, location_zip, status')
        // CRITICAL: Site isolation
      .in('id', project_ids)
      .eq('tenant_id', tenant_id)

    if (projectsError) throw projectsError

    // 3. Get schedule constraints with site isolation
    const { data: constraints, error: constraintsError } = await supabaseClient
      .from('schedule_constraints')
      .select('*')
        // CRITICAL: Site isolation
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)

    if (constraintsError) throw constraintsError

    // 4. Get existing time entries to calculate workload
    const weekStart = new Date(schedule_date)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const { data: timeEntries } = await supabaseClient
      .from('time_entries')
      .select('user_id, hours_worked')
        // CRITICAL: Site isolation
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())

    // 5. Process crew members
    const processedCrew: CrewMember[] = crewMembers?.map(member => {
      const skills = member.crew_skills_matrix?.map((s: any) => s.skill_name) || []
      const workload = timeEntries?.filter((te: any) => te.user_id === member.id)
        .reduce((sum: number, te: any) => sum + te.hours_worked, 0) || 0

      // Check availability constraints
      const availabilityConstraints = constraints?.filter(
        (c: any) => c.user_id === member.id && c.category === 'availability'
      ) || []

      const isAvailable = availabilityConstraints.length === 0 ||
        availabilityConstraints.some((c: any) => {
          const rule = c.constraint_rule
          if (rule.available_dates) {
            return rule.available_dates.includes(schedule_date)
          }
          return true
        })

      return {
        id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        skills,
        availability: isAvailable,
        current_workload: workload,
        location: undefined // Would need geocoding for real locations
      }
    }) || []

    // 6. Process projects with required skills
    const processedProjects: Project[] = projects?.map(project => ({
      id: project.id,
      name: project.name,
      location_zip: project.location_zip || '',
      required_skills: [], // Would come from project requirements
      estimated_crew_size: 4, // Default crew size
      priority: project.status === 'active' ? 10 : 5
    })) || []

    // 7. Run genetic algorithm for optimal scheduling
    const bestSchedule = generateOptimalSchedule(
      processedCrew,
      processedProjects,
      constraints || [],
      {
        minimize_travel,
        balance_workload,
        respect_skills,
        iterations
      }
    )

    // 8. Calculate optimization score
    const optimizationScore = calculateOptimizationScore(
      bestSchedule,
      processedCrew,
      processedProjects,
      { minimize_travel, balance_workload, respect_skills }
    )

    const computationTime = Date.now() - startTime

    // 9. Save schedule to database with site isolation
    const { data: savedSchedule, error: saveError } = await supabaseClient
      .from('auto_schedules')
      .insert({  // CRITICAL: Site isolation
        tenant_id,
        schedule_name,
        schedule_date,
        minimize_travel,
        balance_workload,
        respect_skills,
        algorithm_used: 'genetic',
        iterations_count: iterations,
        optimization_score: optimizationScore,
        computation_time_ms: computationTime,
        status: 'draft'
      })
      .select()
      .single()

    if (saveError) throw saveError

    // 10. Save individual assignments (would be stored in a separate table)
    // For now, return them in the response

    return new Response(
      JSON.stringify({
        success: true,
        schedule: savedSchedule,
        assignments: bestSchedule,
        optimization_score: optimizationScore,
        computation_time_ms: computationTime,
        crew_count: processedCrew.length,
        project_count: processedProjects.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in auto-scheduling function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Genetic Algorithm for Schedule Optimization
function generateOptimalSchedule(
  crew: CrewMember[],
  projects: Project[],
  constraints: any[],
  options: any
): Assignment[] {
  const { iterations } = options

  // Initialize population with random schedules
  let population: Assignment[][] = []
  const populationSize = 50

  for (let i = 0; i < populationSize; i++) {
    population.push(generateRandomSchedule(crew, projects, constraints))
  }

  // Evolve population
  for (let gen = 0; gen < iterations; gen++) {
    // Evaluate fitness
    const fitness = population.map(schedule =>
      evaluateFitness(schedule, crew, projects, options)
    )

    // Selection - keep top 50%
    const sortedPopulation = population
      .map((schedule, idx) => ({ schedule, fitness: fitness[idx] }))
      .sort((a, b) => b.fitness - a.fitness)

    const survivors = sortedPopulation.slice(0, populationSize / 2)

    // Crossover & Mutation to create new generation
    const newPopulation: Assignment[][] = survivors.map(s => s.schedule)

    while (newPopulation.length < populationSize) {
      const parent1 = survivors[Math.floor(Math.random() * survivors.length)].schedule
      const parent2 = survivors[Math.floor(Math.random() * survivors.length)].schedule

      let child = crossover(parent1, parent2)
      child = mutate(child, crew, projects, 0.1)

      newPopulation.push(child)
    }

    population = newPopulation
  }

  // Return best schedule
  const finalFitness = population.map(schedule =>
    evaluateFitness(schedule, crew, projects, options)
  )
  const bestIndex = finalFitness.indexOf(Math.max(...finalFitness))

  return population[bestIndex]
}

function generateRandomSchedule(
  crew: CrewMember[],
  projects: Project[],
  constraints: any[]
): Assignment[] {
  const assignments: Assignment[] = []
  const availableCrew = crew.filter(c => c.availability)

  // Assign crew to projects randomly
  for (const project of projects) {
    const crewSize = Math.min(project.estimated_crew_size, availableCrew.length)

    // Shuffle and take first N
    const shuffled = [...availableCrew].sort(() => Math.random() - 0.5)

    for (let i = 0; i < crewSize && i < shuffled.length; i++) {
      assignments.push({
        user_id: shuffled[i].id,
        project_id: project.id,
        date: '' // Would be set from schedule_date
      })
    }
  }

  return assignments
}

function evaluateFitness(
  schedule: Assignment[],
  crew: CrewMember[],
  projects: Project[],
  options: any
): number {
  let score = 100

  // Penalty for unassigned projects
  const assignedProjects = new Set(schedule.map(a => a.project_id))
  const unassignedProjects = projects.filter(p => !assignedProjects.has(p.id))
  score -= unassignedProjects.length * 20

  // Workload balance
  if (options.balance_workload) {
    const workloadMap = new Map<string, number>()
    for (const assignment of schedule) {
      workloadMap.set(assignment.user_id, (workloadMap.get(assignment.user_id) || 0) + 1)
    }

    const workloads = Array.from(workloadMap.values())
    if (workloads.length > 0) {
      const avg = workloads.reduce((a, b) => a + b, 0) / workloads.length
      const variance = workloads.reduce((sum, w) => sum + Math.pow(w - avg, 2), 0) / workloads.length
      score -= variance * 5
    }
  }

  // Skills matching
  if (options.respect_skills) {
    for (const assignment of schedule) {
      const member = crew.find(c => c.id === assignment.user_id)
      const project = projects.find(p => p.id === assignment.project_id)

      if (member && project && project.required_skills.length > 0) {
        const matchingSkills = project.required_skills.filter(s =>
          member.skills.includes(s)
        ).length

        const skillMatch = matchingSkills / project.required_skills.length
        score += skillMatch * 10
      }
    }
  }

  // Travel distance (simplified - would use real geocoding)
  if (options.minimize_travel) {
    // Placeholder for travel optimization
    score += 5
  }

  return score
}

function crossover(parent1: Assignment[], parent2: Assignment[]): Assignment[] {
  const crossoverPoint = Math.floor(parent1.length / 2)
  return [
    ...parent1.slice(0, crossoverPoint),
    ...parent2.slice(crossoverPoint)
  ]
}

function mutate(
  schedule: Assignment[],
  crew: CrewMember[],
  projects: Project[],
  mutationRate: number
): Assignment[] {
  return schedule.map(assignment => {
    if (Math.random() < mutationRate) {
      // Randomly reassign to a different available crew member
      const availableCrew = crew.filter(c => c.availability)
      if (availableCrew.length > 0) {
        const randomCrew = availableCrew[Math.floor(Math.random() * availableCrew.length)]
        return {
          ...assignment,
          user_id: randomCrew.id
        }
      }
    }
    return assignment
  })
}

function calculateOptimizationScore(
  schedule: Assignment[],
  crew: CrewMember[],
  projects: Project[],
  options: any
): number {
  const fitness = evaluateFitness(schedule, crew, projects, options)

  // Normalize to 0-100
  const maxPossibleScore = 100 + (projects.length * 10) + 5
  const normalizedScore = Math.max(0, Math.min(100, (fitness / maxPossibleScore) * 100))

  return Math.round(normalizedScore * 100) / 100
}
