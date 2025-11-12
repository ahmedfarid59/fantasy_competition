import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

interface Player {
  id: number;
  name: string;
  price: number;
  qualified: boolean;
  points?: number;
}

export default function PlayerManagementScreen() {
  const { isAdmin } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [qualified, setQualified] = useState(true);
  const [points, setPoints] = useState('0');

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const result = await apiService.getPlayers();
      
      if (result.success && result.data) {
        const playerData = result.data as Player[];
        setPlayers(playerData);
        console.log(`✅ [PLAYERS] Loaded ${playerData.length} players`);
      } else {
        console.error('❌ [PLAYERS] Error loading players:', result.error);
        Alert.alert(
          'Error',
          result.error || 'Failed to load players',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: fetchPlayers }
          ]
        );
      }
    } catch (error) {
      console.error('❌ [PLAYERS] Error loading players:', error);
      Alert.alert(
        'Error',
        'Failed to load players. Please check your connection.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: fetchPlayers }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingPlayer(null);
    setName('');
    setPrice('');
    setQualified(true);
    setPoints('0');
    setModalVisible(true);
  };

  const openEditModal = (player: Player) => {
    setEditingPlayer(player);
    setName(player.name);
    setPrice(player.price.toString());
    setQualified(player.qualified);
    setPoints((player.points ?? 0).toString());
    setModalVisible(true);
  };

  const handleSave = async () => {
    // Validate name
    if (!name || !name.trim()) {
      Alert.alert('Validation Error', 'Player name is required');
      return;
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      Alert.alert('Validation Error', 'Player name must be at least 2 characters long');
      return;
    }

    if (trimmedName.length > 100) {
      Alert.alert('Validation Error', 'Player name cannot exceed 100 characters');
      return;
    }

    // Validate price
    if (!price || !price.trim()) {
      Alert.alert('Validation Error', 'Player price is required');
      return;
    }

    const priceNum = parseInt(price);
    if (isNaN(priceNum)) {
      Alert.alert('Validation Error', 'Price must be a valid number');
      return;
    }

    if (priceNum < 1000000) {
      Alert.alert('Validation Error', 'Price must be at least 1,000,000');
      return;
    }

    if (priceNum > 10000000) {
      Alert.alert('Validation Error', 'Price cannot exceed 10,000,000');
      return;
    }

    // Validate points
    const pointsNum = points ? parseInt(points) : 0;
    if (isNaN(pointsNum)) {
      Alert.alert('Validation Error', 'Points must be a valid number');
      return;
    }

    if (pointsNum < 0) {
      Alert.alert('Validation Error', 'Points cannot be negative');
      return;
    }

    // Validate qualified field
    if (typeof qualified !== 'boolean') {
      Alert.alert('Validation Error', 'Invalid qualified status');
      return;
    }

    // Validate editing player if in edit mode
    if (editingPlayer && (!editingPlayer.id || editingPlayer.id <= 0)) {
      Alert.alert('Error', 'Invalid player ID. Please refresh and try again.');
      return;
    }

    try {
      const playerData = {
        name: trimmedName,
        price: priceNum,
        qualified,
        points: pointsNum,
      };

      console.log('💾 [PLAYERS] Saving player:', playerData);
      
      const result = editingPlayer 
        ? await apiService.updatePlayer(editingPlayer.id, playerData)
        : await apiService.createPlayer(playerData);

      if (result.success) {
        Alert.alert(
          'Success',
          editingPlayer ? 'Player updated successfully' : 'Player created successfully'
        );
        setModalVisible(false);
        fetchPlayers();
      } else {
        console.error('❌ [PLAYERS] Save failed:', result.error);
        
        // Check for specific error types
        if (result.error?.includes('Unauthorized') || result.error?.includes('User not found')) {
          Alert.alert(
            'Authentication Error',
            'Your session may have expired or your account was not found. Please log out and log in again.',
            [{ text: 'OK' }]
          );
        } else if (result.error?.includes('already exists')) {
          Alert.alert(
            'Duplicate Player',
            result.error || 'A player with this name already exists',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', result.error || 'Failed to save player');
        }
      }
    } catch (error) {
      console.error('❌ [PLAYERS] Error saving player:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to save player: ${errorMsg}`);
    }
  };

  const handleDelete = (player: Player) => {
    // Validate player
    if (!player || !player.id || player.id <= 0) {
      Alert.alert('Error', 'Invalid player. Please refresh and try again.');
      return;
    }

    if (!player.name) {
      Alert.alert('Error', 'Invalid player data. Please refresh and try again.');
      return;
    }

    Alert.alert(
      'Delete Player',
      `Are you sure you want to delete "${player.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`🗑️ [PLAYERS] Deleting player: ${player.name} (ID: ${player.id})`);
              const result = await apiService.deletePlayer(player.id);

              if (result.success) {
                Alert.alert('Success', result.data?.message || 'Player deleted successfully');
                fetchPlayers();
              } else {
                console.error('❌ [PLAYERS] Delete failed:', result.error);
                
                // Check for specific error types
                if (result.error?.includes('Unauthorized')) {
                  Alert.alert(
                    'Authentication Error',
                    'Your session may have expired. Please log out and log in again.',
                    [{ text: 'OK' }]
                  );
                } else if (result.error?.includes('used in') || result.error?.includes('selected in')) {
                  Alert.alert(
                    'Cannot Delete',
                    result.error || 'This player is currently in use and cannot be deleted',
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert('Error', result.error || 'Failed to delete player');
                }
              }
            } catch (error) {
              console.error('❌ [PLAYERS] Error deleting player:', error);
              const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
              Alert.alert('Error', `Failed to delete player: ${errorMsg}`);
            }
          },
        },
      ]
    );
  };

  const formatPrice = (price: number) => {
    return `${(price / 1000000).toFixed(1)}M EGP`;
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Player Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add Player</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={players}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.playerCard}>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{item.name}</Text>
              <Text style={styles.playerPrice}>{formatPrice(item.price)}</Text>
              <Text style={styles.playerPoints}>⭐ {item.points ?? 0} points</Text>
              <Text style={[styles.playerStatus, item.qualified ? styles.qualified : styles.disqualified]}>
                {item.qualified ? '✓ Qualified' : '✗ Disqualified'}
              </Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No players yet</Text>
            <Text style={styles.emptySubtext}>Add players to get started</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>
                {editingPlayer ? 'Edit Player' : 'Add New Player'}
              </Text>

              <Text style={styles.label}>Player Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter player name"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Price (EGP)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 10000000 for 10M"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Current Points</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 50"
                value={points}
                onChangeText={setPoints}
                keyboardType="numeric"
              />

              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setQualified(!qualified)}
                >
                  <View style={[styles.checkboxInner, qualified && styles.checkboxChecked]}>
                    {qualified && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Qualified</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSave}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  playerCard: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 12,
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
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  playerPoints: {
    fontSize: 13,
    color: '#FF9500',
    fontWeight: '600',
    marginBottom: 4,
  },
  playerStatus: {
    fontSize: 12,
  },
  qualified: {
    color: '#34C759',
  },
  disqualified: {
    color: '#FF3B30',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  checkboxContainer: {
    marginTop: 15,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
