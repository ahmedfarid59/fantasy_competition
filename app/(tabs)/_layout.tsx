import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, TouchableOpacity } from 'react-native';

import { HapticTab } from '@/src/components-shared/haptic-tab';
import { IconSymbol } from '@/src/components-shared/ui/icon-symbol';
import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { useAuth } from '@/src/context/AuthContext';
import { useGame } from '@/src/context/GameContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user, logout } = useAuth();
  const { getCurrentRoundInfo } = useGame();
  const currentRound = getCurrentRoundInfo();

  useEffect(() => {
    console.log('📑 [TABS] Tab Layout Initialized');
    console.log('👤 [TABS] Current user:', user?.name);
    console.log('📅 [TABS] Current round available:', !!currentRound);
  }, [currentRound]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            console.log('✅ [AUTH] User logged out');
          },
        },
      ]
    );
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1a237e',
        tabBarInactiveTintColor: '#757575',
        headerShown: true,
        headerStyle: {
          backgroundColor: '#1a237e',
        },
        headerTintColor: '#fff',
        tabBarButton: HapticTab,
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
            <IconSymbol size={24} name="rectangle.portrait.and.arrow.right" color="#fff" />
          </TouchableOpacity>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Fantasy Competition',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
        listeners={{
          tabPress: () => console.log('📍 [NAV] Navigated to Home Tab')
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Select Team',
          tabBarLabel: 'Team',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.3.fill" color={color} />,
        }}
        listeners={{
          tabPress: () => console.log('📍 [NAV] Navigated to Team Selection Tab')
        }}
      />
      <Tabs.Screen
        name="myteam"
        options={{
          title: 'My Team',
          tabBarLabel: 'My Team',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="star.fill" color={color} />,
        }}
        listeners={{
          tabPress: () => console.log('📍 [NAV] Navigated to My Team Tab')
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
        listeners={{
          tabPress: () => console.log('📍 [NAV] Navigated to Dashboard Tab')
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Administration',
          tabBarLabel: 'Admin',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.2.fill" color={color} />,
          href: user?.isAdmin ? '/admin' : null,
        }}
        listeners={{
          tabPress: () => console.log('📍 [NAV] Navigated to Admin Tab')
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
          headerRight: undefined, // Remove logout button from settings tab
        }}
        listeners={{
          tabPress: () => console.log('📍 [NAV] Navigated to Settings Tab')
        }}
      />
    </Tabs>
  );
}
