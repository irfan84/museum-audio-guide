import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { STORAGE_KEYS } from '../constants';
import api from './api';

const QUEUE_KEY = STORAGE_KEYS.OFFLINE_QUEUE;

// Add an event to the offline queue
export const queueEvent = async (type, payload) => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push({ type, payload, queuedAt: new Date().toISOString() });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('Could not queue event', err);
  }
};

// Attempt to sync all queued events to the server
export const syncQueue = async () => {
  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return; // still offline — try later

    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return;

    const queue = JSON.parse(raw);
    if (queue.length === 0) return;

    const failed = [];

    for (const event of queue) {
      try {
        if (event.type === 'scan') {
          await api.post('/api/events/scan', event.payload);
        } else if (event.type === 'play') {
          await api.post('/api/events/play', event.payload);
        }
      } catch (err) {
        // Server rejected or unreachable — keep in queue
        failed.push(event);
      }
    }

    // Only keep events that failed to send
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  } catch (err) {
    console.warn('Queue sync error', err);
  }
};