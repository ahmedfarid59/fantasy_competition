import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import apiService from '../services/api';
import { playSound, SoundEffect } from '../utils/sounds';

interface User {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (userId: string, name: string, email: string, isAdmin?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = '@fantasy_auth_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
    
    // Register authentication failure handler with API service
    const handleAuthFailure = async () => {
      console.log('🔐 [AUTH] Authentication failure detected - logging out user');
      
      // Import Alert dynamically to show notification
      const { Alert } = await import('react-native');
      Alert.alert(
        'Session Expired',
        'Your session has expired or you have been logged out. Please log in again.',
        [{ text: 'OK' }]
      );
      
      await logout();
    };
    
    apiService.setAuthenticationFailureHandler(handleAuthFailure);
    
    return () => {
      // Cleanup: unregister handler when component unmounts
      apiService.setAuthenticationFailureHandler(() => {});
    };
  }, []);

  const loadUser = async () => {
    console.log('🔐 [AUTH] Loading saved user...');
    try {
      const savedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        console.log('🔐 [AUTH] Loaded user:', userData.id);
        
        // Set user immediately (optimistic approach)
        setUser(userData);
        apiService.setCurrentUser(userData.id);
        
        // Verify user exists in background (only once on app load)
        verifyUserInBackground(userData);
      } else {
        console.log('ℹ️ [AUTH] No saved user found');
      }
    } catch (error) {
      console.error('❌ [AUTH] Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyUserInBackground = async (userData: User) => {
    try {
      const serverUrl = await import('../utils/serverConfig').then(m => m.ServerConfig.getServerUrl());
      const response = await fetch(`${serverUrl}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userData.id }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user) {
          // Update user data with latest from server (in case admin status changed)
          const validatedUser = {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            isAdmin: result.user.isAdmin,
          };
          setUser(validatedUser);
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(validatedUser));
        } else {
          console.warn('⚠️ [AUTH] User no longer exists - clearing credentials');
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          setUser(null);
          apiService.setCurrentUser(null);
        }
      } else if (response.status === 404) {
        console.warn('⚠️ [AUTH] User account removed - clearing credentials');
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        setUser(null);
        apiService.setCurrentUser(null);
      }
    } catch (error) {
      // Silent fail - user can continue with cached data, API calls will handle auth errors
      console.log('ℹ️ [AUTH] Background verification skipped (server may be offline)');
    }
  };

  const login = async (userId: string, name: string, email: string, isAdmin: boolean = false) => {
    console.log('🔐 [AUTH] Logging in user:', userId);
    console.log('🔐 [AUTH] isAdmin parameter:', isAdmin);
    const userData: User = { id: userId, name, email, isAdmin };
    console.log('🔐 [AUTH] userData object:', JSON.stringify(userData));
    
    try {
      const jsonString = JSON.stringify(userData);
      console.log('🔐 [AUTH] Saving to AsyncStorage:', jsonString);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, jsonString);
      setUser(userData);
      apiService.setCurrentUser(userId);
      if (isAdmin) {
        console.log('👑 [AUTH] Admin user logged in');
      }
      console.log('✅ [AUTH] User logged in and saved');
      
      // Play login success sound
      playSound(SoundEffect.LOGIN);
    } catch (error) {
      console.error('❌ [AUTH] Error saving user:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('🔐 [AUTH] Logging out user');
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setUser(null);
      apiService.setCurrentUser(null);
      console.log('✅ [AUTH] User logged out');
      
      // Play logout sound
      playSound(SoundEffect.LOGOUT);
    } catch (error) {
      console.error('❌ [AUTH] Error logging out:', error);
      throw error;
    }
  };

  const refreshUserData = async () => {
    if (!user) {
      console.log('⚠️ [AUTH] No user to refresh');
      return;
    }

    console.log('� [AUTH] Refreshing user data from server...');
    try {
      const serverUrl = await import('../utils/serverConfig').then(m => m.ServerConfig.getServerUrl());
      const response = await fetch(`${serverUrl}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user) {
          const updatedUser = {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            isAdmin: result.user.isAdmin,
          };
          setUser(updatedUser);
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
          console.log('✅ [AUTH] User data refreshed');
        }
      }
    } catch (error) {
      console.log('⚠️ [AUTH] Could not refresh user data:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isAdmin: user?.isAdmin || false,
        isLoading,
        login,
        logout,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
