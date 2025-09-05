import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface WeatherIntegrationManagerProps {
  projectId?: string;
}

export const WeatherIntegrationManager: React.FC<WeatherIntegrationManagerProps> = ({ 
  projectId 
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Weather Integration Manager</CardTitle>
          <CardDescription>
            Weather-based project scheduling and alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Weather integration features are being updated. 
              Please check back later for enhanced weather-based scheduling.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};