/**
 * Crew Presence Dashboard
 * Real-time view of crew locations and onsite status for supervisors
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MapPin,
  CheckCircle2,
  Clock,
  Users,
  Navigation,
  Search,
  RefreshCw,
  Loader2,
  Phone,
  Mail,
} from 'lucide-react';
import { useCrewGPSCheckin } from '@/hooks/useCrewGPSCheckin';
import { formatDistanceToNow } from 'date-fns';

const CrewPresenceDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');

  const {
    crewPresence,
    loadingPresence,
  } = useCrewGPSCheckin();

  // Calculate statistics
  const stats = {
    totalAssigned: crewPresence.length,
    onsite: crewPresence.filter((p) => p.is_onsite).length,
    enroute: crewPresence.filter((p) => p.presence_status === 'En Route').length,
    notCheckedIn: crewPresence.filter((p) => p.presence_status === 'Scheduled').length,
  };

  // Get unique projects for filter
  const projects = Array.from(
    new Set(crewPresence.map((p) => p.project_name))
  ).filter(Boolean);

  // Filter crew presence
  const filteredPresence = crewPresence.filter((p) => {
    const matchesSearch =
      p.crew_member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.project_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProject =
      selectedProject === 'all' || p.project_name === selectedProject;

    return matchesSearch && matchesProject;
  });

  // Group by presence status
  const onsiteCrew = filteredPresence.filter((p) => p.is_onsite);
  const enrouteCrew = filteredPresence.filter((p) => p.presence_status === 'En Route');
  const scheduledCrew = filteredPresence.filter((p) => p.presence_status === 'Scheduled');

  const formatDistance = (meters: number | null) => {
    if (meters === null) return '-';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const variants: Record<string, { variant: any; className?: string }> = {
      'On Site': { variant: 'default', className: 'bg-green-600' },
      'En Route': { variant: 'default', className: 'bg-blue-600' },
      'Scheduled': { variant: 'secondary' },
      'Completed': { variant: 'outline' },
    };

    const config = variants[status] || { variant: 'secondary' };

    return (
      <Badge variant={config.variant} className={config.className}>
        {status}
      </Badge>
    );
  };

  const CrewTable = ({ crew }: { crew: typeof crewPresence }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Crew Member</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Contact</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {crew.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              No crew members found
            </TableCell>
          </TableRow>
        ) : (
          crew.map((person) => (
            <TableRow key={person.assignment_id}>
              <TableCell>
                <div>
                  <div className="font-medium">{person.crew_member_name}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {person.crew_member_role}
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <div>
                  <div className="font-medium">{person.project_name}</div>
                  {person.project_location && (
                    <div className="text-sm text-muted-foreground">
                      {person.project_location}
                    </div>
                  )}
                </div>
              </TableCell>

              <TableCell>
                <StatusBadge status={person.presence_status} />
              </TableCell>

              <TableCell>
                {person.distance_from_site !== null ? (
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {formatDistance(person.distance_from_site)}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>

              <TableCell>
                {person.gps_checkin_timestamp ? (
                  <div className="text-sm">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      {formatDistanceToNow(new Date(person.gps_checkin_timestamp), {
                        addSuffix: true,
                      })}
                    </div>
                    {person.is_onsite && (
                      <div className="text-xs text-muted-foreground">
                        {person.hours_onsite.toFixed(1)}h onsite
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Not checked in</span>
                )}
              </TableCell>

              <TableCell>
                <div className="flex gap-2">
                  {person.crew_member_phone && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`tel:${person.crew_member_phone}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {person.crew_member_email && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`mailto:${person.crew_member_email}`}>
                        <Mail className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Crew Presence</h1>
        <p className="text-muted-foreground">Real-time crew location and status tracking</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssigned}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">On Site</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.onsite}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En Route</CardTitle>
            <Navigation className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.enroute}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Not Checked In</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.notCheckedIn}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search crew or project..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All ({filteredPresence.length})
          </TabsTrigger>
          <TabsTrigger value="onsite">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            On Site ({onsiteCrew.length})
          </TabsTrigger>
          <TabsTrigger value="enroute">
            <Navigation className="h-4 w-4 mr-2" />
            En Route ({enrouteCrew.length})
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            <Clock className="h-4 w-4 mr-2" />
            Scheduled ({scheduledCrew.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Crew Members</CardTitle>
                  <CardDescription>
                    {loadingPresence ? 'Loading...' : `${filteredPresence.length} crew members`}
                  </CardDescription>
                </div>
                {loadingPresence && (
                  <Loader2 className="h-5 w-5 animate-spin text-construction-orange" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CrewTable crew={filteredPresence} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onsite">
          <Card>
            <CardHeader>
              <CardTitle>Crew On Site</CardTitle>
              <CardDescription>Currently verified at job sites</CardDescription>
            </CardHeader>
            <CardContent>
              <CrewTable crew={onsiteCrew} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enroute">
          <Card>
            <CardHeader>
              <CardTitle>Crew En Route</CardTitle>
              <CardDescription>Dispatched but not yet checked in</CardDescription>
            </CardHeader>
            <CardContent>
              <CrewTable crew={enrouteCrew} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Crew</CardTitle>
              <CardDescription>Assigned but not yet dispatched</CardDescription>
            </CardHeader>
            <CardContent>
              <CrewTable crew={scheduledCrew} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Auto-refresh indicator */}
      <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
        <RefreshCw className="h-3 w-3" />
        Auto-refreshes every 30 seconds
      </div>
    </div>
  );
};

export default CrewPresenceDashboard;
