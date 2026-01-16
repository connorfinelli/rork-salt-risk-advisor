import { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { HelpCircle, MapPin, RefreshCw, ChevronDown, Settings } from 'lucide-react-native';
import {
  calculateRisk,
  type RiskAssessment,
} from '@/utils/riskCalculator';
import {
  requestLocationPermission,
  getCurrentLocation,
  fetchWeatherData,
  getLocationName,
} from '@/utils/weatherService';
import {
  fetchRoadTreatmentData,
  type RoadTreatmentData,
} from '@/utils/roadTreatmentService';
import { useAppState } from '@/providers/AppStateProvider';

const VERDICT_COLORS = {
  SAFE: {
    primary: '#10B981',
    light: '#D1FAE5',
    dark: '#059669',
  },
  BORDERLINE: {
    primary: '#F59E0B',
    light: '#FEF3C7',
    dark: '#D97706',
  },
  AVOID: {
    primary: '#EF4444',
    light: '#FEE2E2',
    dark: '#DC2626',
  },
} as const;

type LoadingState = 'requesting_permission' | 'getting_location' | 'fetching_weather' | 'fetching_treatment' | 'done' | 'error';

type CustomLocation = {
  latitude: number;
  longitude: number;
  name: string;
} | null;

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    customLat?: string;
    customLon?: string;
    customName?: string;
    useCurrentLocation?: string;
  }>();
  
  const {
    hasCompletedOnboarding,
    isLoading: isAppStateLoading,
    updateLastRiskLevel,
  } = useAppState();
  
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('requesting_permission');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [treatmentData, setTreatmentData] = useState<RoadTreatmentData | null>(null);
  const [customLocation, setCustomLocation] = useState<CustomLocation>(null);
  const scaleAnim = useState(new Animated.Value(0))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];
  const hasInitialLoad = useRef(false);
  const lastLoadedParams = useRef<string | null>(null);

  useEffect(() => {
    if (!isAppStateLoading && hasCompletedOnboarding === false) {
      router.replace('/onboarding');
    }
  }, [hasCompletedOnboarding, isAppStateLoading, router]);

  const loadData = useCallback(async (isRefresh = false, locationOverride: CustomLocation = null) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
        scaleAnim.setValue(0);
        fadeAnim.setValue(0);
      }
      
      setErrorMessage(null);
      
      const useCustom = locationOverride;
      
      let lat: number;
      let lon: number;
      let name: string | null;
      
      if (useCustom) {
        lat = useCustom.latitude;
        lon = useCustom.longitude;
        name = useCustom.name;
        setLoadingState('fetching_weather');
        console.log('Using custom location:', useCustom);
      } else {
        setLoadingState('requesting_permission');
        
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
          setErrorMessage('Location permission is required to check road treatment risk in your area.');
          setLoadingState('error');
          return;
        }

        setLoadingState('getting_location');
        const location = await getCurrentLocation();
        if (!location) {
          setErrorMessage('Unable to get your location. Please check your settings and try again.');
          setLoadingState('error');
          return;
        }

        console.log('Location obtained:', location);
        lat = location.latitude;
        lon = location.longitude;
        name = await getLocationName(lat, lon);
      }
      
      setLocationName(name);

      setLoadingState('fetching_weather');
      const weatherConditions = await fetchWeatherData(lat, lon);
      
      setLoadingState('fetching_treatment');
      let roadTreatment: RoadTreatmentData | null = null;
      try {
        roadTreatment = await fetchRoadTreatmentData(lat, lon);
        console.log('Road treatment data:', roadTreatment);
        setTreatmentData(roadTreatment);
      } catch (treatmentError) {
        console.log('Road treatment fetch failed (non-blocking):', treatmentError);
      }
      
      const stateCode = roadTreatment?.stateCode || null;
      const risk = calculateRisk(weatherConditions, roadTreatment, stateCode);
      setAssessment(risk);
      setLoadingState('done');
      
      if (risk.verdict) {
        updateLastRiskLevel(risk.verdict);
      }

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('Error loading data:', error);
      setErrorMessage('Unable to fetch weather data. Please check your connection and try again.');
      setLoadingState('error');
    } finally {
      setIsRefreshing(false);
    }
  }, [scaleAnim, fadeAnim, updateLastRiskLevel]);

  useEffect(() => {
    const paramsKey = `${params.customLat}-${params.customLon}-${params.customName}-${params.useCurrentLocation}`;
    
    if (lastLoadedParams.current === paramsKey) {
      return;
    }
    
    if (params.customLat && params.customLon && params.customName) {
      lastLoadedParams.current = paramsKey;
      const newLocation = {
        latitude: parseFloat(params.customLat),
        longitude: parseFloat(params.customLon),
        name: params.customName,
      };
      setCustomLocation(newLocation);
      loadData(false, newLocation);
    } else if (params.useCurrentLocation === 'true') {
      lastLoadedParams.current = paramsKey;
      setCustomLocation(null);
      loadData(false, null);
    } else if (!hasInitialLoad.current) {
      hasInitialLoad.current = true;
      lastLoadedParams.current = paramsKey;
      loadData(false, null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.customLat, params.customLon, params.customName, params.useCurrentLocation]);

  const getLoadingMessage = () => {
    switch (loadingState) {
      case 'requesting_permission':
        return 'Requesting location access...';
      case 'getting_location':
        return 'Finding your location...';
      case 'fetching_weather':
        return 'Checking weather conditions...';
      case 'fetching_treatment':
        return 'Checking road treatment data...';
      default:
        return 'Loading...';
    }
  };

  if (loadingState === 'error') {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" />
        <SafeAreaView style={styles.errorSafeArea}>
          <View style={styles.errorContent}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Unable to Load</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryButtonPressed,
              ]}
              onPress={() => loadData()}
            >
              <RefreshCw size={18} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (loadingState !== 'done' || !assessment) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#6B7280" />
        <Text style={styles.loadingText}>{getLoadingMessage()}</Text>
      </View>
    );
  }

  const colors = VERDICT_COLORS[assessment.verdict];

  const handleWhyPress = () => {
    router.push({
      pathname: '/modal',
      params: {
        verdict: assessment.verdict,
        lastColdPrecipEvent: assessment.details.lastColdPrecipEvent,
        timeSinceRain: assessment.details.timeSinceRain,
        temperatureTrend: assessment.details.temperatureTrend,
        roadTreatment: assessment.details.roadTreatment || '',
        treatmentSource: treatmentData?.source || '',
        treatmentAvailable: treatmentData?.dataAvailable ? 'true' : 'false',
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.light }]}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.titleSpacer} />
              <Text style={styles.appTitle}>SALT RISK</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.settingsButton,
                  pressed && styles.settingsButtonPressed,
                ]}
                onPress={() => router.push('/settings')}
              >
                <Settings size={20} color="#6B7280" />
              </Pressable>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.locationButton,
                pressed && styles.locationButtonPressed,
              ]}
              onPress={() => router.push('/location-search')}
            >
              <MapPin size={14} color="#6B7280" />
              <Text style={styles.locationText}>{locationName || 'Select Location'}</Text>
              <ChevronDown size={14} color="#9CA3AF" />
            </Pressable>
            {treatmentData?.dataAvailable && (
              <View style={styles.dataSourceBadge}>
                <Text style={styles.dataSourceText}>
                  Live data: {treatmentData.source}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.verdictContainer}>
            <View
              style={[
                styles.verdictCircle,
                { backgroundColor: colors.primary, shadowColor: colors.dark },
              ]}
            >
              <Text style={styles.verdictText}>{assessment.verdict}</Text>
            </View>
          </View>

          <View style={styles.explanationContainer}>
            <Text style={[styles.explanation, { color: colors.dark }]}>
              {assessment.explanation}
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.whyButton,
                { backgroundColor: colors.primary },
                pressed && styles.whyButtonPressed,
              ]}
              onPress={handleWhyPress}
            >
              <HelpCircle size={18} color="#FFFFFF" />
              <Text style={styles.whyButtonText}>Why?</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.refreshButton,
                pressed && styles.refreshButtonPressed,
              ]}
              onPress={() => loadData(true, customLocation)}
              disabled={isRefreshing}
            >
              <RefreshCw 
                size={18} 
                color={colors.dark} 
                style={isRefreshing ? styles.spinning : undefined}
              />
            </Pressable>
          </View>
        </Animated.View>

        <View style={styles.footer}>
          <Text style={styles.disclaimer}>
            Risk estimate based on weather data and regional treatment signals when available.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#FEF2F2',
  },
  errorSafeArea: {
    flex: 1,
    justifyContent: 'center',
  },
  errorContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#991B1B',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#7F1D1D',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    gap: 8,
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  titleSpacer: {
    width: 36,
  },
  appTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: 2,
    color: '#374151',
    flex: 1,
    textAlign: 'center',
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  settingsButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  locationButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  dataSourceBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  dataSourceText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600' as const,
  },
  verdictContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  verdictCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  verdictText: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  explanationContainer: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  explanation: {
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    fontWeight: '600' as const,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  whyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 24,
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  whyButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  whyButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonPressed: {
    opacity: 0.6,
  },
  spinning: {
    opacity: 0.5,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: '#6B7280',
    fontWeight: '500' as const,
  },
});
