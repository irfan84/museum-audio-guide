import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, STORAGE_KEYS } from '../constants';
import { getExhibitByQR, recordScan } from '../services/api';
import { useDeviceId } from '../hooks/useDeviceId';

export default function ScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [scanning, setScanning] = useState(true);
  const deviceId = useDeviceId();

  useEffect(() => {
    const init = async () => {
      // Load saved language
      try {
        const storedLanguage = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
        if (storedLanguage) setSelectedLanguage(storedLanguage);
      } catch (err) {
        console.log('Error loading language', err);
      }
      // Request camera permission if not yet granted
      if (!permission?.granted) {
        await requestPermission();
      }
    };
    init();
  }, []);

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const onBarcodeScanned = useCallback(
    async ({ data }) => {
      if (!scanning) return;

      setScanning(false);
      const token = data?.split('/').filter(Boolean).pop();

      if (!token) {
        Alert.alert('Invalid QR code', 'Please try again.');
        setTimeout(() => setScanning(true), 2000);
        return;
      }

      try {
        const result = await getExhibitByQR(token);
        const exhibit = result?.data;

        if (!exhibit) {
          throw new Error('No exhibit data');
        }

        const eventId = Math.random().toString(36).slice(2);

        if (deviceId) {
          recordScan(deviceId, exhibit.id, selectedLanguage, eventId);
        }

        navigation.navigate('Player', {
          exhibit,
          language: selectedLanguage,
        });
      } catch (err) {
        Alert.alert('Exhibit not found', 'Please try again.');
        setTimeout(() => setScanning(true), 2000);
      }
    },
    [deviceId, navigation, scanning, selectedLanguage]
  );

  // Still loading permission state
  if (!permission) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan QR Code</Text>
          <Text style={styles.subtitle}>Point camera at exhibit label</Text>
        </View>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Requesting camera permission...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission denied — must go to settings
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan QR Code</Text>
          <Text style={styles.subtitle}>Point camera at exhibit label</Text>
        </View>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Camera access is required to scan QR codes.
            Please enable camera permission in settings.
          </Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={handleOpenSettings}
          >
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Camera ready
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Scan QR Code</Text>
        <Text style={styles.subtitle}>Point camera at exhibit label</Text>
      </View>

      <View style={styles.cameraWrapper}>
        <CameraView
          style={styles.camera}
          barCodeScannerSettings={{ barCodeTypes: ['qr'] }}
          onBarcodeScanned={onBarcodeScanned}
        >
          <View style={styles.overlay}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </CameraView>
      </View>

      <View style={styles.hintCard}>
        <Text style={styles.hintText}>
          Can't scan? Browse exhibits by number
        </Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Exhibits')}
        >
          <Text style={styles.browseButtonText}>Browse Exhibits</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  title: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 20,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  permissionText: {
    color: COLORS.black,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  settingsButton: {
    backgroundColor: COLORS.gold,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  settingsButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  cameraWrapper: {
    flex: 1,
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.black,
  },
  camera: {
    flex: 1,
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: COLORS.green,
  },
  topLeft: {
    top: '35%',
    left: '15%',
    borderLeftWidth: 4,
    borderTopWidth: 4,
  },
  topRight: {
    top: '35%',
    right: '15%',
    borderRightWidth: 4,
    borderTopWidth: 4,
  },
  bottomLeft: {
    bottom: '35%',
    left: '15%',
    borderLeftWidth: 4,
    borderBottomWidth: 4,
  },
  bottomRight: {
    bottom: '35%',
    right: '15%',
    borderRightWidth: 4,
    borderBottomWidth: 4,
  },
  hintCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 18,
    shadowColor: COLORS.black,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  hintText: {
    color: COLORS.black,
    fontSize: 16,
    marginBottom: 16,
  },
  browseButton: {
    backgroundColor: COLORS.green,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  browseButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});