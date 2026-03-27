import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { registerWithReplit, unregisterFromReplit } from '@/utils/replitNotificationService';

const STORAGE_KEYS = {
  HAS_COMPLETED_ONBOARDING: 'hasCompletedOnboarding',
  HAS_PRO_ACCESS: 'hasProAccess',
  NOTIFICATIONS_ENABLED: 'notificationsEnabled',
  PUSH_TOKEN: 'pushToken',
  LAST_RISK_LEVEL: 'lastRiskLevel',
  SAVED_LOCATION: 'savedLocation',
};

interface SavedLocation {
  latitude: number;
  longitude: number;
  name: string;
  state: string;
}

type RiskLevel = 'SAFE' | 'BORDERLINE' | 'AVOID';

export const [AppStateProvider, useAppState] = createContextHook(() => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [hasProAccess, setHasProAccess] = useState<boolean>(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [lastRiskLevel, setLastRiskLevel] = useState<RiskLevel | null>(null);
  const [savedLocation, setSavedLocation] = useState<SavedLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredState();
  }, []);

  const loadStoredState = async () => {
    try {
      const [onboarding, pro, notifications, token, risk, location] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.HAS_COMPLETED_ONBOARDING),
        AsyncStorage.getItem(STORAGE_KEYS.HAS_PRO_ACCESS),
        AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_RISK_LEVEL),
        AsyncStorage.getItem(STORAGE_KEYS.SAVED_LOCATION),
      ]);

      setHasCompletedOnboarding(onboarding === 'true');
      setHasProAccess(pro === 'true');
      setNotificationsEnabled(notifications === 'true');
      setPushToken(token);
      setLastRiskLevel(risk as RiskLevel | null);
      if (location) {
        try {
          setSavedLocation(JSON.parse(location));
        } catch (e) {
          console.error('Failed to parse saved location:', e);
        }
      }
    } catch (error) {
      console.error('Error loading stored state:', error);
      setHasCompletedOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.HAS_COMPLETED_ONBOARDING, 'true');
    setHasCompletedOnboarding(true);
    console.log('[Analytics] onboarding_completed', { timestamp: new Date().toISOString() });
  }, []);

  const purchaseLifetime = useCallback(async () => {
    console.log('[Analytics] lifetime_purchase_started', { timestamp: new Date().toISOString() });
    await AsyncStorage.setItem(STORAGE_KEYS.HAS_PRO_ACCESS, 'true');
    setHasProAccess(true);
    console.log('[Analytics] lifetime_purchase_completed', { timestamp: new Date().toISOString() });
    return true;
  }, []);

  const restorePurchases = useCallback(async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.HAS_PRO_ACCESS);
    if (stored === 'true') {
      setHasProAccess(true);
      return true;
    }
    return false;
  }, []);

  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      console.log('Push notifications not supported on web');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission denied');
        return null;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      if (!projectId) {
        console.log('No EAS projectId found - push notifications require an EAS project');
        return null;
      }
      
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      
      const token = tokenData.data;
      console.log('Push token:', token);
      
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);
      setPushToken(token);
      
      if (savedLocation) {
        try {
          await registerWithReplit({
            pushToken: token,
            latitude: savedLocation.latitude,
            longitude: savedLocation.longitude,
            locationName: savedLocation.name,
            state: savedLocation.state,
            lastRiskLevel: lastRiskLevel,
          });
          console.log('Push token registered with Replit backend');
        } catch (backendError) {
          console.log('Replit registration failed (non-blocking):', backendError);
        }
      } else {
        console.log('No saved location - skipping Replit registration');
      }
      
      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }, [lastRiskLevel, savedLocation]);

  const enableNotifications = useCallback(async () => {
    if (!hasProAccess) {
      console.log('Notifications require pro access');
      return false;
    }

    const token = await registerForPushNotifications();
    if (token) {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, 'true');
      setNotificationsEnabled(true);
      return true;
    }
    return false;
  }, [hasProAccess, registerForPushNotifications]);

  const disableNotifications = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, 'false');
    setNotificationsEnabled(false);
    
    if (pushToken) {
      try {
        await unregisterFromReplit({ pushToken });
        console.log('Push token unregistered from Replit backend');
      } catch (backendError) {
        console.log('Replit unregistration failed (non-blocking):', backendError);
      }
    }
  }, [pushToken]);

  const updateLastRiskLevel = useCallback(async (risk: RiskLevel) => {
    const previousRisk = lastRiskLevel;
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_RISK_LEVEL, risk);
    setLastRiskLevel(risk);
    
    if (previousRisk && previousRisk !== risk && notificationsEnabled && hasProAccess && pushToken) {
      console.log(`Risk changed from ${previousRisk} to ${risk}`);
      return { changed: true, from: previousRisk, to: risk };
    }
    return { changed: false };
  }, [lastRiskLevel, notificationsEnabled, hasProAccess, pushToken]);

  const trackEvent = useCallback((event: string) => {
    console.log(`[Analytics] ${event}`, { timestamp: new Date().toISOString() });
  }, []);

  const trackPaywallViewed = useCallback(() => {
    trackEvent('paywall_viewed');
  }, [trackEvent]);

  const trackPaywallDismissed = useCallback(() => {
    trackEvent('paywall_dismissed');
  }, [trackEvent]);

  const updateSavedLocation = useCallback(async (location: SavedLocation) => {
    await AsyncStorage.setItem(STORAGE_KEYS.SAVED_LOCATION, JSON.stringify(location));
    setSavedLocation(location);
    console.log('Saved location updated:', location.name);
    
    if (pushToken && notificationsEnabled && hasProAccess) {
      try {
        await registerWithReplit({
          pushToken,
          latitude: location.latitude,
          longitude: location.longitude,
          locationName: location.name,
          state: location.state,
          lastRiskLevel: lastRiskLevel,
        });
        console.log('Location updated on Replit backend');
      } catch (error) {
        console.log('Replit location update failed (non-blocking):', error);
      }
    }
  }, [pushToken, notificationsEnabled, hasProAccess, lastRiskLevel]);

  return {
    hasCompletedOnboarding,
    hasProAccess,
    notificationsEnabled,
    pushToken,
    lastRiskLevel,
    savedLocation,
    isLoading,
    completeOnboarding,
    purchaseLifetime,
    restorePurchases,
    enableNotifications,
    disableNotifications,
    updateLastRiskLevel,
    updateSavedLocation,
    registerForPushNotifications,
    trackPaywallViewed,
    trackPaywallDismissed,
    trackEvent,
  };
});
