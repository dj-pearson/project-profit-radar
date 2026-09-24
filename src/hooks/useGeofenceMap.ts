/**
 * Geofences and today's crew positions for the geofence map (US-266, US-367).
 *
 * The page read these in a useCallback and re-ran it after every write. The
 * writes did not read back, so an update or removal RLS filtered to zero rows
 * toasted "Geofence updated" and left the circle where it was. Every write now
 * selects its row back and throws when none came back; the query is
 * invalidated after each write.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { buildCrewMarkers, TIME_ENTRY_MAP_COLUMNS, type CrewMarker, type TimeEntryLite } from '@/lib/geofence-markers';

export interface Geofence {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
}

export interface GeofenceMapData {
  geofences: Geofence[];
  crew: CrewMarker[];
}

export const geofenceMapKey = (companyId: string | undefined) => ['geofence-map', companyId] as const;

export async function fetchGeofenceMap(companyId: string, now: Date = new Date()): Promise<GeofenceMapData> {
  const { data: gfData, error: gfErr } = await supabase
    .from('geofences')
    .select('id, name, center_lat, center_lng, radius_meters')
    .eq('company_id', companyId)
    .eq('is_active', true);
  if (gfErr) throw gfErr;

  // Crew markers from today's time entries (scoped to company users). A
  // failed read throws rather than rendering "no one on site".
  const { data: members, error: membersErr } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name')
    .eq('company_id', companyId);
  if (membersErr) throw membersErr;
  const nameById = new Map<string, string>();
  (members ?? []).forEach((m) =>
    nameById.set(m.id, `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || 'Crew')
  );
  const ids = Array.from(nameById.keys());
  let crew: CrewMarker[] = [];
  if (ids.length) {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    // US-367: time_entries is what the clock-in paths write; its GPS fix
    // lives in gps_latitude/gps_longitude and the shift in start_time/end_time.
    const { data: entries, error: entriesErr } = await supabase
      .from('time_entries')
      .select(TIME_ENTRY_MAP_COLUMNS)
      .in('user_id', ids)
      .gte('start_time', startOfDay.toISOString());
    if (entriesErr) throw entriesErr;
    crew = buildCrewMarkers((entries ?? []) as TimeEntryLite[], nameById);
  }
  return { geofences: (gfData as Geofence[]) ?? [], crew };
}

export interface NewGeofence {
  name: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
}

export async function createGeofenceAt(companyId: string, g: NewGeofence): Promise<void> {
  const { data, error } = await supabase
    .from('geofences')
    .insert([{ ...g, company_id: companyId, is_active: true }])
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('The geofence was not saved.');
}

export async function updateGeofence(
  companyId: string,
  id: string,
  patch: { radius_meters?: number; is_active?: boolean },
): Promise<void> {
  const { data, error } = await supabase
    .from('geofences')
    .update(patch)
    .eq('id', id)
    .eq('company_id', companyId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('No geofence was changed. It may have been removed, or you may not have permission.');
  }
}

export function useGeofenceMap() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: geofenceMapKey(companyId),
    queryFn: () => fetchGeofenceMap(companyId as string),
    enabled: !!companyId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: geofenceMapKey(companyId) });
  const need = () => {
    if (!companyId) throw new Error('Your profile is not linked to a company.');
    return companyId;
  };

  const create = useMutation({
    mutationFn: (g: NewGeofence) => createGeofenceAt(need(), g),
    onSettled: invalidate,
  });
  const update = useMutation({
    mutationFn: (v: { id: string; patch: { radius_meters?: number; is_active?: boolean } }) =>
      updateGeofence(need(), v.id, v.patch),
    onSettled: invalidate,
  });

  return { companyId, query, create, update };
}
