import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

export default function SavedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Saved — coming Day 9</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
  text: { color: COLORS.grayText, fontSize: 16 },
});