import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Plus, Trash2, Save, X } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useGeofenceMap, type Geofence } from '@/hooks/useGeofenceMap';
import type { CrewMarker } from '@/lib/geofence-markers';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { ErrorState } from '@/components/ui/states';

// Stable empties so the overlay effect does not redraw on every render.
const EMPTY_GEOFENCES: Geofence[] = [];
const EMPTY_CREW: CrewMarker[] = [];

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795]; // geographic center of US

export default function GeofenceMap() {
  const map = useGeofenceMap();
  const companyId = map.companyId;
  const geofences = map.query.data?.geofences ?? EMPTY_GEOFENCES;
  const crew = map.query.data?.crew ?? EMPTY_CREW;
  const busy = map.create.isPending || map.update.isPending;
  // Cover the map instead of letting an empty one read as "no crew on site".
  const loadError = map.query.error ? 'Could not load geofences and crew locations.' : null;
  const loadData = () => { void map.query.refetch(); };

  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<L.LayerGroup | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Add-geofence flow
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<{ lat: number; lng: number } | null>(null);
  const [newName, setNewName] = useState('');
  const [newRadius, setNewRadius] = useState('100');
  const addingRef = useRef(adding);
  addingRef.current = adding;

  // Edit radius for selected
  const [editRadius, setEditRadius] = useState('');

  useEffect(() => {
    if (map.query.error) logger.error('Failed to load geofence map data', map.query.error as Error);
  }, [map.query.error]);

  // Initialize the map once.
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current).setView(DEFAULT_CENTER, 4);

    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    });
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; Esri', maxZoom: 19 }
    );
    street.addTo(map);
    L.control.layers({ Street: street, Satellite: satellite }).addTo(map);

    overlayRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (addingRef.current) {
        setPending({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  // Redraw overlays whenever data / selection / pending changes.
  useEffect(() => {
    const map = mapRef.current;
    const layer = overlayRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const bounds: L.LatLngExpression[] = [];

    for (const g of geofences) {
      const selected = g.id === selectedId;
      const circle = L.circle([g.center_lat, g.center_lng], {
        radius: g.radius_meters,
        color: selected ? '#f59e0b' : '#3b82f6',
        weight: 2,
        fillOpacity: 0.12,
      })
        .bindTooltip(`${g.name} (${g.radius_meters}m)`)
        .on('click', () => {
          setSelectedId(g.id);
          setEditRadius(String(g.radius_meters));
        });
      circle.addTo(layer);
      bounds.push([g.center_lat, g.center_lng]);
    }

    const colorFor = (k: CrewMarker['kind']) => (k === 'onsite' ? '#2563eb' : '#22c55e');
    for (const m of crew) {
      L.circleMarker([m.lat, m.lng], {
        radius: m.kind === 'onsite' ? 8 : 6,
        color: colorFor(m.kind),
        fillColor: colorFor(m.kind),
        fillOpacity: 0.9,
      })
        .bindTooltip(m.label)
        .addTo(layer);
      bounds.push([m.lat, m.lng]);
    }

    if (pending) {
      L.circle([pending.lat, pending.lng], {
        radius: Number(newRadius) || 100,
        color: '#10b981',
        dashArray: '6',
        fillOpacity: 0.1,
      }).addTo(layer);
      bounds.push([pending.lat, pending.lng]);
    }

    if (bounds.length > 0 && !pending) {
      try {
        map.fitBounds(L.latLngBounds(bounds).pad(0.3), { maxZoom: 16 });
      } catch {
        /* single point / invalid bounds — ignore */
      }
    }
  }, [geofences, crew, selectedId, pending, newRadius]);

  const saveNewGeofence = async () => {
    if (!pending || !companyId) return;
    if (!newName.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    const rad = Number(newRadius);
    if (!(rad >= 10 && rad <= 10000)) {
      toast({ title: 'Radius must be 10-10000 m', variant: 'destructive' });
      return;
    }
    try {
      await map.create.mutateAsync({
        name: newName.trim(),
        center_lat: pending.lat,
        center_lng: pending.lng,
        radius_meters: rad,
      });
      toast({ title: 'Geofence added' });
      setAdding(false);
      setPending(null);
      setNewName('');
      setNewRadius('100');
    } catch (err) {
      logger.error('Add geofence failed', err as Error);
      toast({ title: 'Could not add geofence', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const saveEdit = async () => {
    if (!selectedId || !companyId) return;
    const rad = Number(editRadius);
    if (!(rad >= 10 && rad <= 10000)) {
      toast({ title: 'Radius must be 10-10000 m', variant: 'destructive' });
      return;
    }
    try {
      await map.update.mutateAsync({ id: selectedId, patch: { radius_meters: rad } });
      toast({ title: 'Geofence updated' });
    } catch (err) {
      logger.error('Edit geofence failed', err as Error);
      toast({ title: 'Could not update geofence', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const deleteSelected = async () => {
    if (!selectedId || !companyId) return;
    try {
      await map.update.mutateAsync({ id: selectedId, patch: { is_active: false } });
      toast({ title: 'Geofence removed' });
      setSelectedId(null);
    } catch (err) {
      logger.error('Delete geofence failed', err as Error);
      toast({ title: 'Could not remove geofence', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const selected = geofences.find((g) => g.id === selectedId) ?? null;

  return (
    <AccessiblePageWrapper pageTitle="Geofence Map">
      <DashboardLayout title="Geofence Map" hasAccessibleWrapper>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="relative p-0">
                <div ref={containerRef} className="h-[600px] w-full rounded-lg" role="application" aria-label="Geofence map" />
                {loadError && (
                  // Cover the map instead of letting an empty one read as "no crew on site".
                  // z-[1000] sits above Leaflet's panes and controls.
                  <div className="absolute inset-0 z-[1000] flex items-center justify-center rounded-lg bg-background/90">
                    <ErrorState error={loadError} onRetry={loadData} />
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Geofence</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Clocked in, shift ended</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> On site</span>
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Geofences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {adding ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {pending ? 'Adjust the details and save.' : 'Click the map to place the center.'}
                    </p>
                    <div>
                      <Label htmlFor="gf-name">Name</Label>
                      <Input id="gf-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Job site" />
                    </div>
                    <div>
                      <Label htmlFor="gf-radius">Radius (m)</Label>
                      <Input id="gf-radius" type="number" value={newRadius} onChange={(e) => setNewRadius(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveNewGeofence} disabled={busy || !pending}>
                        <Save className="mr-1 h-3.5 w-3.5" /> Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setAdding(false); setPending(null); }}>
                        <X className="mr-1 h-3.5 w-3.5" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => { setAdding(true); setSelectedId(null); }}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add geofence
                  </Button>
                )}

                <div className="space-y-1">
                  {geofences.length === 0 && <p className="text-sm text-muted-foreground">No geofences yet.</p>}
                  {geofences.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => { setSelectedId(g.id); setEditRadius(String(g.radius_meters)); }}
                      className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted ${g.id === selectedId ? 'bg-muted' : ''}`}
                    >
                      <span className="flex items-center gap-1.5 truncate"><MapPin className="h-3.5 w-3.5 text-primary" /> {g.name}</span>
                      <Badge variant="outline">{g.radius_meters}m</Badge>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selected && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base truncate">{selected.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label htmlFor="gf-edit-radius">Radius (m)</Label>
                    <Input id="gf-edit-radius" type="number" value={editRadius} onChange={(e) => setEditRadius(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} disabled={busy}>
                      <Save className="mr-1 h-3.5 w-3.5" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={deleteSelected} disabled={busy}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DashboardLayout>
    </AccessiblePageWrapper>
  );
}
