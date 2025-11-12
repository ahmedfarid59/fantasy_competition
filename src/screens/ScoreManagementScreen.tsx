import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface Player {
  id: number;
  name: string;
  price: number;
  qualified: boolean;
}

interface RoundInfo {
  round: number;
  deadline: string;
  playersAllowed: number;
  budget: number | null;
}

interface PlayerScore {
  playerId: number;
  points: number;
}

export default function ScoreManagementScreen() {
  const { isAdmin, user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<RoundInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [showRoundPicker, setShowRoundPicker] = useState(false);
  const [scores, setScores] = useState<{ [playerId: number]: string }>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch players
      const playersResponse = await api.getPlayers();
      if (playersResponse.success && playersResponse.data) {
        const playersData = playersResponse.data as Player[];
        setPlayers(playersData);
        
        // Initialize scores to 0
        const initialScores: { [playerId: number]: string } = {};
        playersData.forEach((player: Player) => {
          initialScores[player.id] = '0';
        });
        setScores(initialScores);
      }

      // Fetch rounds
      const roundsResponse = await api.getRounds();
      if (roundsResponse.success && roundsResponse.data) {
        const roundsData = roundsResponse.data as RoundInfo[];
        setRounds(roundsData);
        if (roundsData.length > 0) {
          setSelectedRound(roundsData[0].round);
        }
      }
    } catch (error) {
      console.error('❌ [SCORES] Error loading data:', error);
      Alert.alert(
        'Error',
        'Failed to load data. Please check your connection.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: fetchData }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (playerId: number, value: string) => {
    // Allow only numbers (including negative)
    const numericValue = value.replace(/[^0-9-]/g, '');
    setScores(prev => ({
      ...prev,
      [playerId]: numericValue
    }));
  };

  const handleSaveScores = async () => {
    if (!selectedRound) {
      Alert.alert('Error', 'Please select a round');
      return;
    }

    // Validate all scores are numbers
    const playerScores: PlayerScore[] = [];
    let hasError = false;

    players.forEach(player => {
      const scoreValue = scores[player.id] || '0';
      const points = parseInt(scoreValue);
      
      if (isNaN(points)) {
        hasError = true;
        Alert.alert('Error', `Invalid score for ${player.name}`);
        return;
      }
      
      playerScores.push({
        playerId: player.id,
        points: points
      });
    });

    if (hasError) return;

    Alert.alert(
      'Update Scores',
      `Update scores for Round ${selectedRound}?\n\nThis will affect all users' points.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            setSaving(true);
            try {
              const response = await api.updatePlayerScores({
                round: selectedRound,
                scores: playerScores
              });

              if (response.success) {
                Alert.alert('Success', 'Scores updated successfully!');
              } else {
                Alert.alert('Error', response.error || 'Failed to update scores');
              }
            } catch (error: any) {
              console.error('❌ [SCORES] Error:', error);
              Alert.alert('Error', error.message || 'Failed to update scores');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const handleSetAllScores = (value: string) => {
    Alert.alert(
      'Set All Scores',
      `Set all players to ${value} points for this round?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set All',
          onPress: () => {
            const newScores: { [playerId: number]: string } = {};
            players.forEach(player => {
              newScores[player.id] = value;
            });
            setScores(newScores);
          }
        }
      ]
    );
  };

  if (!isAdmin) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>⚠️ Admin access required</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (rounds.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>📅</Text>
        <Text style={styles.emptyTitle}>No Rounds Available</Text>
        <Text style={styles.emptyText}>
          Please create a round first before updating scores.
        </Text>
      </View>
    );
  }

  const getSelectedRoundLabel = () => {
    if (!selectedRound) return 'Select Round';
    return `Round ${selectedRound}`;
  };

  const hasRounds = rounds.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Update Player Scores</Text>
        
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setShowRoundPicker(true)}
          disabled={!hasRounds}
        >
          <Text style={styles.dropdownText}>{getSelectedRoundLabel()}</Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={players}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.playerCard}>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{item.name}</Text>
              <Text style={styles.playerPrice}>
                {(item.price / 1000000).toFixed(1)}M EGP
              </Text>
            </View>
            <View style={styles.scoreInput}>
              <Text style={styles.scoreLabel}>Points:</Text>
              <TextInput
                style={[styles.input, !hasRounds && styles.inputDisabled]}
                value={scores[item.id] || '0'}
                onChangeText={(value) => handleScoreChange(item.id, value)}
                keyboardType="numeric"
                placeholder="0"
                editable={hasRounds}
              />
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, (saving || !hasRounds) && styles.saveButtonDisabled]}
          onPress={handleSaveScores}
          disabled={saving || !hasRounds}
        >
          {saving ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>
              {hasRounds ? `Update Scores for Round ${selectedRound}` : 'No Round Available'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Round Picker Modal */}
      <Modal
        visible={showRoundPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRoundPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRoundPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Round</Text>
            
            {rounds.map((round) => (
              <TouchableOpacity
                key={round.round}
                style={[styles.roundOption, selectedRound === round.round && styles.roundOptionSelected]}
                onPress={() => {
                  setSelectedRound(round.round);
                  setShowRoundPicker(false);
                }}
              >
                <Text style={[styles.roundOptionText, selectedRound === round.round && styles.roundOptionTextSelected]}>
                  Round {round.round}
                </Text>
                {selectedRound === round.round && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  header: {
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  dropdown: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  listContent: {
    padding: 15,
  },
  playerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  playerPrice: {
    fontSize: 12,
    color: '#666',
  },
  scoreInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    width: 80,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  footer: {
    backgroundColor: 'white',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    padding: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  roundOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  roundOptionSelected: {
    backgroundColor: '#E3F2FD',
  },
  roundOptionText: {
    fontSize: 16,
    color: '#333',
  },
  roundOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
});
