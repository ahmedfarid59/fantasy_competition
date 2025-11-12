import HelpScreen from '@/src/screens/HelpScreen';
import SettingsScreen from '@/src/screens/SettingsScreen';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsTab() {
  const [showHelp, setShowHelp] = useState(false);

  if (showHelp) {
    return (
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setShowHelp(false)}
        >
          <Text style={styles.backText}>← Back to Settings</Text>
        </TouchableOpacity>
        <HelpScreen />
      </View>
    );
  }

  return <SettingsScreen onNavigateToHelp={() => setShowHelp(true)} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  backButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    alignItems: 'center',
  },
  backText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
