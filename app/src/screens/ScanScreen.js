import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

export default function ScanScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>QR Scanner — coming Day 7</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
  text: { color: COLORS.grayText, fontSize: 16 },
});