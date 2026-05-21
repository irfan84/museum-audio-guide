import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, STORAGE_KEYS } from '../constants';
import { getExhibitByNumber } from '../services/api';

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

export default function SavedScreen({ navigation }) {
  const [language, setLanguage] = useState('en');
  const [savedExhibits, setSavedExhibits] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSavedExhibits = useCallback(async () => {
    setLoading(true);

    try {
      const savedLanguage = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
      if (savedLanguage) {
        setLanguage(savedLanguage);
      }

      const raw = await AsyncStorage.getItem('pmnh_saved_exhibits');
      const savedIds = raw ? JSON.parse(raw) : [];
      const exhibitNumbers = Array.isArray(savedIds) ? Array.from(new Set(savedIds)) : [];

      if (!exhibitNumbers.length) {
        setSavedExhibits([]);
        return;
      }

      const exhibits = await Promise.all(
        exhibitNumbers.map(async (number) => {
          try {
            const response = await getExhibitByNumber(number);
            return response?.data || null;
          } catch (err) {
            console.log('Failed loading saved exhibit', number, err);
            return null;
          }
        })
      );

      setSavedExhibits(exhibits.filter(Boolean));
    } catch (err) {
      console.log('Unable to load saved exhibits', err);
      setSavedExhibits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSavedExhibits();
    }, [loadSavedExhibits])
  );

  const removeSavedExhibit = async (number) => {
    setSavedExhibits((prev) => prev.filter((item) => item.exhibit_number !== number));

    try {
      const raw = await AsyncStorage.getItem('pmnh_saved_exhibits');
      const savedIds = raw ? JSON.parse(raw) : [];
      const updatedIds = Array.isArray(savedIds)
        ? savedIds.filter((id) => id !== number)
        : [];

      await AsyncStorage.setItem('pmnh_saved_exhibits', JSON.stringify(updatedIds));
    } catch (err) {
      console.log('Unable to remove saved exhibit', err);
    }
  };

  const handlePlay = (exhibit) => {
    navigation.navigate('Player', {
      exhibit,
      language,
    });
  };

  const renderCard = ({ item }) => {
    // Capitalise first letter so 'geology' matches 'Geology'
const categoryKey = item.category
  ? item.category.charAt(0).toUpperCase() + item.category.slice(1).toLowerCase()
  : '';
const meta = categoryMeta[categoryKey] || {
  icon: 'leaf',
  label: item.category || 'Exhibit',
};

    return (
      <View style={styles.card}>
        <Pressable style={styles.cardBody} onPress={() => handlePlay(item)}>
          <View style={styles.cardLeft}>
            <View style={styles.cardIcon}>
              <Ionicons name={meta.icon} size={20} color={COLORS.green} />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>#{item.exhibit_number}</Text>
              </View>
              <Text style={styles.title}>
  {item.translations?.find(t => t.language_code === language)?.title ||
   item.translations?.find(t => t.language_code === 'en')?.title ||
   item.title ||
   'Exhibit'}
</Text>
              <Text style={styles.meta}>
                {item.hall_name} • {formatDuration(item.duration_secs)}
              </Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.cardActions}>
          <Pressable style={styles.playButton} onPress={() => handlePlay(item)}>
            <Ionicons name="play" size={18} color={COLORS.white} />
          </Pressable>
          <Pressable
            style={styles.bookmarkButton}
            onPress={() => removeSavedExhibit(item.exhibit_number)}
          >
            <Ionicons name="bookmark" size={18} color={COLORS.green} />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrapper}>
        <Ionicons name="bookmark-outline" size={42} color={COLORS.green} />
      </View>
      <Text style={styles.emptyTitle}>No saved exhibits yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the bookmark icon on any exhibit to save it here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Exhibits</Text>
        <Text style={styles.headerSubtitle}>Your personal audio guide collection</Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size={36} color={COLORS.green} />
          </View>
        ) : (
          <FlatList
            data={savedExhibits}
            keyExtractor={(item) => item.id?.toString() ?? String(item.exhibit_number)}
            renderItem={renderCard}
            contentContainerStyle={savedExhibits.length ? styles.listContent : styles.emptyList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmpty}
          />
        )}
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
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
  cardBody: {
    flex: 1,
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
  cardActions: {
    alignItems: 'flex-end',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  bookmarkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.grayText,
    textAlign: 'center',
    lineHeight: 20,
  },
});