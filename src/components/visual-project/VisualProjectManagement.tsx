import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimelineView } from './TimelineView';
import { PhotoProgressTracking } from './PhotoProgressTracking';
import { InteractiveFloorPlan } from './InteractiveFloorPlan';
import { WeatherIntegrationManager } from '../weather/WeatherIntegrationManager';
import { Calendar, Camera, Map, Cloud } from 'lucide-react';

interface VisualProjectManagementProps {
  projectId?: string;
}

export const VisualProjectManagement: React.FC<VisualProjectManagementProps> = ({ projectId }) => {
  const [activeTab, setActiveTab] = useState('timeline');

  return (
    <div className="h-full flex flex-col">
      <Card className="h-full">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Map className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">Visual Project Management</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            {/* Mobile-optimized tabs */}
            <div className="px-4 sm:px-6 mb-3 sm:mb-4">
              <div className="w-full overflow-x-auto">
                <TabsList className="grid w-max grid-cols-4 min-w-full h-11 sm:h-10">
                  <TabsTrigger value="timeline" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Timeline</span>
                    <span className="xs:hidden">Time</span>
                  </TabsTrigger>
                  <TabsTrigger value="photos" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm">
                    <Camera className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Photos</span>
                    <span className="xs:hidden">Pics</span>
                  </TabsTrigger>
                  <TabsTrigger value="floorplan" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm">
                    <Map className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Floor Plan</span>
                    <span className="xs:hidden">Plan</span>
                  </TabsTrigger>
                  <TabsTrigger value="weather" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm">
                    <Cloud className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Weather</span>
                    <span className="xs:hidden">Sky</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <div className="flex-1 px-3 sm:px-6 pb-4 sm:pb-6 min-h-0">
              <TabsContent value="timeline" className="h-full m-0">
                <TimelineView projectId={projectId} />
              </TabsContent>

              <TabsContent value="photos" className="h-full m-0">
                <PhotoProgressTracking projectId={projectId} />
              </TabsContent>

              <TabsContent value="floorplan" className="h-full m-0">
                <InteractiveFloorPlan projectId={projectId} />
              </TabsContent>

              <TabsContent value="weather" className="h-full m-0">
                <WeatherIntegrationManager projectId={projectId} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};