import { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { useAppState } from '@/providers/AppStateProvider';

const FEATURES = [
  '7-day salt risk outlook',
  'Safe-to-drive alerts',
  'Regional confidence signals',
  'Future updates included',
];

export default function PaywallScreen() {
  const router = useRouter();
  const {
    purchaseLifetime,
    restorePurchases,
    trackPaywallViewed,
    trackPaywallDismissed,
  } = useAppState();

  useEffect(() => {
    trackPaywallViewed();
  }, [trackPaywallViewed]);

  const handlePurchase = async () => {
    const success = await purchaseLifetime();
    if (success) {
      router.replace('/');
    }
  };

  const handleRestore = async () => {
    const restored = await restorePurchases();
    if (restored) {
      Alert.alert('Restored', 'Your purchase has been restored.');
      router.replace('/');
    } else {
      Alert.alert('No Purchase Found', 'We could not find a previous purchase to restore.');
    }
  };

  const handleDismiss = () => {
    trackPaywallDismissed();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed,
            ]}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color="#6B7280" />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleSection}>
            <Text style={styles.title}>Full Salt Risk Access</Text>
            <Text style={styles.subtitle}>Know when it{"'"}s safe — not just today.</Text>
          </View>

          <View style={styles.featuresSection}>
            {FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.checkCircle}>
                  <Check size={14} color="#059669" strokeWidth={3} />
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <View style={styles.pricingSection}>
            <View style={styles.priceBox}>
              <Text style={styles.price}>$1.99</Text>
              <Text style={styles.priceLabel}>Lifetime Access</Text>
            </View>
            <Text style={styles.priceSubtext}>One-time purchase. No subscription.</Text>
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.purchaseButton,
              pressed && styles.purchaseButtonPressed,
            ]}
            onPress={handlePurchase}
          >
            <Text style={styles.purchaseButtonText}>Unlock Lifetime Access</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.skipButton,
              pressed && styles.skipButtonPressed,
            ]}
            onPress={handleDismiss}
          >
            <Text style={styles.skipButtonText}>Continue with today only</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.restoreButton,
              pressed && styles.restoreButtonPressed,
            ]}
            onPress={handleRestore}
          >
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          </Pressable>
        </View>

        <View style={styles.trustFooter}>
          <Text style={styles.trustText}>Estimates are advisory only.</Text>
          <Text style={styles.trustText}>No account required. No ads.</Text>
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
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    backgroundColor: '#E5E7EB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 20,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: '#6B7280',
    textAlign: 'center',
  },
  featuresSection: {
    marginBottom: 40,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500' as const,
  },
  pricingSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  priceBox: {
    backgroundColor: '#111827',
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  price: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#9CA3AF',
    marginTop: 4,
  },
  priceSubtext: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600' as const,
  },
  buttonContainer: {
    paddingHorizontal: 32,
    paddingBottom: 8,
    gap: 8,
  },
  purchaseButton: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  purchaseButtonPressed: {
    backgroundColor: '#1F2937',
  },
  purchaseButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonPressed: {
    opacity: 0.6,
  },
  skipButtonText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  restoreButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  restoreButtonPressed: {
    opacity: 0.6,
  },
  restoreButtonText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500' as const,
  },
  trustFooter: {
    paddingHorizontal: 32,
    paddingBottom: 16,
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
