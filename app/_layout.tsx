import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, BackHandler, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { GameProvider } from '@/src/context/GameContext';
import LoginScreen from '@/src/screens/LoginScreen';
import apiService from '@/src/services/api';
import { initializeFileLogging } from '@/src/utils/fileLogger';
import { ServerConfig } from '@/src/utils/serverConfig';
import { preloadSounds } from '@/src/utils/sounds';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppContent() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, login } = useAuth();

  useEffect(() => {
    // Initialize file logging and server config
    const initializeApp = async () => {
      await initializeFileLogging();
      await ServerConfig.loadServerUrl();
      
      console.log('🚀 [APP] Fantasy Competition App Starting...');
      console.log('📱 [APP] Color Scheme:', colorScheme);
      console.log('🌐 [APP] Server URL:', ServerConfig.getServerUrl());

      // Preload sound effects
      console.log('🔊 [APP] Preloading sound effects...');
      await preloadSounds();
      console.log('✅ [APP] Sound effects preloaded');

      // Check backend connection immediately (before login)
      setTimeout(checkBackendConnection, 1000);
    };

    initializeApp();
  }, []);

  // Handle Android back button to confirm app exit
  useEffect(() => {
    const backAction = () => {
      if (isAuthenticated) {
        Alert.alert(
          'Exit App',
          'Are you sure you want to exit the Fantasy Competition app?',
          [
            {
              text: 'Cancel',
              onPress: () => null,
              style: 'cancel',
            },
            {
              text: 'Exit',
              onPress: () => BackHandler.exitApp(),
              style: 'destructive',
            },
          ],
          { cancelable: false }
        );
        return true; // Prevent default behavior
      }
      return false; // Allow default behavior when not authenticated
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [isAuthenticated]);

  const checkBackendConnection = async () => {
    console.log('🔌 [APP] Checking backend connection...');

    const result = await apiService.checkConnection();
    
    if (result.success && result.data) {
      console.log('✅ [APP] Backend connection successful');
      // Don't show success alert - just log it
    } else {
      console.error('❌ [APP] Backend connection failed:', result.error);
      Alert.alert(
        '⚠️ Cannot Connect to Server',
        `${result.error || 'Backend server is not responding'}\n\nMake sure:\n• Backend server is running\n• Both devices are on same network\n• Server URL is correct in Settings`,
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Retry', onPress: checkBackendConnection }
        ]
      );
    }
  };

  const handleLogin = async (userId: string, name: string, email: string, isAdmin?: boolean) => {
    await login(userId, name, email, isAdmin);
  };

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Show main app if authenticated
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
