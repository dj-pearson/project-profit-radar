import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  weatherSchedulingService,
  WeatherSensitiveActivity,
  WeatherImpact,
  ScheduleAdjustment,
} from "@/services/WeatherIntegrationService";
import { supabase } from "@/integrations/supabase/client";
import {
  Cloud,
  CloudRain,
  Sun,
  Wind,
  Thermometer,
  Droplets,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Settings,
  RefreshCw,
  Eye,
} from "lucide-react";
import { format } from "date-fns";

interface Project {
  id: string;
  name: string;
  project_address: any;
  gps_coordinates: any;
}

interface WeatherImpactedTask {
  task_id: string;
  task_name: string;
  scheduled_date: string;
  weather_impact: any;
  recommended_action: string;
}

export const WeatherIntegrationManager: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [activities, setActivities] = useState<WeatherSensitiveActivity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [weatherImpacts, setWeatherImpacts] = useState<WeatherImpact[]>([]);
  const [impactedTasks, setImpactedTasks] = useState<WeatherImpactedTask[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [checkingWeather, setCheckingWeather] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] =
    useState<WeatherSensitiveActivity | null>(null);

  useEffect(() => {
    loadData();
  }, [userProfile?.company_id]);

  const loadData = async () => {
    if (!userProfile?.company_id) return;

    try {
      // Load weather-sensitive activities
      const activitiesData =
        await weatherSchedulingService.getWeatherSensitiveActivities(
          userProfile.company_id
        );
      setActivities(activitiesData);

      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, name, project_address, gps_coordinates")
        .eq("company_id", userProfile.company_id)
        .eq("status", "active")
        .order("name");

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      if (projectsData && projectsData.length > 0) {
        setSelectedProject(projectsData[0].id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load weather integration data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkWeatherImpact = async () => {
    if (!selectedProject) return;

    setCheckingWeather(true);
    try {
      // Get weather impact for the selected project
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      const impacts = await weatherSchedulingService.analyzeWeatherImpact(
        selectedProject,
        { start: startDate, end: endDate }
      );
      setWeatherImpacts(impacts);

      // Get weather-impacted tasks
      const { data: tasksData, error } = await supabase.rpc(
        "get_weather_impacted_tasks",
        {
          project_id_param: selectedProject,
          date_range_start: startDate.toISOString().split("T")[0],
          date_range_end: endDate.toISOString().split("T")[0],
        }
      );

      if (error) throw error;
      setImpactedTasks(tasksData || []);

      toast({
        title: "Weather Check Complete",
        description: `Found ${
          impacts.filter((i) => i.conditions !== "suitable").length
        } days with weather concerns`,
      });
    } catch (error) {
      console.error("Error checking weather impact:", error);
      toast({
        title: "Error",
        description: "Failed to check weather impact",
        variant: "destructive",
      });
    } finally {
      setCheckingWeather(false);
    }
  };

  const updateActivitySettings = async (activity: WeatherSensitiveActivity) => {
    try {
      await weatherSchedulingService.updateWeatherSensitivity(
        activity.activity_type,
        activity
      );
      await loadData();
      setActivityDialogOpen(false);
      setSelectedActivity(null);

      toast({
        title: "Settings Updated",
        description: `Weather sensitivity updated for ${activity.activity_type}`,
      });
    } catch (error) {
      console.error("Error updating activity settings:", error);
      toast({
        title: "Error",
        description: "Failed to update weather sensitivity settings",
        variant: "destructive",
      });
    }
  };

  const getWeatherIcon = (conditions: string) => {
    switch (conditions.toLowerCase()) {
      case "suitable":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "caution":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "unsuitable":
        return <CloudRain className="h-4 w-4 text-red-500" />;
      default:
        return <Cloud className="h-4 w-4" />;
    }
  };

  const getConditionColor = (conditions: string) => {
    switch (conditions) {
      case "suitable":
        return "bg-green-100 text-green-800";
      case "caution":
        return "bg-yellow-100 text-yellow-800";
      case "unsuitable":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            Loading weather integration...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Weather Integration</h2>
          <p className="text-muted-foreground">
            Monitor weather conditions and optimize construction schedules
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={checkWeatherImpact}
            disabled={!selectedProject || checkingWeather}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${
                checkingWeather ? "animate-spin" : ""
              }`}
            />
            {checkingWeather ? "Checking..." : "Check Weather"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Weather Overview</TabsTrigger>
          <TabsTrigger value="tasks">Impacted Tasks</TabsTrigger>
          <TabsTrigger value="settings">Activity Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Weather Forecast</CardTitle>
                <CardDescription>
                  7-day weather outlook for construction activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Label htmlFor="project-select">Select Project</Label>
                  <select
                    id="project-select"
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    <option value="">Select a project...</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                {weatherImpacts.length > 0 ? (
                  <div className="grid gap-3">
                    {weatherImpacts.map((impact, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getWeatherIcon(impact.conditions)}
                          <div>
                            <p className="font-medium">
                              {format(impact.date, "EEEE, MMM d")}
                            </p>
                            <Badge
                              className={getConditionColor(impact.conditions)}
                            >
                              {impact.conditions}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-muted-foreground">
                            {impact.affected_activities.length} activities
                            affected
                          </p>
                          <p className="text-xs">
                            Confidence:{" "}
                            {Math.round(impact.confidence_level * 100)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Cloud className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Weather Data
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Select a project and check weather to see forecast impact
                    </p>
                    <Button
                      onClick={checkWeatherImpact}
                      disabled={!selectedProject}
                    >
                      Check Weather Impact
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weather-Impacted Tasks</CardTitle>
              <CardDescription>
                Tasks that may be affected by upcoming weather conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {impactedTasks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task Name</TableHead>
                      <TableHead>Scheduled Date</TableHead>
                      <TableHead>Weather Impact</TableHead>
                      <TableHead>Recommended Action</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {impactedTasks.map((task) => (
                      <TableRow key={task.task_id}>
                        <TableCell className="font-medium">
                          {task.task_name}
                        </TableCell>
                        <TableCell>
                          {format(new Date(task.scheduled_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={getConditionColor(
                              task.weather_impact?.suitable
                                ? "suitable"
                                : "unsuitable"
                            )}
                          >
                            {task.weather_impact?.suitable
                              ? "Suitable"
                              : "At Risk"}
                          </Badge>
                        </TableCell>
                        <TableCell>{task.recommended_action}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Weather-Impacted Tasks
                  </h3>
                  <p className="text-muted-foreground">
                    All scheduled tasks appear to be safe from weather concerns
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weather Sensitivity Settings</CardTitle>
              <CardDescription>
                Configure weather thresholds for different construction
                activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium capitalize">
                        {activity.activity_type.replace(/_/g, " ")}
                      </h4>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        {activity.min_temperature && (
                          <span className="flex items-center gap-1">
                            <Thermometer className="h-3 w-3" />
                            Min: {activity.min_temperature}°F
                          </span>
                        )}
                        {activity.max_wind_speed && (
                          <span className="flex items-center gap-1">
                            <Wind className="h-3 w-3" />
                            Max: {activity.max_wind_speed} mph
                          </span>
                        )}
                        {activity.precipitation_threshold && (
                          <span className="flex items-center gap-1">
                            <Droplets className="h-3 w-3" />
                            Max: {activity.precipitation_threshold}"
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedActivity(activity);
                        setActivityDialogOpen(true);
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Activity Settings Dialog */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Weather Sensitivity Settings</DialogTitle>
            <DialogDescription>
              Configure weather thresholds for{" "}
              {selectedActivity?.activity_type?.replace(/_/g, " ")}
            </DialogDescription>
          </DialogHeader>
          {selectedActivity && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_temp">Minimum Temperature (°F)</Label>
                  <Input
                    id="min_temp"
                    type="number"
                    value={selectedActivity.min_temperature || ""}
                    onChange={(e) =>
                      setSelectedActivity({
                        ...selectedActivity,
                        min_temperature: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="max_temp">Maximum Temperature (°F)</Label>
                  <Input
                    id="max_temp"
                    type="number"
                    value={selectedActivity.max_temperature || ""}
                    onChange={(e) =>
                      setSelectedActivity({
                        ...selectedActivity,
                        max_temperature: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_wind">Maximum Wind Speed (mph)</Label>
                  <Input
                    id="max_wind"
                    type="number"
                    value={selectedActivity.max_wind_speed || ""}
                    onChange={(e) =>
                      setSelectedActivity({
                        ...selectedActivity,
                        max_wind_speed: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="max_precip">Max Precipitation (inches)</Label>
                  <Input
                    id="max_precip"
                    type="number"
                    step="0.1"
                    value={selectedActivity.precipitation_threshold || ""}
                    onChange={(e) =>
                      setSelectedActivity({
                        ...selectedActivity,
                        precipitation_threshold: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="max_humidity">Maximum Humidity (%)</Label>
                <Input
                  id="max_humidity"
                  type="number"
                  value={selectedActivity.humidity_threshold || ""}
                  onChange={(e) =>
                    setSelectedActivity({
                      ...selectedActivity,
                      humidity_threshold: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setActivityDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateActivitySettings(selectedActivity)}
                >
                  Save Settings
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WeatherIntegrationManager;
