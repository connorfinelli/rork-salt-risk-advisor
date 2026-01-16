import { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Snowflake, Shield, Bell } from 'lucide-react-native';
import { useAppState } from '@/providers/AppStateProvider';

type OnboardingStep = 0 | 1 | 2;

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useAppState();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = (nextStep: OnboardingStep) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(nextStep);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleContinue = () => {
    if (currentStep < 2) {
      animateTransition((currentStep + 1) as OnboardingStep);
    }
  };

  const handleUnlock = () => {
    completeOnboarding();
    router.replace('/paywall');
  };

  const handleSkip = async () => {
    await completeOnboarding();
    router.replace('/');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Snowflake size={48} color="#374151" strokeWidth={1.5} />
              </View>
            </View>
            <Text style={styles.title}>
              Winter roads can hide treatment residue.
            </Text>
            <Text style={styles.subtitle}>
              Road treatment residue (salt, brine, sand) can linger long after storms end, even when roads look dry.
            </Text>
          </>
        );
      case 1:
        return (
          <>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Shield size={48} color="#374151" strokeWidth={1.5} />
              </View>
            </View>
            <Text style={styles.title}>
              This app estimates treatment risk so you don&apos;t have to guess.
            </Text>
            <View style={styles.bulletContainer}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Weather + temperature inference</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Regional winter-treatment signals (when available)</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Simple SAFE / BORDERLINE / AVOID verdicts</Text>
              </View>
            </View>
            <Text style={styles.footerMicro}>
              Advisory estimate — always check conditions before driving.
            </Text>
          </>
        );
      case 2:
        return (
          <>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Bell size={48} color="#374151" strokeWidth={1.5} />
              </View>
            </View>
            <Text style={styles.title}>
              Want earlier warnings?
            </Text>
            <View style={styles.bulletContainer}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>7-day outlook</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Alerts when safe windows open</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Higher confidence after winter storms</Text>
              </View>
            </View>
          </>
        );
    }
  };

  const renderButtons = () => {
    if (currentStep < 2) {
      return (
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleContinue}
        >
          <Text style={styles.primaryButtonText}>
            {currentStep === 1 ? 'See my risk' : 'Continue'}
          </Text>
        </Pressable>
      );
    }

    return (
      <View style={styles.buttonGroup}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleUnlock}
        >
          <Text style={styles.primaryButtonText}>Unlock full access</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
          onPress={handleSkip}
        >
          <Text style={styles.secondaryButtonText}>Continue with today only</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.progressContainer}>
          {[0, 1, 2].map((step) => (
            <View
              key={step}
              style={[
                styles.progressDot,
                currentStep >= step && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {renderStep()}
        </Animated.View>

        <View style={styles.buttonContainer}>
          {renderButtons()}
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
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 40,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    backgroundColor: '#374151',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#111827',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  bulletContainer: {
    marginTop: 24,
    gap: 16,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#374151',
    marginTop: 8,
  },
  bulletText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    flex: 1,
  },
  footerMicro: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 32,
  },
  buttonContainer: {
    paddingHorizontal: 32,
    paddingBottom: 20,
  },
  buttonGroup: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonPressed: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
});
