import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { ErrorHandler } from '../utils/errorHandler';
import haptic from '../utils/haptics';
import { ServerConfig } from '../utils/serverConfig';

interface LoginScreenProps {
  onLogin: (username: string, name: string, email: string, isAdmin?: boolean) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const context = {
      screen: 'LoginScreen',
      function: 'handleSubmit',
      operation: isLogin ? 'Login' : 'Register',
      data: { username, isLogin },
    };

    ErrorHandler.logOperation(context);
    console.log('🔐 [LoginScreen] Submit started:', {
      mode: isLogin ? 'Login' : 'Register',
      username,
      hasPassword: !!password,
      hasName: !!name,
      hasEmail: !!email,
    });
    
    // Validation
    if (!username.trim() || !password.trim()) {
      console.warn('⚠️ [LoginScreen] Validation failed: Missing username or password');
      haptic.error();
      Alert.alert('Error', 'Username and password are required');
      return;
    }

    if (!isLogin && (!name.trim() || !email.trim())) {
      console.warn('⚠️ [LoginScreen] Validation failed: Missing name or email for registration');
      haptic.error();
      Alert.alert('Error', 'All fields are required for registration');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin
        ? { username, password }
        : { username, name, email, password };

      const serverUrl = ServerConfig.getServerUrl();
      console.log('🌐 [LoginScreen] Making request:', {
        url: `${serverUrl}${endpoint}`,
        method: 'POST',
        body: { ...body, password: '[REDACTED]' },
      });
      
      const startTime = Date.now();
      const response = await fetch(`${serverUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      const duration = Date.now() - startTime;
      console.log('📥 [LoginScreen] Response received:', {
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
      });

      const data = await response.json();
      console.log('� [LoginScreen] Response data:', {
        success: data.success,
        hasUser: !!data.user,
        message: data.message,
      });

      if (data.success && data.user) {
        console.log('✅ [LoginScreen] Authentication successful:', {
          userId: data.user.id,
          username: data.user.name,
          isAdmin: data.user.isAdmin,
        });
        
        haptic.success();
        ErrorHandler.logSuccess(context, {
          userId: data.user.id,
          isAdmin: data.user.isAdmin,
        });
        
        Alert.alert(
          'Success',
          data.message,
          [{ text: 'OK', onPress: () => onLogin(data.user.id, data.user.name, data.user.email, data.user.isAdmin) }]
        );
      } else {
        console.error('❌ [LoginScreen] Authentication failed:', {
          message: data.message,
          success: data.success,
        });
        haptic.error();
        ErrorHandler.handleError(data.message || 'Authentication failed', { context, showAlert: false });
        Alert.alert('Error', data.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('❌ [LoginScreen] Network error:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      haptic.error();
      ErrorHandler.handleError(error, { context, showAlert: false });
      Alert.alert(
        'Connection Error',
        'Could not connect to server. Please check:\n• Backend server is running\n• Server URL is correct in Settings\n• You are connected to the network',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: handleSubmit }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>
            ⚡ Fantasy Competition
          </Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Login to your account' : 'Create new account'}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {!isLogin && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
            </>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => {
              haptic.medium();
              handleSubmit();
            }}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? 'Login' : 'Register'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              haptic.light();
              setIsLogin(!isLogin);
              setUsername('');
              setPassword('');
              setName('');
              setEmail('');
            }}
          >
            <Text style={styles.switchText}>
              {isLogin
                ? "Don't have an account? Register"
                : 'Already have an account? Login'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 20,
    padding: 10,
    alignItems: 'center',
  },
  switchText: {
    color: '#007AFF',
    fontSize: 14,
  },
});
