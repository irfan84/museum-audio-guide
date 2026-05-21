import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, STORAGE_KEYS } from '../constants';
import { getExhibits, getExhibitByNumber } from '../services/api';

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

export default function ExhibitsScreen({ navigation }) {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [exhibits, setExhibits] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
        if (savedLanguage) {
          setSelectedLanguage(savedLanguage);
        }
      } catch (err) {
        console.log('Failed to load language', err);
      }
    };

    loadLanguage();
  }, []);

  useEffect(() => {
    fetchExhibits();
  }, []);

  const fetchExhibits = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getExhibits(selectedLanguage);
      const raw = Array.isArray(response?.data) ? response.data : [];
      const seen = new Set();
      const unique = raw.filter((item) => {
        if (!item?.id) return false;
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      unique.sort((a, b) => {
        const aNum = Number(a.exhibit_number ?? 0);
        const bNum = Number(b.exhibit_number ?? 0);
        return aNum - bNum;
      });

      setExhibits(unique);
    } catch (err) {
      console.log('Exhibit fetch failed', err);
      setError('Unable to load exhibits. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'All',
    ...Array.from(
      new Set(exhibits.map((item) => item.category).filter(Boolean))
    ).sort(),
  ];

  const filteredExhibits = exhibits.filter((item) =>
    selectedCategory === 'All' ? true : item.category === selectedCategory
  );

  const handleExhibitPress = async (item) => {
    try {
      const response = await getExhibitByNumber(item.exhibit_number);
      navigation.navigate('Player', {
        exhibit: response.data,
        language: selectedLanguage,
      });
    } catch (err) {
      console.log('Failed to load exhibit detail', err);
      Alert.alert(
        'Unable to load exhibit',
        'Please try again or check your network connection.'
      );
    }
  };

  const renderChip = (category) => {
    const active = category === selectedCategory;
    return (
      <Pressable
        key={category}
        style={[
          styles.chip,
          active ? styles.chipActive : styles.chipInactive,
        ]}
        onPress={() => setSelectedCategory(category)}
      >
        <Text
          style={[
            styles.chipText,
            active ? styles.chipTextActive : styles.chipTextInactive,
          ]}
        >
          {category}
        </Text>
      </Pressable>
    );
  };

  const renderExhibitCard = ({ item }) => {
    // Capitalise first letter so 'geology' matches 'Geology'
const categoryKey = item.category
  ? item.category.charAt(0).toUpperCase() + item.category.slice(1).toLowerCase()
  : '';
const meta = categoryMeta[categoryKey] || {
  icon: 'leaf',
  label: item.category || 'Exhibit',
};

    return (
      <Pressable style={styles.card} onPress={() => handleExhibitPress(item)}>
        <View style={styles.cardLeft}>
          <View style={styles.cardIcon}>
            <Ionicons name={meta.icon} size={20} color={COLORS.green} />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberBadgeText}>#{item.exhibit_number}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>
              {meta.label} • {item.hall_name}
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.duration}>{formatDuration(item.duration_secs)}</Text>
          <Pressable
            style={styles.playButton}
            onPress={() => handleExhibitPress(item)}
          >
            <Ionicons name="play" size={18} color={COLORS.white} />
          </Pressable>
        </View>
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

    if (!filteredExhibits.length) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>No exhibits available</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredExhibits}
        keyExtractor={(item) => item.id?.toString() ?? String(item.exhibit_number)}
        renderItem={renderExhibitCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Exhibits</Text>
        <Text style={styles.headerSubtitle}>Tap any exhibit to hear its audio guide</Text>
      </View>

      <View style={styles.chipRowWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {categories.map(renderChip)}
        </ScrollView>
      </View>

      <View style={styles.content}>{renderContent()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
  },
  header: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 20,
  },
  chipRowWrapper: {
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayBorder,
  },
  chipRow: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  chipInactive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.green,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.white,
  },
  chipTextInactive: {
    color: COLORS.green,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  stateText: {
    marginTop: 16,
    color: COLORS.grayText,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: COLORS.green,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.black,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  numberBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.greenLight,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  numberBadgeText: {
    color: COLORS.green,
    fontWeight: '700',
    fontSize: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: COLORS.grayText,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  duration: {
    fontSize: 13,
    color: COLORS.grayText,
    marginBottom: 10,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
});