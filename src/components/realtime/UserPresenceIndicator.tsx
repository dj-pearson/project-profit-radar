import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { 
  Circle, 
  Clock, 
  Minus, 
  MapPin,
  Smartphone,
  Monitor,
  MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserPresence, useSimplePresence } from '@/hooks/useSimplePresence';
import { formatDistanceToNow } from 'date-fns';

interface UserPresenceIndicatorProps {
  presence: UserPresence;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onMessageUser?: () => void;
}

const STATUS_CONFIG = {
  online: {
    color: 'bg-green-500',
    label: 'Online',
    icon: Circle,
    badgeVariant: 'secondary' as const
  },
  away: {
    color: 'bg-yellow-500',
    label: 'Away',
    icon: Clock,
    badgeVariant: 'outline' as const
  },
  busy: {
    color: 'bg-red-500',
    label: 'Busy',
    icon: Minus,
    badgeVariant: 'destructive' as const
  },
  offline: {
    color: 'bg-gray-400',
    label: 'Offline',
    icon: Circle,
    badgeVariant: 'secondary' as const
  }
};

const SIZE_CONFIG = {
  sm: {
    avatar: 'h-6 w-6',
    indicator: 'h-2 w-2',
    text: 'text-xs'
  },
  md: {
    avatar: 'h-8 w-8',
    indicator: 'h-3 w-3',
    text: 'text-sm'
  },
  lg: {
    avatar: 'h-10 w-10',
    indicator: 'h-3 w-3',
    text: 'text-base'
  }
};

export const UserPresenceIndicator: React.FC<UserPresenceIndicatorProps> = ({
  presence,
  showDetails = false,
  size = 'md',
  className,
  onMessageUser
}) => {
  const statusConfig = STATUS_CONFIG[presence.status];
  const sizeConfig = SIZE_CONFIG[size];
  const StatusIcon = statusConfig.icon;

  const getUserInitials = (profile?: UserPresence['user_profile']) => {
    if (!profile) return 'U';
    const first = profile.first_name?.[0] || '';
    const last = profile.last_name?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  const getDisplayName = (profile?: UserPresence['user_profile']) => {
    if (!profile) return 'Unknown User';
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User';
  };

  const getDeviceInfo = () => {
    if (!presence.device_info) return null;
    
    const { userAgent, platform } = presence.device_info;
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent || '');
    
    return {
      type: isMobile ? 'mobile' : 'desktop',
      platform: platform || 'Unknown',
      icon: isMobile ? Smartphone : Monitor
    };
  };

  const formatLastSeen = (lastSeen: string) => {
    try {
      return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
    } catch (error) {
      return 'Recently';
    }
  };

  const deviceInfo = getDeviceInfo();
  const DeviceIcon = deviceInfo?.icon;

  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('relative inline-flex items-center', className)}>
              <Avatar className={sizeConfig.avatar}>
                <AvatarImage 
                  src={presence.user_profile?.avatar_url} 
                  alt={getDisplayName(presence.user_profile)}
                />
                <AvatarFallback className={sizeConfig.text}>
                  {getUserInitials(presence.user_profile)}
                </AvatarFallback>
              </Avatar>
              
              {/* Status indicator */}
              <div 
                className={cn(
                  'absolute -bottom-0 -right-0 rounded-full border-2 border-background',
                  sizeConfig.indicator,
                  statusConfig.color
                )}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{getDisplayName(presence.user_profile)}</p>
              <p className="text-xs text-muted-foreground">
                {statusConfig.label} • {formatLastSeen(presence.last_seen)}
              </p>
              {presence.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {presence.location}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className={cn(
          'flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer',
          className
        )}>
          <div className="relative">
            <Avatar className={sizeConfig.avatar}>
              <AvatarImage 
                src={presence.user_profile?.avatar_url} 
                alt={getDisplayName(presence.user_profile)}
              />
              <AvatarFallback className={sizeConfig.text}>
                {getUserInitials(presence.user_profile)}
              </AvatarFallback>
            </Avatar>
            
            <div 
              className={cn(
                'absolute -bottom-0 -right-0 rounded-full border-2 border-background',
                sizeConfig.indicator,
                statusConfig.color
              )}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={cn('font-medium truncate', sizeConfig.text)}>
                {getDisplayName(presence.user_profile)}
              </p>
              <Badge variant={statusConfig.badgeVariant} className="text-xs">
                {statusConfig.label}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                {formatLastSeen(presence.last_seen)}
              </p>
              
              {presence.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-20">{presence.location}</span>
                </div>
              )}
              
              {DeviceIcon && (
                <DeviceIcon className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          </div>

          {onMessageUser && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onMessageUser();
              }}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </HoverCardTrigger>

      <HoverCardContent className="w-80">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage 
                src={presence.user_profile?.avatar_url} 
                alt={getDisplayName(presence.user_profile)}
              />
              <AvatarFallback>
                {getUserInitials(presence.user_profile)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h4 className="font-semibold">{getDisplayName(presence.user_profile)}</h4>
              <div className="flex items-center gap-2 mt-1">
                <StatusIcon className={cn('h-3 w-3', {
                  'text-green-500': presence.status === 'online',
                  'text-yellow-500': presence.status === 'away',
                  'text-red-500': presence.status === 'busy',
                  'text-gray-400': presence.status === 'offline'
                })} />
                <span className="text-sm text-muted-foreground">
                  {statusConfig.label}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last seen:</span>
              <span>{formatLastSeen(presence.last_seen)}</span>
            </div>

            {presence.location && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {presence.location}
                </span>
              </div>
            )}

            {deviceInfo && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Device:</span>
                <span className="flex items-center gap-1">
                  <DeviceIcon className="h-3 w-3" />
                  {deviceInfo.type}
                </span>
              </div>
            )}
          </div>

          {onMessageUser && (
            <Button 
              className="w-full" 
              size="sm"
              onClick={onMessageUser}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};