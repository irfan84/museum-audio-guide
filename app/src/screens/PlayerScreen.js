import React, { useState, useEffect, useRef } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { COLORS, API_BASE_URL } from '../constants';
import { recordPlay } from '../services/api';
import { useDeviceId } from '../hooks/useDeviceId';
import { getCachedAudioUri } from '../services/audioCache';

const SAVED_EXHIBITS_KEY = 'pmnh_saved_exhibits';
const WAVEFORM_BARS = 12;

const formatTime = (millis) => {
  if (!millis || millis < 0) return '0:00';
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default function PlayerScreen({ navigation, route }) {
  const exhibit = route.params?.exhibit;
  const language = route.params?.language || 'en';
  const deviceId = useDeviceId();
  const soundRef = useRef(null);
  const playbackStatusRef = useRef(null);
  const eventIdRef = useRef(Math.random().toString(36).slice(2));

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [bookmarked, setBookmarked] = useState(false);
  const [activeTranscriptTab, setActiveTranscriptTab] = useState(language);
  const [waveformLevels, setWaveformLevels] = useState(
    Array.from({ length: WAVEFORM_BARS }, () => Math.random() * 0.6 + 0.4)
  );

  const titleTranslation =
    exhibit?.translations?.find((item) => item.language_code === language) ||
    exhibit?.translations?.find((item) => item.language_code === 'en') ||
    { title: exhibit?.title || 'Exhibit' };

  const transcriptEntry = exhibit?.translations?.find(
    (item) => item.language_code === activeTranscriptTab
  );

  const factEntry = exhibit?.facts?.find((item) => item.language_code === language);

  // Fix — use exhibit_number as the bookmark key so SavedScreen
  // can fetch exhibits correctly using getExhibitByNumber
  const loadBookmarkState = async () => {
    try {
      const saved = await AsyncStorage.getItem(SAVED_EXHIBITS_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      setBookmarked(
        Array.isArray(parsed) && parsed.includes(exhibit?.exhibit_number)
      );
    } catch (err) {
      console.log('Unable to load saved exhibits', err);
    }
  };

  const toggleBookmark = async () => {
    try {
      const saved = await AsyncStorage.getItem(SAVED_EXHIBITS_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      const current = Array.isArray(parsed) ? parsed : [];
      // Store exhibit_number not exhibit.id — SavedScreen uses getExhibitByNumber
      const updated = bookmarked
        ? current.filter((n) => n !== exhibit?.exhibit_number)
        : [...current, exhibit?.exhibit_number];
      await AsyncStorage.setItem(SAVED_EXHIBITS_KEY, JSON.stringify(updated));
      setBookmarked(!bookmarked);
    } catch (err) {
      console.log('Unable to save bookmark', err);
    }
  };

  // Animate waveform only when playing
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setWaveformLevels(
          Array.from({ length: WAVEFORM_BARS }, () => Math.random() * 0.6 + 0.4)
        );
      }, 350);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  useEffect(() => {
    loadBookmarkState();
  }, [exhibit?.exhibit_number]);

  useEffect(() => {
    const prepareAudio = async () => {
      if (!exhibit) {
        setError('No exhibit selected');
        setIsLoading(false);
        return;
      }

      const requestedAudio = exhibit.audio?.find(
        (item) => item.language_code === language
      );
      const audioItem =
        requestedAudio ||
        exhibit.audio?.find((item) => item.language_code === 'en');

      if (!audioItem?.file_path) {
        setError('Audio not available for this exhibit yet');
        setIsLoading(false);
        return;
      }

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });

        // Use cache — downloads on first play, serves locally after
        const audioUri = await getCachedAudioUri(audioItem.file_path);

        const { sound, status } = await Audio.Sound.createAsync(
          { uri: audioUri },
          {
            shouldPlay: false,
            rate: playbackRate,
            shouldCorrectPitch: true,
          },
          (playbackStatus) => {
            if (!playbackStatus.isLoaded) return;
            setPositionMillis(playbackStatus.positionMillis);
            setDurationMillis(playbackStatus.durationMillis || 0);
            setIsPlaying(playbackStatus.isPlaying);
            playbackStatusRef.current = playbackStatus;
            if (playbackStatus.didJustFinish) {
              setIsFinished(true);
              setIsPlaying(false);
            }
          }
        );

        soundRef.current = sound;
        setDurationMillis(status.durationMillis || 0);
      } catch (err) {
        console.log('Audio load error', err);
        setError('Unable to load audio. Please check your connection.');
      } finally {
        setIsLoading(false);
      }
    };

    prepareAudio();

    return () => {
      const unload = async () => {
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
      };
      unload();
    };
  }, [exhibit, language]);

  useEffect(() => {
    if (!deviceId || !exhibit?.id) return;
    recordPlay(deviceId, exhibit.id, language, eventIdRef.current);
  }, [deviceId, exhibit?.id, language]);

  const handlePlayPause = async () => {
    if (!soundRef.current) return;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch (err) {
      console.log('Play/pause error', err);
      Alert.alert('Playback error', 'Unable to play audio right now.');
    }
  };

  const handleReplay = async () => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.setPositionAsync(0);
      await soundRef.current.playAsync();
      setIsFinished(false);
      setPositionMillis(0);
    } catch (err) {
      console.log('Replay error', err);
    }
  };

  const handleSeek = async (offsetMillis) => {
    if (!soundRef.current) return;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) return;
      const nextPosition = Math.max(
        0,
        Math.min((status.positionMillis || 0) + offsetMillis, status.durationMillis || 0)
      );
      await soundRef.current.setPositionAsync(nextPosition);
      setPositionMillis(nextPosition);
    } catch (err) {
      console.log('Seek error', err);
    }
  };

  const handleChangeRate = async (rate) => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.setRateAsync(rate, true);
      setPlaybackRate(rate);
    } catch (err) {
      console.log('Rate change error', err);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${titleTranslation.title} — listen to the audio guide for exhibit #${exhibit?.exhibit_number} in the museum.`,
      });
    } catch (err) {
      console.log('Share error', err);
    }
  };

  const progressRatio = durationMillis ? positionMillis / durationMillis : 0;
  const activeBarCount = Math.round(progressRatio * WAVEFORM_BARS);

  return (
    <SafeAreaView style={styles.screen}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navIcon}>
          <Ionicons name="chevron-back" size={28} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={2}>
            {titleTranslation.title}
          </Text>
          <View style={styles.titleRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>#{exhibit?.exhibit_number ?? '-'}</Text>
            </View>
            <Text style={styles.subtitle} numberOfLines={1}>
              {exhibit?.hall_name} • {exhibit?.category}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={toggleBookmark} style={styles.bookmarkButton}>
          <Ionicons
            name={bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={COLORS.white}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Player card ── */}
        <View style={styles.playerCard}>
          <View style={styles.waveformRow}>
            {waveformLevels.map((level, index) => {
              const isActive = index < activeBarCount;
              return (
                <View
                  key={index}
                  style={[
                    styles.waveBar,
                    {
                      height: `${30 + level * 60}%`,
                      backgroundColor: isActive ? COLORS.gold : '#2D6A4F',
                    },
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{formatTime(positionMillis)}</Text>
            <Text style={styles.progressText}>{formatTime(durationMillis)}</Text>
          </View>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(Math.max(progressRatio, 0), 1) * 100}%` },
              ]}
            />
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              onPress={() => handleSeek(-10000)}
              style={styles.controlButton}
            >
              <Ionicons name="play-back" size={28} color={COLORS.greenLight} />
              <Text style={styles.controlLabel}>10s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={isFinished ? handleReplay : handlePlayPause}
              style={[
                styles.playButton,
                isFinished && styles.playButtonReplay,
              ]}
            >
              <Ionicons
                name={isFinished ? 'refresh' : isPlaying ? 'pause' : 'play'}
                size={32}
                color={COLORS.white}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSeek(10000)}
              style={styles.controlButton}
            >
              <Ionicons name="play-forward" size={28} color={COLORS.greenLight} />
              <Text style={styles.controlLabel}>10s</Text>
            </TouchableOpacity>
          </View>

          {isFinished && (
            <Text style={styles.finishedLabel}>
              Audio complete — tap ↺ to replay
            </Text>
          )}

          <View style={styles.speedRow}>
            {[0.75, 1, 1.5, 2].map((rate) => (
              <TouchableOpacity
                key={rate}
                style={[
                  styles.speedChip,
                  playbackRate === rate && styles.speedChipActive,
                ]}
                onPress={() => handleChangeRate(rate)}
              >
                <Text
                  style={
                    playbackRate === rate ? styles.speedTextActive : styles.speedText
                  }
                >
                  {rate}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Transcript ── */}
        <View style={styles.transcriptCard}>
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTranscriptTab === 'en' && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTranscriptTab('en')}
            >
              <Text
                style={
                  activeTranscriptTab === 'en'
                    ? styles.tabTextActive
                    : styles.tabText
                }
              >
                English
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTranscriptTab === 'ur' && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTranscriptTab('ur')}
            >
              <Text
                style={
                  activeTranscriptTab === 'ur'
                    ? styles.tabTextActive
                    : styles.tabText
                }
              >
                اردو
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.transcriptContent}>
            <Text
              style={
                activeTranscriptTab === 'ur'
                  ? styles.transcriptUrdu
                  : styles.transcriptText
              }
            >
              {transcriptEntry?.transcript_text || 'Transcript not available'}
            </Text>
          </View>
        </View>

        {/* ── Did you know ── */}
        {factEntry?.fact_text ? (
          <View style={styles.factCard}>
            <Text style={styles.factTitle}>💡 Did you know?</Text>
            <Text style={styles.factText}>{factEntry.fact_text}</Text>
          </View>
        ) : null}

        {/* ── Actions ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={toggleBookmark}>
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={COLORS.white}
            />
            <Text style={styles.actionText}>
              {bookmarked ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-social" size={20} color={COLORS.white} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── Loading overlay ── */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading audio…</Text>
        </View>
      )}

      {/* ── Error overlay ── */}
      {error && (
        <View style={styles.errorOverlay}>
          <Ionicons name="musical-notes-off" size={48} color={COLORS.grayText} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryText}>Go back</Text>
          </TouchableOpacity>
        </View>
      )}

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
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  navIcon: { padding: 6 },
  headerText: { flex: 1, marginLeft: 8 },
  title: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 10,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.greenLight,
    fontSize: 13,
    flexShrink: 1,
  },
  bookmarkButton: { padding: 6 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  playerCard: {
    margin: 16,
    borderRadius: 24,
    backgroundColor: COLORS.green,
    padding: 18,
    elevation: 3,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    marginBottom: 14,
  },
  waveBar: {
    flex: 1,
    marginHorizontal: 2,
    borderRadius: 4,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    color: COLORS.greenLight,
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarBackground: {
    height: 5,
    borderRadius: 4,
    backgroundColor: '#2D6A4F',
    overflow: 'hidden',
    marginBottom: 18,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 10,
  },
  controlButton: { alignItems: 'center' },
  controlLabel: {
    marginTop: 4,
    color: COLORS.greenLight,
    fontSize: 11,
    fontWeight: '600',
  },
  playButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  playButtonReplay: {
    backgroundColor: COLORS.greenMid,
  },
  finishedLabel: {
    color: COLORS.greenLight,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 12,
    opacity: 0.8,
  },
  speedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  speedChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D6A4F',
    marginHorizontal: 3,
    alignItems: 'center',
  },
  speedChipActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  speedText: { color: COLORS.greenLight, fontWeight: '700', fontSize: 12 },
  speedTextActive: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
  transcriptCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    marginBottom: 14,
  },
  tabRow: { flexDirection: 'row', marginBottom: 14 },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.grayLight,
    marginRight: 8,
    alignItems: 'center',
  },
  tabButtonActive: { backgroundColor: COLORS.green },
  tabText: { color: COLORS.grayText, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  transcriptContent: { minHeight: 80 },
  transcriptText: {
    color: COLORS.black,
    fontSize: 14,
    lineHeight: 22,
  },
  transcriptUrdu: {
    color: COLORS.black,
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  factCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    backgroundColor: COLORS.goldLight,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  factTitle: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  factText: {
    color: '#633806',
    fontSize: 13,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
    borderRadius: 14,
    paddingVertical: 13,
    marginHorizontal: 5,
  },
  actionText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 7,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    color: COLORS.grayText,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: COLORS.green,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
});