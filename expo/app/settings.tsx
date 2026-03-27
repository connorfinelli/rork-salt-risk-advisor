import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Switch,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, Lock, ChevronLeft, Crown } from 'lucide-react-native';
import { useAppState } from '@/providers/AppStateProvider';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    hasProAccess,
    notificationsEnabled,
    enableNotifications,
    disableNotifications,
  } = useAppState();
  
  const [isToggling, setIsToggling] = useState(false);

  const handleNotificationToggle = async (value: boolean) => {
    if (!hasProAccess) {
      router.push('/paywall');
      return;
    }

    setIsToggling(true);
    try {
      if (value) {
        const success = await enableNotifications();
        if (!success) {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive risk alerts.'
          );
        }
      } else {
        await disableNotifications();
      }
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#374151" />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            
            <Pressable
              style={styles.settingItem}
              onPress={() => {
                if (!hasProAccess) {
                  router.push('/paywall');
                }
              }}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
                  <Bell size={20} color="#2563EB" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Risk Change Alerts</Text>
                  <Text style={styles.settingDescription}>
                    Get notified when road risk level changes
                  </Text>
                </View>
              </View>
              
              {hasProAccess ? (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotificationToggle}
                  disabled={isToggling}
                  trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                  thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                />
              ) : (
                <View style={styles.proRequired}>
                  <Lock size={14} color="#9CA3AF" />
                  <Text style={styles.proRequiredText}>Pro</Text>
                </View>
              )}
            </Pressable>
          </View>

          {!hasProAccess && (
            <Pressable
              style={({ pressed }) => [
                styles.upgradeCard,
                pressed && styles.upgradeCardPressed,
              ]}
              onPress={() => router.push('/paywall')}
            >
              <View style={styles.upgradeContent}>
                <Crown size={24} color="#F59E0B" />
                <View style={styles.upgradeTextContainer}>
                  <Text style={styles.upgradeTitle}>Unlock Pro Features</Text>
                  <Text style={styles.upgradeDescription}>
                    Get risk alerts, 7-day outlook, and more
                  </Text>
                </View>
              </View>
              <Text style={styles.upgradePrice}>$1.99</Text>
            </Pressable>
          )}

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>About Notifications</Text>
            <Text style={styles.infoText}>
              When enabled, you will receive a notification whenever the road treatment 
              risk level changes for your saved location. This helps you know the best 
              times to take your car out.
            </Text>
            {Platform.OS !== 'web' && (
              <Text style={styles.infoNote}>
                Note: Notifications are checked periodically and may be delayed 
                based on your device settings.
              </Text>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#111827',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#6B7280',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  proRequired: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  proRequiredText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 24,
  },
  upgradeCardPressed: {
    backgroundColor: '#FEF3C7',
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  upgradeTextContainer: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#92400E',
    marginBottom: 2,
  },
  upgradeDescription: {
    fontSize: 13,
    color: '#B45309',
  },
  upgradePrice: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#92400E',
  },
  infoSection: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    marginBottom: 8,
  },
  infoNote: {
    fontSize: 12,
    lineHeight: 18,
    color: '#9CA3AF',
    fontStyle: 'italic' as const,
  },
});
