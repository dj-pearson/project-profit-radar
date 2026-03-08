import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Cloud, Droplets, Wind, Thermometer } from 'lucide-react';
import { fetchWeather, type WeatherConditions } from '@/services/weather';

interface ProjectLocation {
  name: string;
  latitude: number;
  longitude: number;
}

interface WeatherWidgetProps {
  projectLocations?: ProjectLocation[];
}

// Default location (US center) used when no project locations are available
const DEFAULT_LOCATION: ProjectLocation = {
  name: 'Default',
  latitude: 39.8283,
  longitude: -98.5795,
};

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ projectLocations }) => {
  const [weather, setWeather] = useState<WeatherConditions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const location = projectLocations?.[0] || DEFAULT_LOCATION;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchWeather(location.latitude, location.longitude);
        if (!cancelled) {
          setWeather(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Weather data unavailable');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [location.latitude, location.longitude]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Cloud className="h-4 w-4" aria-hidden="true" />
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Cloud className="h-4 w-4" aria-hidden="true" />
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error || 'No weather data'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Cloud className="h-4 w-4" aria-hidden="true" />
          Job Site Weather
          {location.name !== 'Default' && (
            <span className="text-xs text-muted-foreground font-normal">- {location.name}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Main weather display */}
        <div className="flex items-center gap-3">
          <span className="text-3xl" role="img" aria-label={weather.conditions}>
            {weather.conditionsIcon}
          </span>
          <div>
            <div className="text-2xl font-bold">
              {weather.temperature}{weather.temperatureUnit}
            </div>
            <div className="text-sm text-muted-foreground">{weather.conditions}</div>
          </div>
        </div>

        {/* Details row */}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1" aria-label={`Wind: ${weather.windSpeed} ${weather.windUnit}`}>
            <Wind className="h-3 w-3" aria-hidden="true" />
            {weather.windSpeed} {weather.windUnit}
          </div>
          <div className="flex items-center gap-1" aria-label={`Precipitation: ${weather.precipitation} ${weather.precipitationUnit}`}>
            <Droplets className="h-3 w-3" aria-hidden="true" />
            {weather.precipitation} {weather.precipitationUnit}
          </div>
          <div className="flex items-center gap-1" aria-label={`Humidity: ${weather.humidity}%`}>
            <Thermometer className="h-3 w-3" aria-hidden="true" />
            {weather.humidity}%
          </div>
        </div>

        {/* Severe weather alerts */}
        {weather.isSevere && weather.severeAlerts.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {weather.severeAlerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-destructive font-medium">{alert}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
