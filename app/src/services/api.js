import axios from 'axios';
import { queueEvent } from './offlineQueue';
import { API_BASE_URL } from '../constants';

// Create axios instance with base URL and timeout
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,  // 10 second timeout
});

// ── Exhibit endpoints ─────────────────────────────────

// Get all live exhibits (home screen list)
export const getExhibits = async (languageCode = 'en') => {
  const response = await api.get('/api/exhibits');
  return response.data;
};

// Get single exhibit by ID
export const getExhibitById = async (id) => {
  const response = await api.get(`/api/exhibits/${id}`);
  return response.data;
};

// Get exhibit by QR token — called when visitor scans
export const getExhibitByQR = async (token) => {
  const response = await api.get(`/api/exhibits/qr/${token}`);
  return response.data;
};

// Get exhibit by number — called when visitor taps from list
export const getExhibitByNumber = async (number) => {
  const response = await api.get(`/api/exhibits/number/${number}`);
  return response.data;
};

// ── Analytics endpoints ───────────────────────────────

// Record a QR scan event
export const recordScan = async (deviceId, exhibitId, languageCode, eventId) => {
  const payload = {
    device_id:     deviceId,
    exhibit_id:    exhibitId,
    language_code: languageCode,
    event_id:      eventId,
  };
  try {
    await api.post('/api/events/scan', payload);
  } catch (err) {
    // Offline — save to queue for later sync
    await queueEvent('scan', payload);
  }
};

// Record an audio play event
export const recordPlay = async (deviceId, exhibitId, languageCode, eventId) => {
  const payload = {
    device_id:     deviceId,
    exhibit_id:    exhibitId,
    language_code: languageCode,
    event_id:      eventId,
  };
  try {
    const response = await api.post('/api/events/play', payload);
    return response.data.play_event_id;
  } catch (err) {
    // Offline — save to queue for later sync
    await queueEvent('play', payload);
    return null;
  }
};

export default api;