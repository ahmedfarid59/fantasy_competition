import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import haptic from '../utils/haptics';
import { ServerConfig } from '../utils/serverConfig';
import { enableSounds, getSoundVolume, isSoundEnabled, playSound, setSoundVolume, SoundEffect } from '../utils/sounds';
import ProfileEditScreen from './ProfileEditScreen';

interface SettingsScreenProps {
  onNavigateToHelp?: () => void;
}

type SettingsTab = 'account' | 'server' | 'preferences' | 'admin';

export default function SettingsScreen({ onNavigateToHelp }: SettingsScreenProps) {
  const { user, logout, refreshUserData, isAdmin } = useAuth();
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(isSoundEnabled());
  const [soundVolume, setSoundVolumeState] = useState(getSoundVolume());
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  useEffect(() => {
    loadCurrentServerUrl();
  }, []);

  const loadCurrentServerUrl = async () => {
    const url = await ServerConfig.loadServerUrl();
    setServerUrl(url);
  };

  const handleSaveServer = async () => {
    if (!serverUrl.trim()) {
      haptic.error();
      playSound(SoundEffect.ERROR);
      Alert.alert('Error', 'Server URL cannot be empty');
      return;
    }

    // Basic URL validation
    if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
      haptic.error();
      playSound(SoundEffect.ERROR);
      Alert.alert('Error', 'Server URL must start with http:// or https://');
      return;
    }

    setLoading(true);
    try {
      await ServerConfig.saveServerUrl(serverUrl.trim());
      haptic.success();
      playSound(SoundEffect.SAVE);
      Alert.alert('Success', 'Server URL updated successfully!\n\nRestart the app for changes to take effect.');
    } catch (error) {
      haptic.error();
      playSound(SoundEffect.ERROR);
      Alert.alert('Error', 'Failed to save server URL');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Error', 'Enter a server URL first');
      return;
    }

    setTesting(true);
    try {
      console.log('🔌 [SETTINGS] Testing connection to:', serverUrl.trim());
      
      const response = await fetch(`${serverUrl.trim()}/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('🔌 [SETTINGS] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [SETTINGS] Connection successful:', data);
        
        setTimeout(() => {
          Alert.alert(
            '✅ Connection Successful', 
            `Server: ${data.message || 'Connected'}\nVersion: ${data.version || 'Unknown'}`,
            [{ text: 'OK', onPress: () => console.log('Alert dismissed') }]
          );
        }, 100);
      } else {
        console.log('❌ [SETTINGS] Connection failed with status:', response.status);
        
        setTimeout(() => {
          Alert.alert(
            '❌ Connection Failed', 
            `Server responded with status: ${response.status}`,
            [{ text: 'OK', onPress: () => console.log('Alert dismissed') }]
          );
        }, 100);
      }
    } catch (error) {
      console.error('❌ [SETTINGS] Connection test failed:', error);
      
      setTimeout(() => {
        Alert.alert(
          '❌ Connection Failed', 
          'Could not reach server. Check the URL and try again.',
          [{ text: 'OK', onPress: () => console.log('Alert dismissed') }]
        );
      }, 100);
    } finally {
      setTesting(false);
    }
  };

  const handleResetToDefault = () => {
    Alert.alert(
      'Reset to Default',
      `Reset server URL to default?\n\n${ServerConfig.getDefaultServerUrl()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: () => {
            setServerUrl(ServerConfig.getDefaultServerUrl());
          },
        },
      ]
    );
  };

  const handleDownloadBackup = async () => {
    setDownloading(true);
    try {
      console.log('💾 [SETTINGS] Starting database backup download...');
      
      const result = await apiService.downloadDatabaseBackup();
      
      if (!result.success || !result.data) {
        Alert.alert('❌ Error', result.error || 'Failed to download backup');
        return;
      }

      const { url, filename } = JSON.parse(result.data);
      
      // Download to device
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      // Convert blob URL to base64 and save
      const response = await fetch(url);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const base64 = base64data.split(',')[1];
        
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        console.log(`✅ [SETTINGS] Database saved to: ${fileUri}`);
        
        // Share the file
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/octet-stream',
            dialogTitle: 'Save Database Backup',
          });
          Alert.alert('✅ Success', 'Database backup downloaded successfully!');
        } else {
          Alert.alert('✅ Downloaded', `File saved to:\n${fileUri}`);
        }
      };
      
      reader.readAsDataURL(blob);
      
    } catch (error) {
      console.error('❌ [SETTINGS] Backup download error:', error);
      Alert.alert('❌ Error', 'Failed to download database backup');
    } finally {
      setDownloading(false);
    }
  };

  const handleRestoreBackup = async () => {
    try {
      console.log('📤 [SETTINGS] Starting database restore...');
      
      // Pick a .db file
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/octet-stream',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('❌ [SETTINGS] User cancelled file selection');
        return;
      }

      const file = result.assets[0];
      
      // Validate file extension
      if (!file.name.endsWith('.db')) {
        Alert.alert('❌ Invalid File', 'Please select a .db database file');
        return;
      }

      // Confirm restore action
      Alert.alert(
        '⚠️ Confirm Restore',
        `This will replace the current database with:\n${file.name}\n\n⚠️ A safety backup will be created first.\n\nContinue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              setUploading(true);
              try {
                console.log(`📤 [SETTINGS] Uploading file: ${file.uri}`);
                
                const uploadResult = await apiService.uploadDatabaseBackup(file.uri);
                
                if (!uploadResult.success) {
                  Alert.alert('❌ Error', uploadResult.error || 'Failed to restore database');
                  return;
                }

                console.log('✅ [SETTINGS] Database restored successfully');
                Alert.alert(
                  '✅ Success',
                  'Database restored successfully!\n\n⚠️ Please restart the app for changes to take effect.',
                  [{ text: 'OK' }]
                );
              } catch (error) {
                console.error('❌ [SETTINGS] Restore error:', error);
                Alert.alert('❌ Error', 'Failed to restore database backup');
              } finally {
                setUploading(false);
              }
            }
          }
        ]
      );

    } catch (error) {
      console.error('❌ [SETTINGS] File picker error:', error);
      Alert.alert('❌ Error', 'Failed to select file');
    }
  };

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
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Delete Account',
      `Are you sure you want to permanently delete your account?\n\nThis will delete:\n• Your user profile\n• All your teams\n• All your transfers\n• All your points history\n\nThis action CANNOT be undone!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // Double confirmation
            Alert.alert(
              '⚠️ Final Confirmation',
              'Are you absolutely sure? This is your last chance to cancel.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      console.log('🗑️ [SETTINGS] User confirmed account deletion');
                      setLoading(true);
                      
                      const result = await apiService.deleteAccount();
                      
                      if (result.success) {
                        console.log('✅ [SETTINGS] Account deleted successfully');
                        playSound(SoundEffect.DELETE);
                        Alert.alert(
                          'Account Deleted',
                          'Your account has been permanently deleted.',
                          [
                            {
                              text: 'OK',
                              onPress: async () => {
                                await logout();
                              }
                            }
                          ]
                        );
                      } else {
                        console.error('❌ [SETTINGS] Account deletion failed:', result.error);
                        playSound(SoundEffect.ERROR);
                        Alert.alert('Error', result.error || 'Failed to delete account');
                      }
                    } catch (error) {
                      console.error('❌ [SETTINGS] Error deleting account:', error);
                      playSound(SoundEffect.ERROR);
                      Alert.alert('Error', 'Failed to delete account. Please try again.');
                    } finally {
                      setLoading(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  // Show profile edit screen if requested
  if (showProfileEdit) {
    return <ProfileEditScreen onBack={() => setShowProfileEdit(false)} />;
  }

  const renderTabButton = (tab: SettingsTab, icon: string, label: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
      onPress={() => {
        haptic.selection();
        setActiveTab(tab);
        playSound(SoundEffect.CLICK);
      }}
    >
      <Text style={[styles.tabIcon, activeTab === tab && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderAccountTab = () => (
    <>
      {/* Help Button */}
      <TouchableOpacity 
        style={styles.helpButton}
        onPress={onNavigateToHelp}
      >
        <Text style={styles.helpIcon}>📖</Text>
        <View style={styles.helpTextContainer}>
          <Text style={styles.helpButtonText}>Game Guide & Help</Text>
          <Text style={styles.helpSubtext}>Learn how to play, rules, and troubleshooting</Text>
        </View>
        <Text style={styles.helpArrow}>›</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Username:</Text>
              <Text style={styles.value}>{user?.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{user?.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{user?.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Admin Status:</Text>
              <Text style={[styles.value, user?.isAdmin && styles.adminBadge]}>
                {user?.isAdmin ? '👑 Admin' : 'User'}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.editProfileButton} 
            onPress={() => setShowProfileEdit(true)}
          >
            <Text style={styles.editProfileButtonText}>✏️ Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
            <Text style={styles.deleteAccountButtonText}>🗑️ Delete Account</Text>
          </TouchableOpacity>
        </View>
      </>
    );

  const renderServerTab = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server Configuration</Text>
          <View style={styles.card}>
            <Text style={styles.helperText}>
              Enter the backend server URL. Use your computer's IP address if testing on a physical device.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Server URL</Text>
              <TextInput
                style={styles.input}
                placeholder="http://192.168.1.100:5000"
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.testButton, testing && styles.buttonDisabled]}
                onPress={handleTestConnection}
                disabled={testing}
              >
                {testing ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Test Connection</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton, loading && styles.buttonDisabled]}
                onPress={handleSaveServer}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.resetButton} onPress={handleResetToDefault}>
              <Text style={styles.resetButtonText}>Reset to Default</Text>
            </TouchableOpacity>

            <Text style={styles.noteText}>
              💡 Note: You need to restart the app after changing the server URL.
            </Text>
          </View>
        </View>
      </>
    );

  const renderPreferencesTab = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔊 Sound Effects</Text>
          <View style={styles.card}>
            <Text style={styles.helperText}>
              Control sound effects for various actions in the app.
            </Text>

            <View style={styles.soundControl}>
              <View style={styles.soundControlHeader}>
                <Text style={styles.label}>Enable Sound Effects</Text>
                <TouchableOpacity
                  style={[styles.toggleButton, soundEnabled && styles.toggleButtonActive]}
                  onPress={() => {
                    const newValue = !soundEnabled;
                    setSoundEnabled(newValue);
                    enableSounds(newValue);
                    if (newValue) {
                      playSound(SoundEffect.SUCCESS);
                    }
                  }}
                >
                  <Text style={[styles.toggleButtonText, soundEnabled && styles.toggleButtonTextActive]}>
                    {soundEnabled ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              {soundEnabled && (
                <View style={styles.volumeControl}>
                  <Text style={styles.label}>Volume</Text>
                  <View style={styles.volumeButtons}>
                    {[0.25, 0.5, 0.75, 1.0].map((vol) => (
                      <TouchableOpacity
                        key={vol}
                        style={[
                          styles.volumeButton,
                          soundVolume === vol && styles.volumeButtonActive,
                        ]}
                        onPress={async () => {
                          setSoundVolumeState(vol);
                          await setSoundVolume(vol);
                          playSound(SoundEffect.CLICK);
                        }}
                      >
                        <Text
                          style={[
                            styles.volumeButtonText,
                            soundVolume === vol && styles.volumeButtonTextActive,
                          ]}
                        >
                          {vol === 0.25 ? '25%' : vol === 0.5 ? '50%' : vol === 0.75 ? '75%' : '100%'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <Text style={styles.helperText}>
                Sound effects include: login, logout, save, delete, success, error, and more.
              </Text>
            </View>
          </View>
        </View>
      </>
    );

  const renderAdminTab = () => (
    <>
      {!isAdmin ? (
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.helperText}>
              ⚠️ Admin access required. Only administrators can access this section.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 Database Management</Text>
          <View style={styles.card}>
            <Text style={styles.helperText}>
              Create backups of the database or restore from a previous backup file.
            </Text>

            <View style={styles.backupRestoreContainer}>
              <TouchableOpacity
                style={[styles.backupButton, downloading && styles.buttonDisabled]}
                onPress={handleDownloadBackup}
                disabled={downloading || uploading}
              >
                {downloading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Text style={styles.backupIcon}>💾</Text>
                    <View style={styles.backupTextContainer}>
                      <Text style={styles.backupButtonText}>Download Backup</Text>
                      <Text style={styles.backupSubtext}>Save database to device</Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.restoreButton, uploading && styles.buttonDisabled]}
                onPress={handleRestoreBackup}
                disabled={downloading || uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Text style={styles.backupIcon}>📤</Text>
                    <View style={styles.backupTextContainer}>
                      <Text style={styles.restoreButtonText}>Restore Backup</Text>
                      <Text style={styles.backupSubtext}>Upload .db file</Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.noteText}>
              ⚠️ Note: Restoring a backup will replace all current data. The app must be restarted after restore.
            </Text>
          </View>
        </View>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {renderTabButton('account', '👤', 'Account')}
          {renderTabButton('server', '🌐', 'Server')}
          {renderTabButton('preferences', '⚙️', 'Preferences')}
          {isAdmin && renderTabButton('admin', '🔒', 'Admin')}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.tabContent}>
        <View style={styles.content}>
          {activeTab === 'account' && renderAccountTab()}
          {activeTab === 'server' && renderServerTab()}
          {activeTab === 'preferences' && renderPreferencesTab()}
          {activeTab === 'admin' && renderAdminTab()}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabScrollContent: {
    paddingHorizontal: 10,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginHorizontal: 5,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#1a237e',
  },
  tabIcon: {
    fontSize: 20,
    marginRight: 8,
    opacity: 0.6,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  tabLabelActive: {
    color: '#1a237e',
  },
  tabContent: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  fixButton: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  fixButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  editProfileButton: {
    backgroundColor: '#1a237e',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
  },
  editProfileButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
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
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#007AFF',
  },
  saveButton: {
    backgroundColor: '#34C759',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  resetButton: {
    padding: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  resetButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  noteText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  guideText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#333',
  },
  adminBadge: {
    color: '#34C759',
    fontWeight: 'bold',
  },
  warningCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
  helpButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  helpIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  helpTextContainer: {
    flex: 1,
  },
  helpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 3,
  },
  helpSubtext: {
    fontSize: 12,
    color: '#666',
  },
  helpArrow: {
    fontSize: 28,
    color: '#007AFF',
    fontWeight: '300',
  },
  backupRestoreContainer: {
    gap: 15,
    marginBottom: 15,
  },
  backupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 10,
    gap: 15,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9500',
    padding: 15,
    borderRadius: 10,
    gap: 15,
  },
  backupIcon: {
    fontSize: 28,
  },
  backupTextContainer: {
    flex: 1,
  },
  backupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  restoreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  backupSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  deleteAccountButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  deleteAccountButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  soundControl: {
    marginTop: 10,
  },
  soundControlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  toggleButton: {
    backgroundColor: '#ccc',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#4CAF50',
  },
  toggleButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  volumeControl: {
    marginTop: 15,
    marginBottom: 15,
  },
  volumeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  volumeButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  volumeButtonActive: {
    backgroundColor: '#1a237e',
    borderColor: '#1a237e',
  },
  volumeButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  volumeButtonTextActive: {
    color: '#fff',
  },
});
