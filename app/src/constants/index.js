// PMNH brand colours
export const COLORS = {
  green:       '#1B4332',
  greenMid:    '#2D6A4F',
  greenLight:  '#D8F3DC',
  gold:        '#B7791F',
  goldLight:   '#FAEEDA',
  white:       '#FFFFFF',
  black:       '#111827',
  grayText:    '#6B7280',
  grayLight:   '#F3F4F6',
  grayBorder:  '#E5E7EB',
};

// Your backend API URL
// Change this to your production URL before launch
export const API_BASE_URL = 'http://192.168.0.102:3000';

// Supported languages
export const LANGUAGES = [
  { code: 'en', label: 'English', rtl: false },
  { code: 'ur', label: 'اردو',    rtl: true  },
];

// AsyncStorage keys
export const STORAGE_KEYS = {
  LANGUAGE:      'pmnh_language',
  DEVICE_ID:     'pmnh_device_id',
  CACHED_AUDIO:  'pmnh_cached_audio',
  OFFLINE_QUEUE: 'pmnh_offline_queue',
  ONBOARDED:     'pmnh_onboarded', 
};