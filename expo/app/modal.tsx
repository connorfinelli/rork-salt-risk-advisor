import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
} from 'react-native';
import { CloudSnow, Droplets, Thermometer, Truck, AlertCircle, Bell } from 'lucide-react-native';
import { useAppState } from '@/providers/AppStateProvider';

const VERDICT_COLORS = {
  SAFE: '#10B981',
  BORDERLINE: '#F59E0B',
  AVOID: '#EF4444',
} as const;

export default function ModalScreen() {
  const params = useLocalSearchParams<{
    verdict: string;
    lastColdPrecipEvent: string;
    timeSinceRain: string;
    temperatureTrend: string;
    roadTreatment: string;
    treatmentSource: string;
    treatmentAvailable: string;
  }>();

  const { hasProAccess, notificationsEnabled, enableNotifications } = useAppState();
  const hasTreatmentData = params.treatmentAvailable === 'true';

  const handleNotificationPress = async () => {
    console.log('Get Risk Alerts pressed, hasProAccess:', hasProAccess);
    
    if (!hasProAccess) {
      console.log('Navigating to paywall');
      router.dismiss();
      router.push('/paywall');
      return;
    }
    
    if (Platform.OS === 'web') {
      Alert.alert(
        'Push Notifications',
        'Push notifications are only available on the mobile app. Please download the app to receive risk alerts.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    console.log('Enabling notifications...');
    const success = await enableNotifications();
    if (success) {
      console.log('Notifications enabled successfully');
      Alert.alert('Success', 'Risk alerts are now enabled!');
      router.dismiss();
    } else {
      console.log('Failed to enable notifications');
      Alert.alert(
        'Permission Required',
        'Please enable notifications in your device settings to receive risk alerts.',
        [{ text: 'OK' }]
      );
    }
  };

  const verdictColor =
    VERDICT_COLORS[params.verdict as keyof typeof VERDICT_COLORS] || '#6B7280';

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={true}
      onRequestClose={() => router.back()}
    >
      <Pressable style={styles.overlay} onPress={() => router.back()}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={[styles.headerDot, { backgroundColor: verdictColor }]} />
            <Text style={styles.title}>Risk Factors</Text>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.detailItem}>
              <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
                <CloudSnow size={24} color="#2563EB" />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Last Cold Precipitation</Text>
                <Text style={styles.detailValue}>{params.lastColdPrecipEvent}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
                <Droplets size={24} color="#2563EB" />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Time Since Rain</Text>
                <Text style={styles.detailValue}>{params.timeSinceRain}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
                <Thermometer size={24} color="#2563EB" />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Temperature Trend</Text>
                <Text style={styles.detailValue}>{params.temperatureTrend}</Text>
              </View>
            </View>

            {params.roadTreatment ? (
              <View style={styles.detailItem}>
                <View style={[styles.iconContainer, { backgroundColor: hasTreatmentData ? '#D1FAE5' : '#FEF3C7' }]}>
                  <Truck size={24} color={hasTreatmentData ? '#059669' : '#D97706'} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Road Treatment Status</Text>
                  <Text style={styles.detailValue}>{params.roadTreatment}</Text>
                  {hasTreatmentData && (
                    <View style={styles.liveDataBadge}>
                      <Text style={styles.liveDataText}>Live Data</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.detailItem}>
                <View style={[styles.iconContainer, { backgroundColor: '#F3F4F6' }]}>
                  <AlertCircle size={24} color="#6B7280" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Road Treatment Status</Text>
                  <Text style={[styles.detailValue, { color: '#6B7280' }]}>Data not available for your area</Text>
                </View>
              </View>
            )}

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {hasTreatmentData 
                  ? `Risk assessment includes live data from ${params.treatmentSource}. When available, official road treatment data takes priority in our calculations.`
                  : 'These conditions are inferred from weather patterns. Winter road treatment (salt, brine, sand) is typically applied during or before winter weather events when temperatures approach or fall below freezing.'
                }
              </Text>
            </View>

            {!notificationsEnabled && (
              <Pressable
                style={({ pressed }) => [
                  styles.notificationCta,
                  pressed && styles.notificationCtaPressed,
                ]}
                onPress={handleNotificationPress}
              >
                <View style={styles.notificationIconContainer}>
                  <Bell size={20} color="#FFFFFF" />
                </View>
                <View style={styles.notificationTextContainer}>
                  <Text style={styles.notificationTitle}>Get Risk Alerts</Text>
                  <Text style={styles.notificationSubtitle}>
                    {hasProAccess 
                      ? 'Enable notifications when conditions change'
                      : 'Unlock alerts when road conditions change'
                    }
                  </Text>
                </View>
                {!hasProAccess && (
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                )}
              </Pressable>
            )}
          </ScrollView>

          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: verdictColor },
              pressed && styles.closeButtonPressed,
            ]}
            onPress={() => router.back()}
          >
            <Text style={styles.closeButtonText}>Got it</Text>
          </Pressable>
        </Pressable>
      </Pressable>

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  headerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#111827',
  },
  scrollContent: {
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600' as const,
  },
  infoBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#4B5563',
    fontWeight: '500' as const,
  },
  liveDataBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  liveDataText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  notificationCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    gap: 12,
  },
  notificationCtaPressed: {
    backgroundColor: '#1F2937',
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500' as const,
  },
  proBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  closeButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonPressed: {
    opacity: 0.8,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600' as const,
    fontSize: 16,
  },
});
