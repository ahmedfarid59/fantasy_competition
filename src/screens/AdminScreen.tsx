import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import MatchManagementScreen from './MatchManagementScreen';
import PlayerManagementScreen from './PlayerManagementScreen';
import RoundManagementScreen from './RoundManagementScreen';
import ScoreManagementScreen from './ScoreManagementScreen';

export default function AdminScreen() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'players' | 'scores' | 'rounds' | 'matches'>('players');

  // Security check: prevent non-admin access
  if (!isAdmin) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Text style={styles.accessDeniedIcon}>🔒</Text>
        <Text style={styles.accessDeniedTitle}>Access Denied</Text>
        <Text style={styles.accessDeniedText}>
          This section is only accessible to administrators.
        </Text>
        <Text style={styles.accessDeniedHint}>
          Current user: {user?.name || 'Unknown'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'players' && styles.activeTab]}
          onPress={() => setActiveTab('players')}
        >
          <Text style={[styles.tabText, activeTab === 'players' && styles.activeTabText]}>
            Players
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rounds' && styles.activeTab]}
          onPress={() => setActiveTab('rounds')}
        >
          <Text style={[styles.tabText, activeTab === 'rounds' && styles.activeTabText]}>
            Rounds
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'scores' && styles.activeTab]}
          onPress={() => setActiveTab('scores')}
        >
          <Text style={[styles.tabText, activeTab === 'scores' && styles.activeTabText]}>
            Scores
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'matches' && styles.activeTab]}
          onPress={() => setActiveTab('matches')}
        >
          <Text style={[styles.tabText, activeTab === 'matches' && styles.activeTabText]}>
            Matches
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'scores' ? (
        <ScoreManagementScreen />
      ) : activeTab === 'rounds' ? (
        <RoundManagementScreen />
      ) : activeTab === 'matches' ? (
        <MatchManagementScreen />
      ) : (
        <PlayerManagementScreen />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  accessDeniedIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  accessDeniedHint: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});
