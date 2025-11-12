import { Picker } from '@react-native-picker/picker';
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
import api from '../services/api';
import { Match, Player, Round } from '../types';

export default function MatchManagementScreen() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [player1Id, setPlayer1Id] = useState<number | null>(null);
  const [player2Id, setPlayer2Id] = useState<number | null>(null);
  const [matchOrder, setMatchOrder] = useState<string>('1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('⚔️ [MATCH MGMT] Component Mounted');
    loadData();
  }, []);

  useEffect(() => {
    if (selectedRound) {
      loadMatches();
    }
  }, [selectedRound]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load rounds
      const roundsResponse = await api.getRounds();
      if (roundsResponse.success && roundsResponse.data) {
        const roundsArray = roundsResponse.data as unknown as Round[];
        setRounds(roundsArray);
        console.log(`✅ [MATCH MGMT] Loaded ${roundsArray.length} rounds`);
      }

      // Load players
      const playersResponse = await api.getPlayers();
      if (playersResponse.success && playersResponse.data) {
        const playersArray = playersResponse.data as unknown as Player[];
        const qualifiedPlayers = playersArray.filter(p => p.qualified);
        setPlayers(qualifiedPlayers);
        console.log(`✅ [MATCH MGMT] Loaded ${qualifiedPlayers.length} qualified players`);
      }
    } catch (error) {
      console.error('❌ [MATCH MGMT] Error loading data:', error);
      Alert.alert(
        'Error',
        'Failed to load data. Please check your connection.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: loadData }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async () => {
    try {
      console.log(`⚔️ [MATCH MGMT] Loading matches for round ${selectedRound}`);
      const response = await api.getMatches(selectedRound);
      if (response.success && response.data) {
        setMatches(response.data);
        console.log(`✅ [MATCH MGMT] Loaded ${response.data.length} matches`);
      } else {
        setMatches([]);
      }
    } catch (error) {
      console.error('❌ [MATCH MGMT] Error loading matches:', error);
      setMatches([]);
    }
  };

  const handleCreateMatch = async () => {
    // Validation: Check if both players are selected
    if (!player1Id || !player2Id) {
      Alert.alert('Validation Error', 'Please select both players from the list');
      return;
    }

    // Validation: Check if players are different
    if (player1Id === player2Id) {
      Alert.alert('Validation Error', 'Player 1 and Player 2 must be different players');
      return;
    }

    // Validation: Check if selected players exist in the players list
    const player1Exists = players.find(p => p.id === player1Id);
    const player2Exists = players.find(p => p.id === player2Id);
    
    if (!player1Exists || !player2Exists) {
      Alert.alert('Error', 'One or both selected players no longer exist. Please refresh and try again.');
      loadData(); // Reload players
      return;
    }

    // Validation: Check if match already exists for these players in this round
    const matchExists = matches.find(
      m => (m.player1.id === player1Id && m.player2.id === player2Id) ||
           (m.player1.id === player2Id && m.player2.id === player1Id)
    );
    
    if (matchExists) {
      Alert.alert('Duplicate Match', `A match between ${player1Exists.name} and ${player2Exists.name} already exists in this round.`);
      return;
    }

    // Validation: Check match order
    const orderNum = parseInt(matchOrder);
    if (isNaN(orderNum) || orderNum < 1) {
      Alert.alert('Validation Error', 'Match order must be a positive number');
      return;
    }

    setSaving(true);
    try {
      console.log('⚔️ [MATCH MGMT] Creating match...', {
        round: selectedRound,
        player1: player1Exists.name,
        player2: player2Exists.name,
        order: orderNum
      });
      
      const response = await api.createMatch({
        round: selectedRound,
        player1Id,
        player2Id,
        matchOrder: orderNum,
      });

      if (response.success) {
        console.log('✅ [MATCH MGMT] Match created successfully');
        Alert.alert('Success', `Match created: ${player1Exists.name} vs ${player2Exists.name}`);
        // Reset form
        setPlayer1Id(null);
        setPlayer2Id(null);
        setMatchOrder('1');
        // Reload matches
        loadMatches();
      } else {
        Alert.alert('Error', response.error || 'Failed to create match');
      }
    } catch (error) {
      console.error('❌ [MATCH MGMT] Error creating match:', error);
      Alert.alert('Error', 'Failed to create match. Please check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMatch = async (matchId: number) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this match?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`⚔️ [MATCH MGMT] Deleting match ${matchId}`);
              const response = await api.deleteMatch(matchId);
              if (response.success) {
                console.log('✅ [MATCH MGMT] Match deleted successfully');
                Alert.alert('Success', 'Match deleted successfully');
                loadMatches();
              } else {
                Alert.alert('Error', response.error || 'Failed to delete match');
              }
            } catch (error) {
              console.error('❌ [MATCH MGMT] Error deleting match:', error);
              Alert.alert('Error', 'Failed to delete match');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a237e" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚔️ Match Management</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={loadData}
          disabled={loading}
        >
          <Text style={styles.refreshButtonText}>
            {loading ? '⟳' : '🔄'} Refresh
          </Text>
        </TouchableOpacity>
      </View>

      {/* Round Selector */}
      <View style={styles.card}>
        <Text style={styles.label}>Select Round</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedRound}
            onValueChange={(value) => setSelectedRound(value)}
            style={styles.picker}
          >
            {rounds.map((round) => (
              <Picker.Item
                key={round.round}
                label={`Round ${round.round}`}
                value={round.round}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Create Match Form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create New Match</Text>
        
        {players.length === 0 ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>⚠️ No players available</Text>
            <Text style={styles.warningSubtext}>
              Please add qualified players in Player Management before creating matches.
            </Text>
          </View>
        ) : (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ✅ {players.length} qualified player{players.length !== 1 ? 's' : ''} available
            </Text>
          </View>
        )}

        <Text style={styles.label}>Player 1</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={player1Id}
            onValueChange={(value) => setPlayer1Id(value)}
            style={styles.picker}
            enabled={players.length > 0}
          >
            <Picker.Item 
              label={players.length > 0 ? "Select Player 1" : "No players available"} 
              value={null} 
            />
            {players.map((player) => (
              <Picker.Item
                key={player.id}
                label={`${player.name} (${(player.price / 1000000).toFixed(1)}M)`}
                value={player.id}
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Player 2</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={player2Id}
            onValueChange={(value) => setPlayer2Id(value)}
            style={styles.picker}
            enabled={players.length > 0}
          >
            <Picker.Item 
              label={players.length > 0 ? "Select Player 2" : "No players available"} 
              value={null} 
            />
            {players.map((player) => (
              <Picker.Item
                key={player.id}
                label={`${player.name} (${(player.price / 1000000).toFixed(1)}M)`}
                value={player.id}
                enabled={player.id !== player1Id}
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Match Order</Text>
        <TextInput
          style={styles.input}
          value={matchOrder}
          onChangeText={setMatchOrder}
          keyboardType="numeric"
          placeholder="1"
        />

        <TouchableOpacity
          style={[
            styles.button, 
            (saving || players.length === 0) && styles.buttonDisabled
          ]}
          onPress={handleCreateMatch}
          disabled={saving || players.length === 0}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Creating...' : players.length === 0 ? 'No Players Available' : 'Create Match'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Existing Matches */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Existing Matches for Round {selectedRound}</Text>
        {matches.length > 0 ? (
          matches
            .sort((a, b) => a.matchOrder - b.matchOrder)
            .map((match) => (
              <View key={match.id} style={styles.matchCard}>
                <View style={styles.matchInfo}>
                  <Text style={styles.matchOrder}>#{match.matchOrder}</Text>
                  <View style={styles.matchPlayers}>
                    <Text style={styles.playerName}>{match.player1.name}</Text>
                    <Text style={styles.vsText}>VS</Text>
                    <Text style={styles.playerName}>{match.player2.name}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteMatch(match.id)}
                >
                  <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            ))
        ) : (
          <Text style={styles.noMatchesText}>No matches created yet</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#757575',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  refreshButton: {
    backgroundColor: '#1a237e',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
    marginTop: 10,
    marginBottom: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    marginBottom: 10,
  },
  picker: {
    height: 50,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#1a237e',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#9e9e9e',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  matchCard: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#1a237e',
  },
  matchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  matchOrder: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
    marginRight: 15,
    minWidth: 40,
  },
  matchPlayers: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
    flex: 1,
    textAlign: 'center',
  },
  vsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a237e',
    marginHorizontal: 10,
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noMatchesText: {
    fontSize: 15,
    color: '#757575',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
    padding: 12,
    borderRadius: 6,
    marginBottom: 15,
  },
  warningText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 5,
  },
  warningSubtext: {
    fontSize: 14,
    color: '#856404',
  },
  infoBox: {
    backgroundColor: '#d4edda',
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
    padding: 12,
    borderRadius: 6,
    marginBottom: 15,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#155724',
  },
});
