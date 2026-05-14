import React, { useEffect, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, STORAGE_KEYS } from '../constants';

const steps = [
  {
    icon: 'qr-code',
    title: 'Scan any exhibit',
    description:
      'Find a QR code label next to any museum exhibit and point your camera at it',
  },
  {
    icon: 'headset',
    title: 'Hear the story',
    description:
      'Audio commentary plays instantly in your chosen language — Urdu or English',
  },
  {
    icon: 'grid',
    title: 'Browse exhibits',
    description:
      "Can't scan? Open the Exhibits tab to see all exhibits by number and tap to play",
  },
];

const OnboardingModal = () => {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const checkOnboarded = async () => {
      try {
        const onboarded = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDED);
        if (onboarded !== 'true') {
          setVisible(true);
        }
      } catch (error) {
        setVisible(true);
      }
    };

    checkOnboarded();
  }, []);

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDED, 'true');
    } catch (error) {
      // ignore storage failures silently
    }
    setVisible(false);
  };

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <Ionicons name={steps[stepIndex].icon} size={52} color={COLORS.green} />
            </View>
            <Text style={styles.stepTitle}>{steps[stepIndex].title}</Text>
            <Text style={styles.stepDescription}>{steps[stepIndex].description}</Text>
          </View>

          <View style={styles.bottomArea}>
            <View style={styles.progressContainer}>
              {steps.map((_, index) => {
                const isActive = index === stepIndex;
                return (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      isActive ? styles.activeDot : styles.inactiveDot,
                    ]}
                  />
                );
              })}
            </View>

            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>
                {stepIndex === steps.length - 1 ? 'Get Started' : 'Next'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: 16,
  },
  stepDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.grayText,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  bottomArea: {
    width: '100%',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  dot: {
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.greenMid,
    marginHorizontal: 5,
  },
  inactiveDot: {
    width: 10,
    opacity: 0.4,
  },
  activeDot: {
    width: 24,
    opacity: 1,
  },
  nextButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 8,
  },
  skipText: {
    color: COLORS.grayText,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OnboardingModal;
