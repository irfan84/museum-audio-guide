import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

import HomeScreen     from '../screens/HomeScreen';
import ScanScreen     from '../screens/ScanScreen';
import ExhibitsScreen from '../screens/ExhibitsScreen';
import SavedScreen    from '../screens/SavedScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home:     focused ? 'home'          : 'home-outline',
            Scan:     focused ? 'scan'          : 'scan-outline',
            Exhibits: focused ? 'grid'          : 'grid-outline',
            Saved:    focused ? 'bookmark'      : 'bookmark-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor:   COLORS.green,
        tabBarInactiveTintColor: COLORS.grayText,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor:  COLORS.grayBorder,
          paddingBottom:   4,
          height:          60,
        },
        tabBarLabelStyle: { fontSize: 11 },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}     />
      <Tab.Screen name="Scan"     component={ScanScreen}     />
      <Tab.Screen name="Exhibits" component={ExhibitsScreen} />
      <Tab.Screen name="Saved"    component={SavedScreen}    />
    </Tab.Navigator>
  );
}