import React, { useState } from 'react';
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
import { playSound, SoundEffect } from '../utils/sounds';

interface ProfileEditScreenProps {
  onBack: () => void;
}

export default function ProfileEditScreen({ onBack }: ProfileEditScreenProps) {
  const { user, refreshUserData, isAdmin } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [transferringAdmin, setTransferringAdmin] = useState(false);

  React.useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersResponse = await apiService.getAllUsers();
      if (usersResponse.success && usersResponse.data) {
        // Filter out current user
        const otherUsers = usersResponse.data.filter((u: any) => u.id !== user?.id);
        setUsers(otherUsers);
      }
    } catch (error) {
      console.error('❌ [PROFILE] Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Email cannot be empty');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

      setLoading(true);
      try {
        const updateData: any = {
          name: name.trim(),
          email: email.trim(),
        };

        // If changing password, validate and include it
        if (newPassword) {
          if (!currentPassword) {
            Alert.alert('Error', 'Current password is required to change password');
            setLoading(false);
            return;
          }
          if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            setLoading(false);
            return;
          }
          if (newPassword.length < 6) {
            Alert.alert('Error', 'New password must be at least 6 characters');
            setLoading(false);
            return;
          }
          updateData.current_password = currentPassword;
          updateData.new_password = newPassword;
        }

        const response = await apiService.updateProfile(updateData);

        if (response.success) {
          playSound(SoundEffect.SAVE);
          Alert.alert('Success', 'Profile updated successfully!');
          await refreshUserData();
          // Clear password fields
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        } else {
          playSound(SoundEffect.ERROR);
          Alert.alert('Error', response.error || 'Failed to update profile');
        }
      } catch (error) {
        console.error('❌ [PROFILE] Update error:', error);
        playSound(SoundEffect.ERROR);
        Alert.alert('Error', 'Failed to update profile');
      } finally {
        setLoading(false);
      }
    };  const handleTransferAdmin = (targetUser: any) => {
    Alert.alert(
      '⚠️ Transfer Admin Rights',
      `Are you sure you want to transfer admin rights to ${targetUser.name}?\n\nYou will lose admin privileges and ${targetUser.name} will become the new admin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          style: 'destructive',
          onPress: () => confirmTransferAdmin(targetUser),
        },
      ]
    );
  };

  const confirmTransferAdmin = (targetUser: any) => {
    Alert.alert(
      '⚠️ Final Confirmation',
      'This action cannot be undone. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Transfer Admin',
          style: 'destructive',
          onPress: () => executeTransferAdmin(targetUser.id),
        },
      ]
    );
  };

  const executeTransferAdmin = async (targetUserId: string) => {
    setTransferringAdmin(true);
    try {
      const response = await apiService.transferAdmin(targetUserId);

      if (response.success) {
        playSound(SoundEffect.TRANSFER);
        Alert.alert(
          '✅ Admin Rights Transferred',
          'Admin rights have been transferred successfully. You are now a regular user.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await refreshUserData();
                onBack();
              },
            },
          ]
        );
      } else {
        playSound(SoundEffect.ERROR);
        Alert.alert('Error', response.error || 'Failed to transfer admin rights');
      }
    } catch (error) {
      console.error('❌ [PROFILE] Transfer admin error:', error);
      playSound(SoundEffect.ERROR);
      Alert.alert('Error', 'Failed to transfer admin rights');
    } finally {
      setTransferringAdmin(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>

        {/* Profile Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

        {/* Change Password Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password (Optional)</Text>
          <View style={styles.card}>
            <Text style={styles.helperText}>
              Leave these fields empty if you don't want to change your password.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Password</Text>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.buttonDisabled]}
          onPress={handleUpdateProfile}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>💾 Save Changes</Text>
          )}
        </TouchableOpacity>

        {/* Transfer Admin Section - Admin Only */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👑 Transfer Admin Rights</Text>
            <View style={styles.card}>
              <Text style={styles.helperText}>
                Transfer your admin privileges to another user. You will become a regular user after the transfer.
              </Text>

              {loadingUsers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#1a237e" />
                  <Text style={styles.loadingText}>Loading users...</Text>
                </View>
              ) : users.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No other users available</Text>
                </View>
              ) : (
                <View style={styles.usersList}>
                  {users.map((targetUser) => (
                    <TouchableOpacity
                      key={targetUser.id}
                      style={[
                        styles.userItem,
                        transferringAdmin && styles.buttonDisabled,
                      ]}
                      onPress={() => handleTransferAdmin(targetUser)}
                      disabled={transferringAdmin}
                    >
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{targetUser.name}</Text>
                        <Text style={styles.userEmail}>{targetUser.email}</Text>
                      </View>
                      <Text style={styles.transferIcon}>→</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1a237e',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
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
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 25,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
  usersList: {
    marginTop: 15,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  transferIcon: {
    fontSize: 24,
    color: '#1a237e',
    fontWeight: 'bold',
  },
});
