import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  ZoomIn,
  ZoomOut,
  Users,
  Clock,
  Navigation,
  Circle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  color: string;
  projectName: string;
}

interface CrewMember {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: 'onsite' | 'offsite' | 'en_route';
  lastUpdate: string;
}

interface CheckInEvent {
  id: string;
  crewMemberId: string;
  crewMemberName: string;
  type: 'check_in' | 'check_out';
  timestamp: string;
  geofenceName: string;
}

type GeofenceFormData = Omit<Geofence, 'id'>;

// ---------------------------------------------------------------------------
// Initial mock data
// ---------------------------------------------------------------------------

const INITIAL_GEOFENCES: Geofence[] = [
  {
    id: 'gf-1',
    name: 'Main Building',
    latitude: 34.052,
    longitude: -118.243,
    radius: 150,
    color: '#3b82f6',
    projectName: 'Downtown Office Complex',
  },
  {
    id: 'gf-2',
    name: 'Parking Structure',
    latitude: 34.054,
    longitude: -118.247,
    radius: 100,
    color: '#10b981',
    projectName: 'Downtown Office Complex',
  },
  {
    id: 'gf-3',
    name: 'Residential Phase 1',
    latitude: 34.048,
    longitude: -118.239,
    radius: 200,
    color: '#f59e0b',
    projectName: 'Sunset Ridge Homes',
  },
  {
    id: 'gf-4',
    name: 'Warehouse Retrofit',
    latitude: 34.056,
    longitude: -118.252,
    radius: 120,
    color: '#8b5cf6',
    projectName: 'Harbor Industrial Park',
  },
];

const INITIAL_CREW: CrewMember[] = [
  { id: 'cm-1', name: 'Mike Torres', latitude: 34.0525, longitude: -118.2435, status: 'onsite', lastUpdate: '2026-03-28T08:15:00Z' },
  { id: 'cm-2', name: 'Sarah Chen', latitude: 34.0535, longitude: -118.2465, status: 'onsite', lastUpdate: '2026-03-28T08:22:00Z' },
  { id: 'cm-3', name: 'James Wilson', latitude: 34.0485, longitude: -118.2395, status: 'onsite', lastUpdate: '2026-03-28T07:58:00Z' },
  { id: 'cm-4', name: 'Ana Rodriguez', latitude: 34.051, longitude: -118.25, status: 'en_route', lastUpdate: '2026-03-28T08:30:00Z' },
  { id: 'cm-5', name: 'David Kim', latitude: 34.057, longitude: -118.253, status: 'onsite', lastUpdate: '2026-03-28T08:05:00Z' },
  { id: 'cm-6', name: 'Lisa Patel', latitude: 34.06, longitude: -118.236, status: 'offsite', lastUpdate: '2026-03-28T07:45:00Z' },
];

const INITIAL_EVENTS: CheckInEvent[] = [
  { id: 'ev-1', crewMemberId: 'cm-1', crewMemberName: 'Mike Torres', type: 'check_in', timestamp: '2026-03-28T07:02:00Z', geofenceName: 'Main Building' },
  { id: 'ev-2', crewMemberId: 'cm-2', crewMemberName: 'Sarah Chen', type: 'check_in', timestamp: '2026-03-28T07:15:00Z', geofenceName: 'Parking Structure' },
  { id: 'ev-3', crewMemberId: 'cm-3', crewMemberName: 'James Wilson', type: 'check_in', timestamp: '2026-03-28T06:55:00Z', geofenceName: 'Residential Phase 1' },
  { id: 'ev-4', crewMemberId: 'cm-5', crewMemberName: 'David Kim', type: 'check_in', timestamp: '2026-03-28T07:10:00Z', geofenceName: 'Warehouse Retrofit' },
  { id: 'ev-5', crewMemberId: 'cm-6', crewMemberName: 'Lisa Patel', type: 'check_in', timestamp: '2026-03-28T06:45:00Z', geofenceName: 'Main Building' },
  { id: 'ev-6', crewMemberId: 'cm-6', crewMemberName: 'Lisa Patel', type: 'check_out', timestamp: '2026-03-28T07:40:00Z', geofenceName: 'Main Building' },
  { id: 'ev-7', crewMemberId: 'cm-4', crewMemberName: 'Ana Rodriguez', type: 'check_in', timestamp: '2026-03-28T06:30:00Z', geofenceName: 'Parking Structure' },
  { id: 'ev-8', crewMemberId: 'cm-4', crewMemberName: 'Ana Rodriguez', type: 'check_out', timestamp: '2026-03-28T08:25:00Z', geofenceName: 'Parking Structure' },
  { id: 'ev-9', crewMemberId: 'cm-1', crewMemberName: 'Mike Torres', type: 'check_out', timestamp: '2026-03-28T08:10:00Z', geofenceName: 'Main Building' },
  { id: 'ev-10', crewMemberId: 'cm-1', crewMemberName: 'Mike Torres', type: 'check_in', timestamp: '2026-03-28T08:14:00Z', geofenceName: 'Main Building' },
];

const GEOFENCE_COLORS = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ef4444', label: 'Red' },
  { value: '#06b6d4', label: 'Cyan' },
];

// ---------------------------------------------------------------------------
// Coordinate mapping helpers
// ---------------------------------------------------------------------------

const SVG_WIDTH = 600;
const SVG_HEIGHT = 400;

interface ViewBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

function computeViewBox(
  geofences: Geofence[],
  crew: CrewMember[],
): ViewBox {
  const allLats = [
    ...geofences.map((g) => g.latitude),
    ...crew.map((c) => c.latitude),
  ];
  const allLngs = [
    ...geofences.map((g) => g.longitude),
    ...crew.map((c) => c.longitude),
  ];

  if (allLats.length === 0) {
    return { minLat: 34.04, maxLat: 34.06, minLng: -118.26, maxLng: -118.23 };
  }

  const minLat = Math.min(...allLats);
  const maxLat = Math.max(...allLats);
  const minLng = Math.min(...allLngs);
  const maxLng = Math.max(...allLngs);

  const latPad = Math.max((maxLat - minLat) * 0.25, 0.003);
  const lngPad = Math.max((maxLng - minLng) * 0.25, 0.005);

  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  };
}

function toSvg(
  lat: number,
  lng: number,
  vb: ViewBox,
  zoom: number,
): { x: number; y: number } {
  const x = ((lng - vb.minLng) / (vb.maxLng - vb.minLng)) * SVG_WIDTH;
  // Flip Y: higher lat = lower SVG y
  const y = (1 - (lat - vb.minLat) / (vb.maxLat - vb.minLat)) * SVG_HEIGHT;

  const cx = SVG_WIDTH / 2;
  const cy = SVG_HEIGHT / 2;

  return {
    x: cx + (x - cx) * zoom,
    y: cy + (y - cy) * zoom,
  };
}

function radiusToSvg(meters: number, vb: ViewBox, zoom: number): number {
  // Approximate: 1 degree latitude ~ 111,320 m
  const degreesPerMeter = 1 / 111320;
  const degreeSpan = vb.maxLat - vb.minLat;
  const fraction = (meters * degreesPerMeter) / degreeSpan;
  return fraction * SVG_HEIGHT * zoom;
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  CrewMember['status'],
  { label: string; dotColor: string; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  onsite: { label: 'On Site', dotColor: '#22c55e', badgeVariant: 'default' },
  en_route: { label: 'En Route', dotColor: '#f59e0b', badgeVariant: 'secondary' },
  offsite: { label: 'Off Site', dotColor: '#94a3b8', badgeVariant: 'outline' },
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Empty form state
// ---------------------------------------------------------------------------

const EMPTY_FORM: GeofenceFormData = {
  name: '',
  latitude: 34.052,
  longitude: -118.245,
  radius: 100,
  color: '#3b82f6',
  projectName: '',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const GeofenceVisualizationMap: React.FC = () => {
  const [geofences, setGeofences] = useState<Geofence[]>(INITIAL_GEOFENCES);
  const [crewMembers] = useState<CrewMember[]>(INITIAL_CREW);
  const [checkInEvents] = useState<CheckInEvent[]>(INITIAL_EVENTS);

  const [zoom, setZoom] = useState(1);
  const [hoveredCrew, setHoveredCrew] = useState<string | null>(null);
  const [selectedGeofence, setSelectedGeofence] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<GeofenceFormData>(EMPTY_FORM);

  const viewBox = computeViewBox(geofences, crewMembers);

  // ------ Zoom ------
  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.25, 3)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.25, 0.5)), []);

  // ------ CRUD ------
  const openAddDialog = useCallback(() => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback(
    (geofence: Geofence) => {
      setEditingId(geofence.id);
      setFormData({
        name: geofence.name,
        latitude: geofence.latitude,
        longitude: geofence.longitude,
        radius: geofence.radius,
        color: geofence.color,
        projectName: geofence.projectName,
      });
      setDialogOpen(true);
    },
    [],
  );

  const handleDelete = useCallback((id: string) => {
    setGeofences((prev) => prev.filter((g) => g.id !== id));
    setSelectedGeofence((prev) => (prev === id ? null : prev));
  }, []);

  const handleSave = useCallback(() => {
    if (!formData.name.trim() || !formData.projectName.trim()) return;

    if (editingId) {
      setGeofences((prev) =>
        prev.map((g) => (g.id === editingId ? { ...g, ...formData } : g)),
      );
    } else {
      const newGeofence: Geofence = {
        id: `gf-${Date.now()}`,
        ...formData,
      };
      setGeofences((prev) => [...prev, newGeofence]);
    }
    setDialogOpen(false);
  }, [editingId, formData]);

  const updateField = useCallback(
    <K extends keyof GeofenceFormData>(key: K, value: GeofenceFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // ------ Sorted events (most recent first) ------
  const sortedEvents = [...checkInEvents].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  // ------ Render ------
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Navigation className="h-5 w-5" />
            Geofence Visualization Map
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Circle className="h-3 w-3" />
              {geofences.length} Zones
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {crewMembers.filter((c) => c.status === 'onsite').length} On Site
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {/* Toolbar */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleZoomIn} aria-label="Zoom in">
                <ZoomIn className="mr-1 h-4 w-4" /> Zoom In
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomOut} aria-label="Zoom out">
                <ZoomOut className="mr-1 h-4 w-4" /> Zoom Out
              </Button>
              <span className="ml-2 text-xs text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <Button size="sm" onClick={openAddDialog}>
              <Plus className="mr-1 h-4 w-4" /> Add Geofence
            </Button>
          </div>

          {/* SVG Map */}
          <div className="overflow-hidden rounded-lg border bg-slate-50 dark:bg-slate-900">
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="w-full"
              role="img"
              aria-label="Geofence map showing job site boundaries and crew locations"
            >
              {/* Grid lines */}
              {Array.from({ length: 7 }).map((_, i) => {
                const x = (SVG_WIDTH / 6) * i;
                return (
                  <line
                    key={`vg-${i}`}
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={SVG_HEIGHT}
                    stroke="currentColor"
                    strokeOpacity={0.06}
                  />
                );
              })}
              {Array.from({ length: 5 }).map((_, i) => {
                const y = (SVG_HEIGHT / 4) * i;
                return (
                  <line
                    key={`hg-${i}`}
                    x1={0}
                    y1={y}
                    x2={SVG_WIDTH}
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity={0.06}
                  />
                );
              })}

              {/* Geofence circles */}
              {geofences.map((gf) => {
                const pos = toSvg(gf.latitude, gf.longitude, viewBox, zoom);
                const r = radiusToSvg(gf.radius, viewBox, zoom);
                const isSelected = selectedGeofence === gf.id;

                return (
                  <g
                    key={gf.id}
                    onClick={() =>
                      setSelectedGeofence(isSelected ? null : gf.id)
                    }
                    className="cursor-pointer"
                  >
                    {/* Boundary circle */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={r}
                      fill={gf.color}
                      fillOpacity={isSelected ? 0.25 : 0.12}
                      stroke={gf.color}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      strokeDasharray={isSelected ? 'none' : '6 3'}
                    />
                    {/* Center dot */}
                    <circle cx={pos.x} cy={pos.y} r={3} fill={gf.color} />
                    {/* Label */}
                    <text
                      x={pos.x}
                      y={pos.y - r - 6}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={600}
                      fill={gf.color}
                    >
                      {gf.name}
                    </text>
                    <text
                      x={pos.x}
                      y={pos.y - r + 8}
                      textAnchor="middle"
                      fontSize={9}
                      fill={gf.color}
                      fillOpacity={0.7}
                    >
                      {gf.radius}m radius
                    </text>
                  </g>
                );
              })}

              {/* Crew member pins */}
              {crewMembers.map((cm) => {
                const pos = toSvg(cm.latitude, cm.longitude, viewBox, zoom);
                const cfg = STATUS_CONFIG[cm.status];
                const isHovered = hoveredCrew === cm.id;

                return (
                  <g
                    key={cm.id}
                    onMouseEnter={() => setHoveredCrew(cm.id)}
                    onMouseLeave={() => setHoveredCrew(null)}
                    className="cursor-pointer"
                  >
                    {/* Outer ring on hover */}
                    {isHovered && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={10}
                        fill="none"
                        stroke={cfg.dotColor}
                        strokeWidth={1.5}
                        strokeOpacity={0.5}
                      />
                    )}
                    {/* Pin dot */}
                    <circle cx={pos.x} cy={pos.y} r={5} fill={cfg.dotColor} stroke="#fff" strokeWidth={1.5} />

                    {/* Tooltip */}
                    {isHovered && (
                      <>
                        <rect
                          x={pos.x + 10}
                          y={pos.y - 22}
                          width={Math.max(cm.name.length * 7 + 16, 80)}
                          height={32}
                          rx={4}
                          fill="#1e293b"
                          fillOpacity={0.92}
                        />
                        <text x={pos.x + 18} y={pos.y - 8} fontSize={10} fontWeight={600} fill="#fff">
                          {cm.name}
                        </text>
                        <text x={pos.x + 18} y={pos.y + 4} fontSize={8} fill="#94a3b8">
                          {cfg.label} - {formatTime(cm.lastUpdate)}
                        </text>
                      </>
                    )}

                    {/* Name label (always visible) */}
                    {!isHovered && (
                      <text x={pos.x + 8} y={pos.y + 4} fontSize={9} fill="currentColor" fillOpacity={0.7}>
                        {cm.name.split(' ')[0]}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
              On Site
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
              En Route
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#94a3b8' }} />
              Off Site
            </span>
            <span className="ml-auto">Click a geofence zone to select it</span>
          </div>
        </CardContent>
      </Card>

      {/* Bottom row: Geofence List + Check-in Events */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Geofence management list */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" /> Geofence Zones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {geofences.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No geofences configured. Click "Add Geofence" to create one.
              </p>
            )}
            {geofences.map((gf) => (
              <div
                key={gf.id}
                className={`flex items-center justify-between rounded-md border p-2 transition-colors ${
                  selectedGeofence === gf.id ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span
                    className="inline-block h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: gf.color }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{gf.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {gf.projectName} &middot; {gf.radius}m
                    </p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEditDialog(gf)}
                    aria-label={`Edit ${gf.name}`}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(gf.id)}
                    aria-label={`Delete ${gf.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Check-in / check-out events */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" /> Recent Check-in Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
              {sortedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
                >
                  <Badge
                    variant={ev.type === 'check_in' ? 'default' : 'destructive'}
                    className="flex-shrink-0 text-[10px]"
                  >
                    {ev.type === 'check_in' ? 'IN' : 'OUT'}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {ev.crewMemberName}
                  </span>
                  <span className="flex-shrink-0 text-xs text-muted-foreground">
                    {ev.geofenceName}
                  </span>
                  <span className="flex-shrink-0 text-xs text-muted-foreground">
                    {formatTime(ev.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Geofence' : 'Add Geofence'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="gf-name">Zone Name</Label>
              <Input
                id="gf-name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Main Building"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gf-project">Project Name</Label>
              <Input
                id="gf-project"
                value={formData.projectName}
                onChange={(e) => updateField('projectName', e.target.value)}
                placeholder="e.g. Downtown Office Complex"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="gf-lat">Latitude</Label>
                <Input
                  id="gf-lat"
                  type="number"
                  step="0.001"
                  value={formData.latitude}
                  onChange={(e) => updateField('latitude', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gf-lng">Longitude</Label>
                <Input
                  id="gf-lng"
                  type="number"
                  step="0.001"
                  value={formData.longitude}
                  onChange={(e) => updateField('longitude', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="gf-radius">Radius (meters)</Label>
                <Input
                  id="gf-radius"
                  type="number"
                  min={10}
                  max={1000}
                  value={formData.radius}
                  onChange={(e) => updateField('radius', parseInt(e.target.value, 10) || 100)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gf-color">Color</Label>
                <Select
                  value={formData.color}
                  onValueChange={(val) => updateField('color', val)}
                >
                  <SelectTrigger id="gf-color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GEOFENCE_COLORS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: c.value }}
                          />
                          {c.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.name.trim() || !formData.projectName.trim()}
              >
                {editingId ? 'Save Changes' : 'Add Zone'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GeofenceVisualizationMap;
