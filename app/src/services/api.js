import axios from 'axios';
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
  try {
    await api.post('/api/events/scan', {
      device_id:     deviceId,
      exhibit_id:    exhibitId,
      language_code: languageCode,
      event_id:      eventId,
    });
  } catch (err) {
    // Silently fail — will be queued offline
    console.log('Scan event queued for offline sync');
  }
};

// Record an audio play event
export const recordPlay = async (deviceId, exhibitId, languageCode, eventId) => {
  try {
    const response = await api.post('/api/events/play', {
      device_id:     deviceId,
      exhibit_id:    exhibitId,
      language_code: languageCode,
      event_id:      eventId,
    });
    return response.data.play_event_id;
  } catch (err) {
    console.log('Play event queued for offline sync');
    return null;
  }
};

export default api;