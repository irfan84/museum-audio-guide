import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { STORAGE_KEYS } from '../constants';

export const useDeviceId = () => {
  const [deviceId, setDeviceId] = useState(null);

  useEffect(() => {
    const getOrCreateDeviceId = async () => {
      try {
        // Check if device ID already exists
        let id = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);

        if (!id) {
          // Generate a new random UUID — anonymous, not linked to any personal data
          id = await Crypto.randomUUID();
          await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, id);
        }

        setDeviceId(id);
      } catch (err) {
        console.error('Device ID error:', err);
      }
    };

    getOrCreateDeviceId();
  }, []);

  return deviceId;
};