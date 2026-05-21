import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import AppNavigator from './src/navigation/AppNavigator';
import PlayerScreen from './src/screens/PlayerScreen';
import { syncQueue } from './src/services/offlineQueue';

const Stack = createStackNavigator();

export default function App() {
  useEffect(() => {
    // Sync queued events whenever connectivity is restored
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        syncQueue();
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor="#1B4332" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs" component={AppNavigator} />
          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            options={{ presentation: 'card', gestureEnabled: true }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}