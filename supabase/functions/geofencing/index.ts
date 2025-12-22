// Geofencing Calculation Service Edge Function
// Calculates distances, checks geofence breaches, and triggers alerts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface Point {
  lat: number
  lng: number
}

interface Geofence {
  id: string
  name: string
  center_lat: number
  center_lng: number
  radius_meters: number
  polygon_coords: Point[] | null
  type: 'circle' | 'polygon'
  project_id: string | null
  is_active: boolean
}

const logStep = (step: string, details?: any) => {
  console.log(`[GEOFENCING] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`)
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    // Initialize auth context
    const authContext = await initializeAuthContext(req)
    if (!authContext) {
      return errorResponse('Unauthorized - Missing or invalid authentication', 401)
    }

    const { user, supabase } = authContext
    logStep('User authenticated', { userId: user.id })

    const { action, ...params } = await req.json()

    switch (action) {
      case 'check_location':
        return await checkLocation(supabase, params)

      case 'calculate_distance':
        return calculateDistance(params)

      case 'check_geofence_breach':
        return await checkGeofenceBreach(supabase, params)

      case 'process_gps_entry':
        return await processGPSEntry(supabase, params)

      case 'calculate_travel_distance':
        return calculateTravelDistance(params)

      default:
        return errorResponse('Invalid action', 400)
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logStep('ERROR', { message: errorMessage })
    return errorResponse(errorMessage, 500)
  }
})

// Check if a location is within any active geofences
async function checkLocation(supabase: any, params: {
  lat: number
  lng: number
  user_id?: string
  project_id?: string
}) {
  const { lat, lng, user_id, project_id } = params

  // Get active geofences
  let query = supabase
    .from('geofences')
    .select('*')
    .eq('is_active', true)

  if (project_id) {
    query = query.or(`project_id.eq.${project_id},project_id.is.null`)
  }

  const { data: geofences, error } = await query

  if (error) throw error

  const results = []

  for (const geofence of geofences) {
    const isInside = geofence.type === 'circle'
      ? isPointInCircle({ lat, lng }, {
          lat: geofence.center_lat,
          lng: geofence.center_lng
        }, geofence.radius_meters)
      : isPointInPolygon({ lat, lng }, geofence.polygon_coords || [])

    const distance = calculateHaversineDistance(
      { lat, lng },
      { lat: geofence.center_lat, lng: geofence.center_lng }
    )

    results.push({
      geofence_id: geofence.id,
      geofence_name: geofence.name,
      is_inside: isInside,
      distance_meters: distance
    })
  }

  return successResponse({
    location: { lat, lng },
    geofences: results
  })
}

// Calculate distance between two points (no DB access needed)
function calculateDistance(params: {
  point1: Point
  point2: Point
}) {
  const { point1, point2 } = params

  const distanceMeters = calculateHaversineDistance(point1, point2)

  return successResponse({
    distance_meters: distanceMeters,
    distance_km: distanceMeters / 1000,
    distance_miles: distanceMeters / 1609.34
  })
}

// Check for geofence breaches
async function checkGeofenceBreach(supabase: any, params: {
  entry_id: string
  geofence_id: string
  lat: number
  lng: number
}) {
  const { entry_id, geofence_id, lat, lng } = params

  // Get geofence details
  const { data: geofence, error: geoError } = await supabase
    .from('geofences')
    .select('*')
    .eq('id', geofence_id)
    .single()

  if (geoError) throw geoError

  // Check if location is outside geofence
  const isInside = geofence.type === 'circle'
    ? isPointInCircle({ lat, lng }, {
        lat: geofence.center_lat,
        lng: geofence.center_lng
      }, geofence.radius_meters)
    : isPointInPolygon({ lat, lng }, geofence.polygon_coords || [])

  if (!isInside) {
    // Create breach alert
    const distance = calculateHaversineDistance(
      { lat, lng },
      { lat: geofence.center_lat, lng: geofence.center_lng }
    )

    await supabase
      .from('geofence_breach_alerts')
      .insert({
        geofence_id,
        time_entry_id: entry_id,
        breach_type: 'outside',
        distance_from_boundary_meters: distance - geofence.radius_meters,
        breach_timestamp: new Date().toISOString()
      })

    return successResponse({
      breach_detected: true,
      geofence_name: geofence.name,
      distance_from_center: distance,
      distance_from_boundary: distance - geofence.radius_meters
    })
  }

  return successResponse({
    breach_detected: false
  })
}

// Process GPS entry and calculate distances
async function processGPSEntry(supabase: any, params: {
  entry_id: string
  user_id: string
  project_id?: string
}) {
  const { entry_id, user_id, project_id } = params

  // Get the GPS entry
  const { data: entry, error: entryError } = await supabase
    .from('gps_time_entries')
    .select('*')
    .eq('id', entry_id)
    .single()

  if (entryError) throw entryError

  // Calculate distance traveled during shift
  if (entry.clock_out_lat && entry.clock_out_lng) {
    const travelDistance = calculateHaversineDistance(
      { lat: entry.clock_in_lat, lng: entry.clock_in_lng },
      { lat: entry.clock_out_lat, lng: entry.clock_out_lng }
    )

    // Update entry with calculated distance
    await supabase
      .from('gps_time_entries')
      .update({
        distance_traveled_meters: travelDistance
      })
      .eq('id', entry_id);
  }

  // Check geofence compliance if project is specified
  if (project_id) {
    const { data: geofences } = await supabase
      .from('geofences')
      .select('*')
      .eq('project_id', project_id)
      .eq('is_active', true)

    if (geofences && geofences.length > 0) {
      for (const geofence of geofences) {
        const isInGeofence = isPointInCircle(
          { lat: entry.clock_in_lat, lng: entry.clock_in_lng },
          { lat: geofence.center_lat, lng: geofence.center_lng },
          geofence.radius_meters
        )

        if (!isInGeofence) {
          // Create breach alert
          await supabase
            .from('geofence_breach_alerts')
            .insert({
              geofence_id: geofence.id,
              time_entry_id: entry_id,
              breach_type: 'clock_in_outside',
              breach_timestamp: entry.clock_in_time
            })
        }
      }
    }
  }

  return successResponse({
    entry_processed: true
  })
}

// Calculate total travel distance from location history (no DB access)
function calculateTravelDistance(params: {
  locations: Point[]
}) {
  const { locations } = params

  if (locations.length < 2) {
    return successResponse({
      total_distance_meters: 0,
      total_distance_km: 0,
      total_distance_miles: 0
    })
  }

  let totalDistance = 0

  for (let i = 1; i < locations.length; i++) {
    const distance = calculateHaversineDistance(locations[i - 1], locations[i])
    totalDistance += distance
  }

  return successResponse({
    total_distance_meters: totalDistance,
    total_distance_km: totalDistance / 1000,
    total_distance_miles: totalDistance / 1609.34,
    points_processed: locations.length
  })
}

// Haversine formula to calculate distance between two points on Earth
function calculateHaversineDistance(point1: Point, point2: Point): number {
  const R = 6371000 // Earth's radius in meters
  const lat1Rad = toRadians(point1.lat)
  const lat2Rad = toRadians(point2.lat)
  const deltaLatRad = toRadians(point2.lat - point1.lat)
  const deltaLngRad = toRadians(point2.lng - point1.lng)

  const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

// Check if point is inside circle
function isPointInCircle(point: Point, center: Point, radiusMeters: number): boolean {
  const distance = calculateHaversineDistance(point, center)
  return distance <= radiusMeters
}

// Check if point is inside polygon using ray casting algorithm
function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false

  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng
    const yi = polygon[i].lat
    const xj = polygon[j].lng
    const yj = polygon[j].lat

    const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
      (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi)

    if (intersect) inside = !inside
  }

  return inside
}

// Convert degrees to radians
function toRadians(degrees: number): number {
  return degrees * Math.PI / 180
}
