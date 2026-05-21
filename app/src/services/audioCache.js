import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS } from '../constants';

const CACHE_DIR = `${FileSystem.cacheDirectory}pmnh_audio/`;
const CACHE_INDEX_KEY = STORAGE_KEYS.CACHED_AUDIO;

// Ensure cache directory exists
const ensureCacheDir = async () => {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
};

// Load the cache index — maps remote URLs to local file paths
const loadCacheIndex = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_INDEX_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

// Save updated cache index
const saveCacheIndex = async (index) => {
  try {
    await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
  } catch (err) {
    console.warn('Could not save cache index', err);
  }
};

// Get the local URI for an audio file — downloads if not cached
export const getCachedAudioUri = async (filePath) => {
  const cleanPath = filePath
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
  const remoteUrl = `${API_BASE_URL}/${cleanPath}`;

  try {
    await ensureCacheDir();
    const index = await loadCacheIndex();

    // Return cached file if it exists
    if (index[remoteUrl]) {
      const localInfo = await FileSystem.getInfoAsync(index[remoteUrl]);
      if (localInfo.exists) {
        return index[remoteUrl]; // ← serve from local cache
      }
    }

    // Not cached — download and save
    const fileName = cleanPath.replace(/\//g, '_');
    const localUri = `${CACHE_DIR}${fileName}`;

    await FileSystem.downloadAsync(remoteUrl, localUri);

    // Save to index for next time
    index[remoteUrl] = localUri;
    await saveCacheIndex(index);

    return localUri;
  } catch (err) {
    console.warn('Cache miss — falling back to remote URL:', err.message);
    return remoteUrl; // fallback to streaming if download fails
  }
};

// Clear entire audio cache — useful for freeing storage
export const clearAudioCache = async () => {
  try {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    await AsyncStorage.removeItem(CACHE_INDEX_KEY);
  } catch (err) {
    console.warn('Could not clear cache', err);
  }
};