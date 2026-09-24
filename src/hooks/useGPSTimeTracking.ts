/**
 * GPS entries, geofences and travel logs for /admin/gps-tracking (US-266).
 *
 * Creating a geofence wrote the coordinates of New York City (40.7128,
 * -74.0060) for whatever address was typed, labelled "placeholder - would be
 * from geocoding", and no company_id; every site fence was a circle in
 * Manhattan that no clock-in could fall inside. The form takes the site's
 * latitude and longitude now and the row carries the company. The geofence
 * read is scoped by company_id like the geofence map's.
 *
 * Reads throw (they ran in sequence, so the first failure left the rest on
 * whatever they had), and writes select the row back.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface GPSTimeEntry {
  id: string;
  user_id: string;
  project_id: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_in_address: string | null;
  clock_in_timestamp: string;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  clock_out_address: string | null;
  clock_out_timestamp: string | null;
  is_within_geofence: boolean;
  geofence_distance_meters: number | null;
  total_distance_meters: number | null;
}

export interface Geofence {
  id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  address: string | null;
  is_active: boolean;
  auto_clock_in: boolean | null;
  auto_clock_out: boolean | null;
  total_clock_ins: number | null;
  total_clock_outs: number | null;
  total_breaches: number | null;
}

export interface TravelLog {
  id: string;
  user_id: string;
  start_address: string | null;
  end_address: string | null;
  distance_meters: number | null;
  duration_minutes: number | null;
  travel_method: string;
  status: string;
  is_billable: boolean;
  total_reimbursement: number | null;
  created_at: string;
}

export interface NewGeofence {
  name: string;
  address: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
}

export const gpsTrackingKey = (companyId: string | undefined) => ['gps-tracking', companyId] as const;

function requireRows(data: unknown[] | null, message: string) {
  if (!data || data.length === 0) throw new Error(message);
}

/** A reason the fence cannot be saved, or null. */
export function geofenceProblem(g: NewGeofence): string | null {
  if (!g.name.trim()) return 'Give the geofence a name.';
  if (!Number.isFinite(g.center_lat) || g.center_lat < -90 || g.center_lat > 90) return 'Latitude must be between -90 and 90.';
  if (!Number.isFinite(g.center_lng) || g.center_lng < -180 || g.center_lng > 180) return 'Longitude must be between -180 and 180.';
  if (!Number.isFinite(g.radius_meters) || g.radius_meters <= 0) return 'Radius must be a positive number of meters.';
  return null;
}

export async function fetchGPSTracking(
  companyId: string
): Promise<{ entries: GPSTimeEntry[]; geofences: Geofence[]; travelLogs: TravelLog[] }> {
  const [entries, geofences, travel] = await Promise.all([
    supabase.from('gps_time_entries').select('*').order('clock_in_timestamp', { ascending: false }).limit(50),
    supabase.from('geofences').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
    supabase.from('travel_logs').select('*').order('created_at', { ascending: false }).limit(50),
  ]);
  const failed = [entries, geofences, travel].find((r) => r.error)?.error;
  if (failed) throw failed;
  return {
    entries: (entries.data ?? []) as unknown as GPSTimeEntry[],
    geofences: (geofences.data ?? []) as unknown as Geofence[],
    travelLogs: (travel.data ?? []) as unknown as TravelLog[],
  };
}

export async function createGeofence(companyId: string, g: NewGeofence): Promise<void> {
  const problem = geofenceProblem(g);
  if (problem) throw new Error(problem);
  const { data, error } = await supabase
    .from('geofences')
    .insert({ ...g, name: g.name.trim(), company_id: companyId, is_active: true })
    .select('id');
  if (error) throw error;
  requireRows(data, 'The geofence was not created. You may not have permission to add geofences.');
}

export async function setGeofenceActive(id: string, isActive: boolean): Promise<void> {
  const { data, error } = await supabase.from('geofences').update({ is_active: isActive }).eq('id', id).select('id');
  if (error) throw error;
  requireRows(data, 'The geofence was not changed. You may not have permission to edit it.');
}

export function useGPSTimeTracking() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = gpsTrackingKey(companyId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchGPSTracking(companyId as string),
    enabled: !!companyId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const create = useMutation({
    mutationFn: (g: NewGeofence) => {
      if (!companyId) throw new Error('Your account is not linked to a company.');
      return createGeofence(companyId, g);
    },
    onSettled: invalidate,
  });
  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setGeofenceActive(id, isActive),
    onSettled: invalidate,
  });

  return {
    entries: query.data?.entries ?? [],
    geofences: query.data?.geofences ?? [],
    travelLogs: query.data?.travelLogs ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    create: (g: NewGeofence) => create.mutateAsync(g),
    setActive: (id: string, isActive: boolean) => setActive.mutateAsync({ id, isActive }),
  };
}
