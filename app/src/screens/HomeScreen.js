import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import OnboardingModal from '../components/OnboardingModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, LANGUAGES, STORAGE_KEYS } from '../constants';
import { getExhibits } from '../services/api';

const categoryMeta = {
  Geology:       { icon: 'mountain', label: 'Geology' },
  Botany:        { icon: 'leaf',     label: 'Botany' },
  Palaeontology: { icon: 'skull',    label: 'Palaeontology' },
};

const formatDuration = (seconds = 0) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins} min ${secs} sec`;
};

export default function HomeScreen({ navigation }) {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [exhibits, setExhibits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
        if (saved) setSelectedLanguage(saved);
      } catch (err) {
        console.log('Unable to load language from storage', err);
      }
    };
    loadLanguage();
    fetchExhibits();
  }, []);

  const fetchExhibits = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExhibits(selectedLanguage);
      const raw = Array.isArray(data.data) ? data.data : [];
      const seen = new Set();
      const unique = raw
        .filter(item => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        })
        .slice(0, 3);
      setExhibits(unique);
    } catch (err) {
      setError('Unable to load exhibits.');
    } finally {
      setLoading(false);
    }
  };

  const handleLanguagePress = async (code) => {
    setSelectedLanguage(code);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, code);
    } catch (err) {
      console.log('Unable to save language selection', err);
    }
  };

  const renderExhibitCard = ({ item }) => {
    const meta = categoryMeta[item.category] || {
      icon: 'leaf',
      label: item.category || 'Exhibit',
    };

    return (
      <Pressable
        style={styles.exhibitCard}
        onPress={() => navigation.navigate('Scan')}
      >
        <View style={styles.exhibitIconWrapper}>
          <Ionicons name={meta.icon} size={22} color={COLORS.green} />
        </View>
        <View style={styles.exhibitInfo}>
          {item.exhibit_number != null && (
            <View style={styles.numberBadge}>
              <Text style={styles.numberBadgeText}>#{item.exhibit_number}</Text>
            </View>
          )}
          <Text style={styles.exhibitTitle}>{item.title}</Text>
          <Text style={styles.exhibitMeta}>{meta.label} • {item.hall_name}</Text>
        </View>
        <Text style={styles.exhibitDuration}>
          {formatDuration(item.duration_secs)}
        </Text>
      </Pressable>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator size={36} color={COLORS.green} />
          <Text style={styles.stateText}>Loading exhibits...</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchExhibits}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    if (!exhibits.length) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>No exhibits available</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={exhibits}
        keyExtractor={(item) => item.id?.toString() || item.title}
        renderItem={renderExhibitCard}
        contentContainerStyle={styles.exhibitList}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── HEADER — matches design: green rounded card ── */}
      <View style={styles.header}>

        {/* Top row: title + logo */}
        <View style={styles.headerTop}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerTitle}>PMNH Audio Guide</Text>
            <Text style={styles.headerSubtitle}>
              Pakistan Museum of Natural History
            </Text>
          </View>
          {/* Logo circle — gold leaf on dark green */}
          <View style={styles.logoCircle}>
            <Ionicons name="leaf" size={18} color="#EF9F27" />
          </View>
        </View>

        {/* Language chips row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.langRow}
        >
          {LANGUAGES.map((lang) => {
            const active = selectedLanguage === lang.code;
            return (
              <Pressable
                key={lang.code}
                style={[
                  styles.langChip,
                  active ? styles.langChipActive : styles.langChipInactive,
                ]}
                onPress={() => handleLanguagePress(lang.code)}
              >
                <Text style={[
                  styles.langLabel,
                  active ? styles.langLabelActive : styles.langLabelInactive,
                ]}>
                  {lang.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── SCROLLABLE BODY ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scan hero card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrapper}>
            <Ionicons name="qr-code" size={44} color={COLORS.white} />
          </View>
          <Text style={styles.heroTitle}>Scan an exhibit QR code</Text>
          <Text style={styles.heroSubtitle}>
            Point your camera at any exhibit label
          </Text>
          <Pressable
            style={styles.heroButton}
            onPress={() => navigation.navigate('Scan')}
          >
            <Ionicons
              name="camera-outline"
              size={16}
              color={COLORS.white}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.heroButtonText}>Open Scanner</Text>
          </Pressable>
        </View>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Exhibits</Text>
        </View>

        {/* Hint text */}
        <Text style={styles.hintText}>
          Can't scan? Find your exhibit number below and tap ▶
        </Text>

        {/* Exhibit list — first 3 */}
        {renderContent()}

        {/* View all button */}
        {!loading && !error && exhibits.length > 0 && (
          <Pressable
            style={styles.viewAllBtn}
            onPress={() => navigation.navigate('Exhibits')}
          >
            <Text style={styles.viewAllText}>View all exhibits →</Text>
          </Pressable>
        )}

      </ScrollView>

      {/* Onboarding — shows on first launch only */}
      <OnboardingModal />

      {/* DEV ONLY — remove before launch */}
      <Pressable
       onPress={() => AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDED)}
       style={{ padding: 8, alignItems: 'center', marginTop: 8 }}
      >
      <Text style={{ fontSize: 10, color: COLORS.grayText }}>
      Reset onboarding (dev only)
      </Text>
  </Pressable>
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  // ── Safe area wraps everything ──────────────────────
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.green, // matches header colour at top
  },

  // ── Header ─────────────────────────────────────────
  header: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerTextGroup: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: '#95D5B2',
    fontSize: 11,
    marginTop: 3,
  },
  // Logo circle — small rounded box with gold leaf
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Language chips
  langRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2,
  },
  langChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  langChipActive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  langChipInactive: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  langLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  langLabelActive: {
    color: COLORS.green,
  },
  langLabelInactive: {
    color: 'rgba(255,255,255,0.75)',
  },

  // ── Scroll body ─────────────────────────────────────
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 32,
  },

  // ── Scan hero card ──────────────────────────────────
  heroCard: {
    backgroundColor: COLORS.greenMid,
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  heroIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: '#D8F3DC',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  heroButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  heroButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Exhibits section ────────────────────────────────
  sectionHeader: {
    marginBottom: 6,
  },
  sectionTitle: {
    color: COLORS.black,
    fontSize: 17,
    fontWeight: '700',
  },
  hintText: {
    fontSize: 12,
    color: COLORS.grayText,
    marginBottom: 10,
    lineHeight: 18,
  },

  // ── Exhibit cards ───────────────────────────────────
  exhibitList: {
    paddingBottom: 8,
  },
  exhibitCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
  },
  exhibitIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exhibitInfo: {
    flex: 1,
  },
  numberBadge: {
    backgroundColor: COLORS.greenLight,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignSelf: 'flex-start',
    marginBottom: 3,
  },
  numberBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.green,
  },
  exhibitTitle: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  exhibitMeta: {
    color: COLORS.grayText,
    fontSize: 12,
  },
  exhibitDuration: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 0,
    marginLeft: 6,
  },

  // ── States ──────────────────────────────────────────
  stateContainer: {
    padding: 24,
    alignItems: 'center',
  },
  stateText: {
    color: COLORS.grayText,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 14,
    backgroundColor: COLORS.green,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },

  // ── View all button ─────────────────────────────────
  viewAllBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.green,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: COLORS.white,
  },
  viewAllText: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: '700',
  },
});