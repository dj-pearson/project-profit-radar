import { supabase } from "@/integrations/supabase/client";

export interface WeatherData {
  date: Date;
  temperature_min: number;
  temperature_max: number;
  humidity: number;
  wind_speed: number;
  precipitation: number;
  conditions: string;
  description: string;
}

export interface WeatherImpact {
  date: Date;
  conditions: "suitable" | "caution" | "unsuitable";
  affected_activities: string[];
  recommended_actions: string[];
  confidence_level: number;
}

export interface ScheduleAdjustment {
  task_id: string;
  original_date: Date;
  suggested_date: Date;
  reason: string;
  impact_score: number;
  auto_adjust: boolean;
}

export interface RescheduleResult {
  adjustments_made: number;
  tasks_affected: string[];
  next_suitable_dates: Date[];
  estimated_delay_days: number;
}

export interface WeatherSensitiveActivity {
  id: string;
  activity_type: string;
  min_temperature?: number;
  max_temperature?: number;
  max_wind_speed?: number;
  precipitation_threshold?: number;
  humidity_threshold?: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

class WeatherSchedulingService {
  private readonly WEATHER_API_KEY = process.env.VITE_OPENWEATHER_API_KEY || "";
  private readonly WEATHER_API_URL = "https://api.openweathermap.org/data/2.5";

  /**
   * Get weather forecast for a location
   */
  async getWeatherForecast(
    lat: number,
    lon: number,
    days: number = 7
  ): Promise<WeatherData[]> {
    try {
      const response = await fetch(
        `${this.WEATHER_API_URL}/forecast?lat=${lat}&lon=${lon}&appid=${
          this.WEATHER_API_KEY
        }&units=imperial&cnt=${days * 8}` // 8 forecasts per day (3-hour intervals)
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Group forecasts by day and get daily summary
      const dailyForecasts: WeatherData[] = [];
      const forecastsByDay = new Map();

      data.list.forEach((forecast: any) => {
        const date = new Date(forecast.dt * 1000);
        const dateKey = date.toDateString();

        if (!forecastsByDay.has(dateKey)) {
          forecastsByDay.set(dateKey, []);
        }
        forecastsByDay.get(dateKey).push(forecast);
      });

      forecastsByDay.forEach((forecasts, dateKey) => {
        const temps = forecasts.map((f: any) => f.main.temp);
        const humidity = forecasts.map((f: any) => f.main.humidity);
        const windSpeeds = forecasts.map((f: any) => f.wind.speed);
        const precipitation = forecasts.reduce(
          (sum: number, f: any) =>
            sum + (f.rain?.["3h"] || 0) + (f.snow?.["3h"] || 0),
          0
        );

        dailyForecasts.push({
          date: new Date(dateKey),
          temperature_min: Math.min(...temps),
          temperature_max: Math.max(...temps),
          humidity: Math.round(
            humidity.reduce((a: number, b: number) => a + b) / humidity.length
          ),
          wind_speed: Math.round(
            windSpeeds.reduce((a: number, b: number) => a + b) /
              windSpeeds.length
          ),
          precipitation: Math.round(precipitation * 100) / 100,
          conditions: forecasts[0].weather[0].main,
          description: forecasts[0].weather[0].description,
        });
      });

      return dailyForecasts;
    } catch (error) {
      console.error("Error fetching weather forecast:", error);
      throw error;
    }
  }

  /**
   * Analyze weather impact on construction activities
   */
  async analyzeWeatherImpact(
    project_id: string,
    date_range: DateRange
  ): Promise<WeatherImpact[]> {
    try {
      // Get project location
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("project_address, gps_coordinates")
        .eq("id", project_id)
        .single();

      if (projectError) throw projectError;

      // Extract coordinates
      let lat = 40.7128,
        lon = -74.006; // Default to NYC
      if (project.gps_coordinates) {
        // Parse PostGIS POINT format
        const coords = project.gps_coordinates.match(/POINT\(([^)]+)\)/);
        if (coords) {
          const [longitude, latitude] = coords[1].split(" ").map(Number);
          lat = latitude;
          lon = longitude;
        }
      }

      // Get weather forecast
      const days = Math.ceil(
        (date_range.end.getTime() - date_range.start.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const weatherData = await this.getWeatherForecast(
        lat,
        lon,
        Math.min(days, 7)
      );

      // Get weather-sensitive activities
      const { data: activities, error: activitiesError } = await supabase
        .from("weather_sensitive_activities")
        .select("*");

      if (activitiesError) throw activitiesError;

      // Analyze impact for each day
      const impacts: WeatherImpact[] = [];

      weatherData.forEach((weather) => {
        const affectedActivities: string[] = [];
        const recommendedActions: string[] = [];
        let overallCondition: "suitable" | "caution" | "unsuitable" =
          "suitable";

        activities?.forEach((activity) => {
          let isAffected = false;
          const reasons: string[] = [];

          // Check temperature constraints
          if (
            activity.min_temperature &&
            weather.temperature_min < activity.min_temperature
          ) {
            isAffected = true;
            reasons.push(
              `temperature too low (${weather.temperature_min}°F < ${activity.min_temperature}°F)`
            );
          }
          if (
            activity.max_temperature &&
            weather.temperature_max > activity.max_temperature
          ) {
            isAffected = true;
            reasons.push(
              `temperature too high (${weather.temperature_max}°F > ${activity.max_temperature}°F)`
            );
          }

          // Check wind constraints
          if (
            activity.max_wind_speed &&
            weather.wind_speed > activity.max_wind_speed
          ) {
            isAffected = true;
            reasons.push(
              `wind too strong (${weather.wind_speed} mph > ${activity.max_wind_speed} mph)`
            );
          }

          // Check precipitation constraints
          if (
            activity.precipitation_threshold &&
            weather.precipitation > activity.precipitation_threshold
          ) {
            isAffected = true;
            reasons.push(
              `too much precipitation (${weather.precipitation}" > ${activity.precipitation_threshold}")`
            );
          }

          // Check humidity constraints
          if (
            activity.humidity_threshold &&
            weather.humidity > activity.humidity_threshold
          ) {
            isAffected = true;
            reasons.push(
              `humidity too high (${weather.humidity}% > ${activity.humidity_threshold}%)`
            );
          }

          if (isAffected) {
            affectedActivities.push(
              `${activity.activity_type}: ${reasons.join(", ")}`
            );

            // Determine severity
            if (
              weather.precipitation > 0.5 ||
              weather.wind_speed > 25 ||
              weather.temperature_min < 32 ||
              weather.temperature_max > 95
            ) {
              overallCondition = "unsuitable";
            } else if (overallCondition !== "unsuitable") {
              overallCondition = "caution";
            }
          }
        });

        // Generate recommendations
        if (affectedActivities.length > 0) {
          if (overallCondition === "unsuitable") {
            recommendedActions.push("Consider rescheduling outdoor work");
            recommendedActions.push("Focus on indoor activities");
            recommendedActions.push("Secure materials and equipment");
          } else {
            recommendedActions.push("Monitor weather conditions closely");
            recommendedActions.push("Have contingency plans ready");
            recommendedActions.push(
              "Consider early start or delayed start times"
            );
          }
        }

        impacts.push({
          date: weather.date,
          conditions: overallCondition,
          affected_activities: affectedActivities,
          recommended_actions: recommendedActions,
          confidence_level: 0.85, // Static for now, could be improved with ML
        });
      });

      return impacts;
    } catch (error) {
      console.error("Error analyzing weather impact:", error);
      throw error;
    }
  }

  /**
   * Suggest schedule adjustments based on weather forecast
   */
  async suggestScheduleAdjustments(
    tasks: any[],
    weather_forecast: WeatherData[]
  ): Promise<ScheduleAdjustment[]> {
    try {
      const adjustments: ScheduleAdjustment[] = [];

      for (const task of tasks) {
        if (!task.weather_sensitive) continue;

        const taskDate = new Date(task.start_date);
        const weatherForDay = weather_forecast.find(
          (w) => w.date.toDateString() === taskDate.toDateString()
        );

        if (!weatherForDay) continue;

        // Get weather sensitivity rules for this task type
        const { data: activityRules, error } = await supabase
          .from("weather_sensitive_activities")
          .select("*")
          .eq("activity_type", task.construction_phase)
          .single();

        if (error || !activityRules) continue;

        let needsReschedule = false;
        const reasons: string[] = [];

        // Check if weather conditions violate constraints
        if (
          activityRules.min_temperature &&
          weatherForDay.temperature_min < activityRules.min_temperature
        ) {
          needsReschedule = true;
          reasons.push(
            `Temperature too low: ${weatherForDay.temperature_min}°F`
          );
        }

        if (
          activityRules.max_wind_speed &&
          weatherForDay.wind_speed > activityRules.max_wind_speed
        ) {
          needsReschedule = true;
          reasons.push(`Wind too strong: ${weatherForDay.wind_speed} mph`);
        }

        if (
          activityRules.precipitation_threshold &&
          weatherForDay.precipitation > activityRules.precipitation_threshold
        ) {
          needsReschedule = true;
          reasons.push(
            `Too much precipitation: ${weatherForDay.precipitation}"`
          );
        }

        if (needsReschedule) {
          // Find next suitable date
          const suggestedDate = this.findNextSuitableDate(
            taskDate,
            weather_forecast,
            activityRules
          );

          adjustments.push({
            task_id: task.id,
            original_date: taskDate,
            suggested_date: suggestedDate,
            reason: reasons.join(", "),
            impact_score: this.calculateImpactScore(reasons),
            auto_adjust: false, // Require manual approval
          });
        }
      }

      return adjustments;
    } catch (error) {
      console.error("Error suggesting schedule adjustments:", error);
      throw error;
    }
  }

  /**
   * Automatically reschedule outdoor work based on weather
   */
  async autoRescheduleOutdoorWork(
    project_id: string
  ): Promise<RescheduleResult> {
    try {
      // Get upcoming weather-sensitive tasks for the project
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", project_id)
        .eq("weather_sensitive", true)
        .gte("start_date", new Date().toISOString())
        .lte(
          "start_date",
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        ) // Next 7 days
        .order("start_date");

      if (tasksError) throw tasksError;

      if (!tasks || tasks.length === 0) {
        return {
          adjustments_made: 0,
          tasks_affected: [],
          next_suitable_dates: [],
          estimated_delay_days: 0,
        };
      }

      // Get weather forecast
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("gps_coordinates")
        .eq("id", project_id)
        .single();

      if (projectError) throw projectError;

      // Get weather forecast (simplified for demo)
      let lat = 40.7128,
        lon = -74.006; // Default coordinates
      const weatherForecast = await this.getWeatherForecast(lat, lon, 7);

      // Get suggested adjustments
      const adjustments = await this.suggestScheduleAdjustments(
        tasks,
        weatherForecast
      );

      // Apply automatic adjustments for high-impact weather events
      let adjustmentsMade = 0;
      const tasksAffected: string[] = [];
      const nextSuitableDates: Date[] = [];
      let totalDelayDays = 0;

      for (const adjustment of adjustments) {
        if (adjustment.impact_score >= 8) {
          // High impact threshold
          // Update the task date
          const { error: updateError } = await supabase
            .from("tasks")
            .update({
              start_date: adjustment.suggested_date,
              end_date: new Date(
                adjustment.suggested_date.getTime() +
                  (new Date(
                    tasks.find((t) => t.id === adjustment.task_id)?.end_date ||
                      0
                  ).getTime() -
                    adjustment.original_date.getTime())
              ),
            })
            .eq("id", adjustment.task_id);

          if (!updateError) {
            // Log the weather adjustment
            await supabase.from("weather_schedule_adjustments").insert({
              project_id,
              original_date: adjustment.original_date,
              adjusted_date: adjustment.suggested_date,
              weather_reason: adjustment.reason,
              auto_adjusted: true,
            });

            adjustmentsMade++;
            tasksAffected.push(adjustment.task_id);
            nextSuitableDates.push(adjustment.suggested_date);

            const delayDays = Math.ceil(
              (adjustment.suggested_date.getTime() -
                adjustment.original_date.getTime()) /
                (1000 * 60 * 60 * 24)
            );
            totalDelayDays += delayDays;
          }
        }
      }

      return {
        adjustments_made: adjustmentsMade,
        tasks_affected: tasksAffected,
        next_suitable_dates: nextSuitableDates,
        estimated_delay_days: totalDelayDays,
      };
    } catch (error) {
      console.error("Error auto-rescheduling outdoor work:", error);
      throw error;
    }
  }

  /**
   * Get weather-sensitive activities configuration
   */
  async getWeatherSensitiveActivities(
    companyId: string
  ): Promise<WeatherSensitiveActivity[]> {
    try {
      const { data, error } = await supabase
        .from("weather_sensitive_activities")
        .select("*")
        .order("activity_type");

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching weather-sensitive activities:", error);
      throw error;
    }
  }

  /**
   * Update weather sensitivity settings for an activity
   */
  async updateWeatherSensitivity(
    activityType: string,
    settings: Partial<WeatherSensitiveActivity>
  ): Promise<WeatherSensitiveActivity> {
    try {
      const { data, error } = await supabase
        .from("weather_sensitive_activities")
        .upsert({
          activity_type: activityType,
          ...settings,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating weather sensitivity:", error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private findNextSuitableDate(
    originalDate: Date,
    weatherForecast: WeatherData[],
    rules: WeatherSensitiveActivity
  ): Date {
    for (let i = 1; i <= 7; i++) {
      const testDate = new Date(originalDate);
      testDate.setDate(testDate.getDate() + i);

      const weather = weatherForecast.find(
        (w) => w.date.toDateString() === testDate.toDateString()
      );

      if (!weather) continue;

      let suitable = true;

      if (
        rules.min_temperature &&
        weather.temperature_min < rules.min_temperature
      )
        suitable = false;
      if (
        rules.max_temperature &&
        weather.temperature_max > rules.max_temperature
      )
        suitable = false;
      if (rules.max_wind_speed && weather.wind_speed > rules.max_wind_speed)
        suitable = false;
      if (
        rules.precipitation_threshold &&
        weather.precipitation > rules.precipitation_threshold
      )
        suitable = false;
      if (
        rules.humidity_threshold &&
        weather.humidity > rules.humidity_threshold
      )
        suitable = false;

      if (suitable) return testDate;
    }

    // If no suitable date found in next 7 days, return 7 days out
    const fallbackDate = new Date(originalDate);
    fallbackDate.setDate(fallbackDate.getDate() + 7);
    return fallbackDate;
  }

  private calculateImpactScore(reasons: string[]): number {
    let score = 0;
    reasons.forEach((reason) => {
      if (reason.includes("precipitation")) score += 4;
      if (reason.includes("wind")) score += 3;
      if (reason.includes("temperature")) score += 2;
      if (reason.includes("humidity")) score += 1;
    });
    return Math.min(score, 10);
  }
}

export const weatherSchedulingService = new WeatherSchedulingService();
