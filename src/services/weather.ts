/**
 * Weather service using Open-Meteo API (free, no API key required).
 * Provides current weather conditions and severe weather alerts for construction sites.
 */

export interface WeatherConditions {
  temperature: number;
  temperatureUnit: string;
  conditions: string;
  conditionsIcon: string;
  windSpeed: number;
  windUnit: string;
  precipitation: number;
  precipitationUnit: string;
  humidity: number;
  isSevere: boolean;
  severeAlerts: string[];
  fetchedAt: string;
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    precipitation: number;
  };
}

// WMO Weather interpretation codes → human-readable descriptions and icons
const weatherCodeMap: Record<number, { description: string; icon: string }> = {
  0: { description: 'Clear sky', icon: '☀️' },
  1: { description: 'Mainly clear', icon: '🌤️' },
  2: { description: 'Partly cloudy', icon: '⛅' },
  3: { description: 'Overcast', icon: '☁️' },
  45: { description: 'Foggy', icon: '🌫️' },
  48: { description: 'Depositing rime fog', icon: '🌫️' },
  51: { description: 'Light drizzle', icon: '🌦️' },
  53: { description: 'Moderate drizzle', icon: '🌦️' },
  55: { description: 'Dense drizzle', icon: '🌧️' },
  61: { description: 'Slight rain', icon: '🌧️' },
  63: { description: 'Moderate rain', icon: '🌧️' },
  65: { description: 'Heavy rain', icon: '🌧️' },
  71: { description: 'Slight snow', icon: '🌨️' },
  73: { description: 'Moderate snow', icon: '🌨️' },
  75: { description: 'Heavy snow', icon: '❄️' },
  77: { description: 'Snow grains', icon: '🌨️' },
  80: { description: 'Slight rain showers', icon: '🌦️' },
  81: { description: 'Moderate rain showers', icon: '🌧️' },
  82: { description: 'Violent rain showers', icon: '⛈️' },
  85: { description: 'Slight snow showers', icon: '🌨️' },
  86: { description: 'Heavy snow showers', icon: '❄️' },
  95: { description: 'Thunderstorm', icon: '⛈️' },
  96: { description: 'Thunderstorm with slight hail', icon: '⛈️' },
  99: { description: 'Thunderstorm with heavy hail', icon: '⛈️' },
};

function getWeatherDescription(code: number): { description: string; icon: string } {
  return weatherCodeMap[code] || { description: 'Unknown', icon: '❓' };
}

function detectSevereWeather(
  temperature: number,
  windSpeed: number,
  weatherCode: number,
  precipitation: number
): string[] {
  const alerts: string[] = [];

  if (temperature > 40) alerts.push('Extreme heat warning - heat safety protocols required');
  if (temperature < -10) alerts.push('Extreme cold warning - cold weather safety protocols required');
  if (windSpeed > 50) alerts.push('High wind warning - secure loose materials, halt crane operations');
  if (windSpeed > 30) alerts.push('Wind advisory - exercise caution with elevated work');
  if (weatherCode >= 95) alerts.push('Thunderstorm warning - seek shelter, halt outdoor work');
  if (weatherCode >= 65 && weatherCode <= 67) alerts.push('Heavy rain - potential flooding, slippery surfaces');
  if (weatherCode >= 75 && weatherCode <= 77) alerts.push('Heavy snow - reduced visibility, slippery surfaces');
  if (precipitation > 10) alerts.push('Heavy precipitation - check drainage and excavations');

  return alerts;
}

// In-memory cache to avoid excessive API calls
const weatherCache = new Map<string, { data: WeatherConditions; expiresAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function fetchWeather(latitude: number, longitude: number): Promise<WeatherConditions> {
  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();
  const { description, icon } = getWeatherDescription(data.current.weather_code);
  const severeAlerts = detectSevereWeather(
    data.current.temperature_2m,
    data.current.wind_speed_10m,
    data.current.weather_code,
    data.current.precipitation
  );

  const result: WeatherConditions = {
    temperature: Math.round(data.current.temperature_2m),
    temperatureUnit: '°F',
    conditions: description,
    conditionsIcon: icon,
    windSpeed: Math.round(data.current.wind_speed_10m),
    windUnit: 'mph',
    precipitation: data.current.precipitation,
    precipitationUnit: 'in',
    humidity: data.current.relative_humidity_2m,
    isSevere: severeAlerts.length > 0,
    severeAlerts,
    fetchedAt: new Date().toISOString(),
  };

  weatherCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

/**
 * Format weather conditions into a single-line string suitable for daily report fields.
 */
export function formatWeatherForReport(weather: WeatherConditions): string {
  return `${weather.conditionsIcon} ${weather.conditions}, ${weather.temperature}${weather.temperatureUnit}, Wind: ${weather.windSpeed} ${weather.windUnit}, Precip: ${weather.precipitation} ${weather.precipitationUnit}`;
}
