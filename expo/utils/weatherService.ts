import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { WeatherCondition } from './riskCalculator';

interface OpenMeteoResponse {
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    rain: number[];
    snowfall: number[];
    weathercode: number[];
  };
  current: {
    temperature_2m: number;
    weathercode: number;
    precipitation: number;
    rain: number;
  };
}

const WEATHER_CODES = {
  SNOW: [71, 73, 75, 77, 85, 86],
  SLEET: [66, 67],
  FREEZING_RAIN: [56, 57],
  RAIN: [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99],
};

function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

function getPrecipitationType(
  weatherCode: number
): 'snow' | 'sleet' | 'freezing-rain' | 'rain' | 'none' {
  if (WEATHER_CODES.SNOW.includes(weatherCode)) return 'snow';
  if (WEATHER_CODES.SLEET.includes(weatherCode)) return 'sleet';
  if (WEATHER_CODES.FREEZING_RAIN.includes(weatherCode)) return 'freezing-rain';
  if (WEATHER_CODES.RAIN.includes(weatherCode)) return 'rain';
  return 'none';
}

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true;
  }
  
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  try {
    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('Web location obtained:', position.coords);
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            console.error('Web geolocation error:', error);
            resolve(null);
          },
          { enableHighAccuracy: false, timeout: 10000 }
        );
      });
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    
    console.log('Native location obtained:', location.coords);
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
}

export async function fetchWeatherData(
  latitude: number,
  longitude: number
): Promise<WeatherCondition> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation,rain,snowfall,weathercode&current=temperature_2m,weathercode,precipitation,rain&past_days=7&forecast_days=1&timezone=auto`;

  console.log('Fetching weather from:', url);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data: OpenMeteoResponse = await response.json();
    console.log('Weather data received:', {
      currentTemp: data.current.temperature_2m,
      currentCode: data.current.weathercode,
      hourlyDataPoints: data.hourly.time.length,
    });

    return parseWeatherData(data);
  } catch (error) {
    console.error('Error fetching weather:', error);
    throw error;
  }
}

function parseWeatherData(data: OpenMeteoResponse): WeatherCondition {
  const now = new Date();
  const { hourly, current } = data;

  let lastColdPrecipitation: Date | null = null;
  let lastWarmRain: Date | null = null;
  let lastRain: Date | null = null;

  // Check if it's currently raining using multiple signals
  const currentPrecipType = getPrecipitationType(current.weathercode);
  const isCurrentlyPrecipitating = currentPrecipType !== 'none';
  const currentPrecipAmount = current.precipitation || 0;
  const currentRainAmount = current.rain || 0;
  
  // Find the most recent hourly data point that is at or before now
  let mostRecentHourIndex = -1;
  for (let i = 0; i < hourly.time.length; i++) {
    const hourTime = new Date(hourly.time[i]);
    if (hourTime <= now) {
      mostRecentHourIndex = i;
    } else {
      break;
    }
  }
  
  // Check multiple recent hourly data points (last 3 hours) for precipitation
  const currentHourPrecip = mostRecentHourIndex >= 0 ? hourly.precipitation[mostRecentHourIndex] : 0;
  const prevHourPrecip = mostRecentHourIndex >= 1 ? hourly.precipitation[mostRecentHourIndex - 1] : 0;
  const prev2HourPrecip = mostRecentHourIndex >= 2 ? hourly.precipitation[mostRecentHourIndex - 2] : 0;
  const currentHourRain = mostRecentHourIndex >= 0 ? (hourly.rain?.[mostRecentHourIndex] || 0) : 0;
  const prevHourRain = mostRecentHourIndex >= 1 ? (hourly.rain?.[mostRecentHourIndex - 1] || 0) : 0;
  
  // Check hourly weather codes for drizzle/rain in recent hours
  const recentHourlyWeatherCode = mostRecentHourIndex >= 0 ? hourly.weathercode[mostRecentHourIndex] : 0;
  const prevHourWeatherCode = mostRecentHourIndex >= 1 ? hourly.weathercode[mostRecentHourIndex - 1] : 0;
  const isRecentHourlyPrecip = getPrecipitationType(recentHourlyWeatherCode) !== 'none' || 
                               getPrecipitationType(prevHourWeatherCode) !== 'none';
  
  // Use very low threshold (0.001mm) to catch even trace precipitation
  const hasRecentHourlyPrecip = currentHourPrecip > 0.001 || prevHourPrecip > 0.001 || prev2HourPrecip > 0.001 ||
                                 currentHourRain > 0.001 || prevHourRain > 0.001;
  
  // Check if any drizzle codes (51, 53, 55) are present - these indicate light rain
  const isDrizzleCode = (code: number) => [51, 53, 55].includes(code);
  const hasRecentDrizzle = isDrizzleCode(current.weathercode) || 
                           isDrizzleCode(recentHourlyWeatherCode) || 
                           isDrizzleCode(prevHourWeatherCode);
  
  // Use current API precipitation data as the primary source, fall back to hourly and weather code
  const hasCurrentPrecipitation = currentPrecipAmount > 0 || 
                                   currentRainAmount > 0 || 
                                   isCurrentlyPrecipitating || 
                                   hasRecentHourlyPrecip ||
                                   isRecentHourlyPrecip ||
                                   hasRecentDrizzle;
  
  console.log('Current precipitation check:', {
    currentPrecipAmount,
    currentRainAmount,
    weatherCode: current.weathercode,
    precipType: currentPrecipType,
    mostRecentHourIndex,
    mostRecentHourTime: mostRecentHourIndex >= 0 ? hourly.time[mostRecentHourIndex] : null,
    currentHourPrecip,
    currentHourRain,
    prevHourPrecip,
    prevHourRain,
    prev2HourPrecip,
    recentHourlyWeatherCode,
    prevHourWeatherCode,
    isRecentHourlyPrecip,
    hasRecentHourlyPrecip,
    hasRecentDrizzle,
    hasCurrentPrecipitation
  });
  
  if (hasCurrentPrecipitation) {
    lastRain = now;
    console.log('Currently precipitating, setting lastRain to now');
  }
  let recentLowTemp = celsiusToFahrenheit(current.temperature_2m);
  let recentHighTemp = celsiusToFahrenheit(current.temperature_2m);
  let precipitationType: 'snow' | 'sleet' | 'freezing-rain' | 'rain' | 'none' = 'none';
  let totalRainLast48Hours = 0;
  let hoursAboveFreezing = 0;
  let consecutiveAboveFreezing = true;

  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  for (let i = hourly.time.length - 1; i >= 0; i--) {
    const time = new Date(hourly.time[i]);
    if (time > now) continue;

    const tempF = celsiusToFahrenheit(hourly.temperature_2m[i]);
    const weatherCode = hourly.weathercode[i];
    const hasPrecip = hourly.precipitation[i] > 0;
    const rainAmount = hourly.rain?.[i] || 0;

    if (tempF < recentLowTemp) {
      recentLowTemp = tempF;
    }
    if (tempF > recentHighTemp) {
      recentHighTemp = tempF;
    }

    if (consecutiveAboveFreezing && tempF > 32) {
      hoursAboveFreezing++;
    } else if (tempF <= 32) {
      consecutiveAboveFreezing = false;
    }

    if (time >= fortyEightHoursAgo && rainAmount > 0) {
      totalRainLast48Hours += rainAmount / 25.4;
    }

    if (hasPrecip && !lastRain) {
      lastRain = time;
    }

    const currentPrecipType = getPrecipitationType(weatherCode);

    if (rainAmount > 0 && tempF >= 40 && !lastWarmRain) {
      lastWarmRain = time;
    }
    
    if (
      hasPrecip &&
      !lastColdPrecipitation &&
      ['snow', 'sleet', 'freezing-rain'].includes(currentPrecipType)
    ) {
      lastColdPrecipitation = time;
      precipitationType = currentPrecipType;
    }

    if (
      hasPrecip &&
      !lastColdPrecipitation &&
      currentPrecipType === 'rain' &&
      tempF <= 35
    ) {
      lastColdPrecipitation = time;
      precipitationType = 'rain';
    }
  }

  const result: WeatherCondition = {
    lastColdPrecipitation,
    lastWarmRain,
    lastRain,
    currentTemp: Math.round(celsiusToFahrenheit(current.temperature_2m)),
    recentLowTemp: Math.round(recentLowTemp),
    recentHighTemp: Math.round(recentHighTemp),
    precipitationType,
    totalRainLast48Hours: Math.round(totalRainLast48Hours * 100) / 100,
    hoursAboveFreezing,
  };

  console.log('Parsed weather conditions:', {
    ...result,
    lastColdPrecipitation: result.lastColdPrecipitation?.toISOString(),
    lastWarmRain: result.lastWarmRain?.toISOString(),
    lastRain: result.lastRain?.toISOString(),
  });

  return result;
}

export async function getLocationName(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return null;
    }
    
    const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (addresses.length > 0) {
      const addr = addresses[0];
      const parts = [addr.city, addr.region].filter(Boolean);
      return parts.join(', ') || null;
    }
    return null;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}
