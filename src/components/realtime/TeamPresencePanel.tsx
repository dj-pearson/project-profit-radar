import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Users,
  MapPin,
  Filter,
  Search,
  MessageCircle,
  Phone,
  Settings,
  Circle,
  Clock,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserPresence, useSimplePresence } from '@/hooks/useSimplePresence';
import { UserPresenceIndicator } from './UserPresenceIndicator';

interface TeamPresencePanelProps {
  projectId?: string;
  showControls?: boolean;
  compact?: boolean;
}

export const TeamPresencePanel: React.FC<TeamPresencePanelProps> = ({
  projectId,
  showControls = true,
  compact = false
}) => {
  const {
    presenceData,
    myPresence,
    isLoading,
    updatePresence,
    getOnlineUsers,
    getAwayUsers,
    getBusyUsers,
    getUsersAtLocation
  } = useSimplePresence(projectId);

  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter presence data based on search and filters
  const filteredPresenceData = presenceData.filter(presence => {
    const matchesSearch = searchQuery === '' || 
      `${presence.user_profile?.first_name} ${presence.user_profile?.last_name}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
        
    const matchesLocation = locationFilter === 'all' || presence.location === locationFilter;
    const matchesStatus = statusFilter === 'all' || presence.status === statusFilter;

    return matchesSearch && matchesLocation && matchesStatus;
  });

  // Group users by status
  const onlineUsers = getOnlineUsers();
  const awayUsers = getAwayUsers();
  const busyUsers = getBusyUsers();

  // Get unique locations
  const uniqueLocations = [...new Set(presenceData.map(p => p.location).filter(Boolean))];

  const handleStatusUpdate = async (status: 'online' | 'away' | 'busy') => {
    await updatePresence(status, myPresence?.location);
  };

  const handleLocationUpdate = async (location: string) => {
    await updatePresence(myPresence?.status || 'online', location);
  };

  const handleMessageUser = (userId: string) => {
    // TODO: Open chat/messaging interface
  };

  const StatusSummary = () => (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Circle className="h-4 w-4 text-green-500" />
          <span className="font-semibold text-green-600">{onlineUsers.length}</span>
        </div>
        <p className="text-xs text-muted-foreground">Online</p>
      </div>
      
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Clock className="h-4 w-4 text-yellow-500" />
          <span className="font-semibold text-yellow-600">{awayUsers.length}</span>
        </div>
        <p className="text-xs text-muted-foreground">Away</p>
      </div>
      
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Minus className="h-4 w-4 text-red-500" />
          <span className="font-semibold text-red-600">{busyUsers.length}</span>
        </div>
        <p className="text-xs text-muted-foreground">Busy</p>
      </div>
    </div>
  );

  const MyStatusControls = () => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">My Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Status
          </label>
          <Select
            value={myPresence?.status || 'offline'}
            onValueChange={handleStatusUpdate}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="online">
                <div className="flex items-center gap-2">
                  <Circle className="h-3 w-3 text-green-500" />
                  Online
                </div>
              </SelectItem>
              <SelectItem value="away">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-yellow-500" />
                  Away
                </div>
              </SelectItem>
              <SelectItem value="busy">
                <div className="flex items-center gap-2">
                  <Minus className="h-3 w-3 text-red-500" />
                  Busy
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Location (Optional)
          </label>
          <Input
            placeholder="e.g., Main Office, Job Site A"
            value={myPresence?.location || ''}
            onChange={(e) => handleLocationUpdate(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );

  const FilterControls = () => (
    <div className="space-y-3 mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search team members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="away">Away</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
          </SelectContent>
        </Select>

        {uniqueLocations.length > 0 && (
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {uniqueLocations.map((location) => (
                <SelectItem key={location} value={location!}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );

  const UsersList = ({ users, title }: { users: typeof presenceData; title: string }) => (
    <div className="space-y-2">
      {title && (
        <h4 className="font-medium text-sm text-muted-foreground mb-3">{title}</h4>
      )}
      {users.map((presence) => (
        <UserPresenceIndicator
          key={presence.id}
          presence={presence}
          showDetails
          onMessageUser={() => handleMessageUser(presence.user_id)}
        />
      ))}
    </div>
  );

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Team ({presenceData.length})</CardTitle>
            <Badge variant="outline">
              {onlineUsers.length} online
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {presenceData.slice(0, 5).map((presence) => (
              <UserPresenceIndicator
                key={presence.id}
                presence={presence}
                size="sm"
              />
            ))}
            {presenceData.length > 5 && (
              <p className="text-xs text-muted-foreground mt-2">
                +{presenceData.length - 5} more
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Team Presence</h2>
          <p className="text-sm text-muted-foreground">
            {presenceData.length} team members • {onlineUsers.length} online
          </p>
        </div>
        
        {showControls && (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        )}
      </div>

      <StatusSummary />

      {showControls && <MyStatusControls />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
          {projectId && (
            <CardDescription>
              Showing presence for project team
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {showControls && <FilterControls />}

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading team presence...</p>
            </div>
          ) : filteredPresenceData.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No team members found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Try adjusting your search criteria' : 'Team members will appear here when they come online'}
              </p>
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All ({filteredPresenceData.length})</TabsTrigger>
                <TabsTrigger value="online">Online ({onlineUsers.length})</TabsTrigger>
                <TabsTrigger value="away">Away ({awayUsers.length})</TabsTrigger>
                <TabsTrigger value="busy">Busy ({busyUsers.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <UsersList users={filteredPresenceData} title="" />
              </TabsContent>

              <TabsContent value="online" className="mt-4">
                <UsersList 
                  users={filteredPresenceData.filter(p => p.status === 'online')} 
                  title="" 
                />
              </TabsContent>

              <TabsContent value="away" className="mt-4">
                <UsersList 
                  users={filteredPresenceData.filter(p => p.status === 'away')} 
                  title="" 
                />
              </TabsContent>

              <TabsContent value="busy" className="mt-4">
                <UsersList 
                  users={filteredPresenceData.filter(p => p.status === 'busy')} 
                  title="" 
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};