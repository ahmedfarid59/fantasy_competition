import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../services/api';
import { ErrorHandler } from '../utils/errorHandler';

interface Round {
  round: number;
  deadline: string;
  playersAllowed: number;
  budget: number | null;
  isClosed?: boolean;
  freeTransfers?: number;
  transferPenalty?: number;
}

export default function RoundManagementScreen() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);

  // Form state
  const [roundNumber, setRoundNumber] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [budget, setBudget] = useState('');
  const [freeTransfers, setFreeTransfers] = useState('1');
  const [transferPenalty, setTransferPenalty] = useState('30');
  const [deadline, setDeadline] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false); // Only used for iOS

  useEffect(() => {
    fetchRounds();
  }, []);

  // Cleanup: Hide date picker when component unmounts
  useEffect(() => {
    return () => {
      setShowDatePicker(false);
    };
  }, []);

  const fetchRounds = async () => {
    const context = {
      screen: 'RoundManagementScreen',
      function: 'fetchRounds',
      operation: 'Fetch all rounds',
    };

    try {
      ErrorHandler.logOperation(context);
      setLoading(true);
      
      console.log('📥 [RoundManagement] Fetching rounds from API...');
      const response = await api.getRounds();
      
      console.log('📥 [RoundManagement] API Response:', {
        success: response.success,
        hasData: !!response.data,
        dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
        dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
      });

      if (response.success && response.data) {
        const roundsData = Array.isArray(response.data) ? response.data : [];
        setRounds(roundsData.sort((a: Round, b: Round) => a.round - b.round));
        ErrorHandler.logSuccess(context, { roundsCount: roundsData.length });
      } else {
        throw new Error(response.error || 'Failed to load rounds');
      }
    } catch (error: any) {
      console.error('❌ [RoundManagement] fetchRounds error:', {
        error: error.message || error,
        stack: error.stack,
      });
      
      ErrorHandler.handleError(error, {
        context,
        showAlert: false,
      });
      
      Alert.alert(
        'Error',
        error.message || 'Failed to load rounds',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: fetchRounds }
        ]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openCreateModal = () => {
    setEditingRound(null);
    
    // Auto-generate next round number
    const nextRoundNumber = rounds.length > 0 
      ? Math.max(...rounds.map(r => r.round)) + 1 
      : 1;
    setRoundNumber(nextRoundNumber.toString());
    
    setTeamSize('');
    setBudget('');
    setFreeTransfers('1');
    setTransferPenalty('30');
    setDeadline(new Date());
    setShowDatePicker(false);
    setModalVisible(true);
  };

  const openEditModal = (round: Round) => {
    setEditingRound(round);
    setRoundNumber(round.round.toString());
    setTeamSize(round.playersAllowed.toString());
    setBudget(round.budget?.toString() || '');
    setFreeTransfers(round.freeTransfers?.toString() || '1');
    setTransferPenalty(round.transferPenalty?.toString() || '30');
    setDeadline(new Date(round.deadline));
    setShowDatePicker(false);
    setModalVisible(true);
  };

  const showDateTimePicker = () => {
    if (Platform.OS === 'android') {
      // Use imperative API for Android to avoid dismiss() errors
      DateTimePickerAndroid.open({
        value: deadline,
        mode: 'date',
        is24Hour: true,
        onChange: (event, selectedDate) => {
          if (event.type === 'set' && selectedDate) {
            // After date is set, show time picker
            DateTimePickerAndroid.open({
              value: selectedDate,
              mode: 'time',
              is24Hour: true,
              onChange: (timeEvent, selectedTime) => {
                if (timeEvent.type === 'set' && selectedTime) {
                  setDeadline(selectedTime);
                  console.log('📅 Date and time set:', selectedTime);
                }
              },
            });
          }
        },
      });
    } else {
      // iOS uses declarative component
      setShowDatePicker(true);
    }
  };

  const handleIOSDatePickerChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDeadline(selectedDate);
      console.log('📅 iOS date set:', selectedDate);
    }
  };

  const closeModal = () => {
    setShowDatePicker(false);
    setModalVisible(false);
  };

  const handleSave = async () => {
    const context = {
      screen: 'RoundManagementScreen',
      function: 'handleSave',
      operation: editingRound ? 'Update round' : 'Create round',
      data: { roundNumber, teamSize, budget, deadline, freeTransfers, transferPenalty },
    };

    console.log('🔵 [RoundManagement] handleSave called:', {
      isEditing: !!editingRound,
      roundNumber,
      teamSize,
      budget,
      deadline: deadline.toISOString(),
      freeTransfers,
      transferPenalty,
    });

    // Validation
    if (!roundNumber || !teamSize) {
      console.warn('⚠️ [RoundManagement] Validation failed: Missing required fields');
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    const roundNum = parseInt(roundNumber);
    const teamSizeNum = parseInt(teamSize);
    const budgetNum = budget ? parseInt(budget) : null;
    const freeTransfersNum = freeTransfers ? parseInt(freeTransfers) : 1;
    const transferPenaltyNum = transferPenalty ? parseInt(transferPenalty) : 30;

    if (isNaN(roundNum) || roundNum <= 0) {
      console.warn('⚠️ [RoundManagement] Validation failed: Invalid round number', { roundNumber, parsed: roundNum });
      Alert.alert('Validation Error', 'Please enter a valid round number');
      return;
    }

    if (isNaN(teamSizeNum) || teamSizeNum <= 0) {
      console.warn('⚠️ [RoundManagement] Validation failed: Invalid team size', { teamSize, parsed: teamSizeNum });
      Alert.alert('Validation Error', 'Please enter a valid team size');
      return;
    }

    if (isNaN(freeTransfersNum) || freeTransfersNum < 0) {
      console.warn('⚠️ [RoundManagement] Validation failed: Invalid free transfers', { freeTransfers, parsed: freeTransfersNum });
      Alert.alert('Validation Error', 'Please enter a valid number for free transfers');
      return;
    }

    if (isNaN(transferPenaltyNum) || transferPenaltyNum < 0) {
      console.warn('⚠️ [RoundManagement] Validation failed: Invalid transfer penalty', { transferPenalty, parsed: transferPenaltyNum });
      Alert.alert('Validation Error', 'Please enter a valid transfer penalty');
      return;
    }

    try {
      ErrorHandler.logOperation(context);

      const roundData = {
        round: roundNum,
        deadline: deadline.toISOString(),
        team_size: teamSizeNum,
        budget: budgetNum,
        free_transfers: freeTransfersNum,
        transfer_penalty: transferPenaltyNum,
      };

      console.log('📤 [RoundManagement] Sending round data:', roundData);

      let response;
      if (editingRound) {
        // Update existing round
        console.log('🔄 [RoundManagement] Updating round:', editingRound.round);
        response = await api.updateRound(editingRound.round, {
          deadline: deadline.toISOString(),
          team_size: teamSizeNum,
          budget: budgetNum,
          free_transfers: freeTransfersNum,
          transfer_penalty: transferPenaltyNum,
        });
        
        console.log('📥 [RoundManagement] Update response:', {
          success: response.success,
          error: response.error,
          statusCode: response.statusCode,
        });
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to update round');
        }
        Alert.alert('Success', `Round ${roundNum} updated successfully`);
        ErrorHandler.logSuccess(context, { roundNumber: roundNum });
      } else {
        // Create new round
        console.log('➕ [RoundManagement] Creating new round');
        response = await api.createRound(roundData);
        
        console.log('📥 [RoundManagement] Create response:', {
          success: response.success,
          error: response.error,
          statusCode: response.statusCode,
        });
        
        if (!response.success) {
          const errorDetail = response.error || 'Failed to create round';
          console.error('❌ [RoundManagement] Backend error:', errorDetail);
          throw new Error(errorDetail);
        }
        Alert.alert('Success', `Round ${roundNum} created successfully`);
        ErrorHandler.logSuccess(context, { roundNumber: roundNum });
      }

      setModalVisible(false);
      // Refresh rounds list
      await fetchRounds();
    } catch (error: any) {
      console.error('❌ [RoundManagement] handleSave error:', {
        error: error.message || error,
        stack: error.stack,
        isEditing: !!editingRound,
        roundData: { roundNumber, teamSize, budget },
      });
      
      ErrorHandler.handleError(error, {
        context,
        showAlert: false,
      });
      
      Alert.alert('Error', error.message || 'Failed to save round');
    }
  };

  const handleDelete = (round: Round) => {
    console.log('🗑️ [RoundManagement] Delete requested for round:', round.round);
    
    Alert.alert(
      'Delete Round',
      `Are you sure you want to delete Round ${round.round}?\n\n⚠️ This will also delete all associated matches for this round.\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const context = {
              screen: 'RoundManagementScreen',
              function: 'handleDelete',
              operation: 'Delete round',
              data: { roundNumber: round.round },
            };

            try {
              ErrorHandler.logOperation(context);
              console.log('🗑️ [RoundManagement] Deleting round:', round.round);
              
              const response = await api.deleteRound(round.round);
              
              console.log('📥 [RoundManagement] Delete response:', {
                success: response.success,
                error: response.error,
                statusCode: response.statusCode,
              });
              
              if (!response.success) {
                throw new Error(response.error || 'Failed to delete round');
              }
              
              Alert.alert('Success', `Round ${round.round} deleted`);
              ErrorHandler.logSuccess(context, { roundNumber: round.round });
              fetchRounds();
            } catch (error: any) {
              console.error('❌ [RoundManagement] handleDelete error:', {
                error: error.message || error,
                stack: error.stack,
                roundNumber: round.round,
              });
              
              ErrorHandler.handleError(error, {
                context,
                showAlert: false,
              });
              
              Alert.alert('Error', error.message || 'Failed to delete round');
            }
          },
        },
      ]
    );
  };

  const handleCloseRound = (round: Round) => {
    console.log('🔒 [RoundManagement] Close requested for round:', round.round);
    
    Alert.alert(
      'Close Round',
      `Are you sure you want to close Round ${round.round} now? This will prevent any more team submissions, even before the deadline.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Round',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔒 [RoundManagement] Closing round:', round.round);
              const response = await api.closeRound(round.round);
              
              if (!response.success) {
                throw new Error(response.error || 'Failed to close round');
              }
              
              Alert.alert('Success', `Round ${round.round} has been closed`);
              fetchRounds();
            } catch (error: any) {
              console.error('❌ [RoundManagement] handleCloseRound error:', error);
              Alert.alert('Error', error.message || 'Failed to close round');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderRound = ({ item }: { item: Round }) => {
    const isPastDeadline = new Date(item.deadline) < new Date();
    const isClosed = item.isClosed || false;
    
    return (
      <View style={styles.roundCard}>
        <View style={styles.roundHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.roundTitle}>Round {item.round}</Text>
            {isClosed && (
              <View style={styles.closedBadge}>
                <Text style={styles.closedBadgeText}>🔒 CLOSED</Text>
              </View>
            )}
          </View>
          <View style={styles.actionButtons}>
            {!isClosed && !isPastDeadline && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => handleCloseRound(item)}
              >
                <Text style={styles.closeButtonText}>Close Now</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => openEditModal(item)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.roundDetails}>
          <Text style={styles.detailText}>
            📅 Deadline: {formatDate(item.deadline)}
          </Text>
          <Text style={styles.detailText}>
            👥 Team Size: {item.playersAllowed} players
          </Text>
        <Text style={styles.detailText}>
          💰 Budget: {item.budget ? `$${item.budget.toLocaleString()}` : 'Unlimited'}
        </Text>
          <Text style={styles.detailText}>
            🔄 Free Transfers: {item.freeTransfers ?? 1}
          </Text>
          <Text style={styles.detailText}>
            ⚠️ Transfer Penalty: {item.transferPenalty ?? 30} points
          </Text>
        {isClosed && (
          <Text style={[styles.detailText, styles.closedText]}>
            🔒 Round closed by admin
          </Text>
        )}
      </View>
    </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading rounds...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rounds}
        renderItem={renderRound}
        keyExtractor={(item) => item.round.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No rounds created yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to create your first round
            </Text>
          </View>
        }
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          fetchRounds();
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* DateTimePicker - Only for iOS (Android uses imperative API) */}
      {Platform.OS === 'ios' && showDatePicker && (
        <DateTimePicker
          value={deadline}
          mode="datetime"
          display="spinner"
          onChange={handleIOSDatePickerChange}
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingRound ? 'Edit Round' : 'Create Round'}
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Round Number {!editingRound && '(Auto-generated)'}
              </Text>
              <View style={styles.roundNumberDisplay}>
                <Text style={styles.roundNumberText}>Round {roundNumber}</Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Team Size *</Text>
              <TextInput
                style={styles.input}
                value={teamSize}
                onChangeText={setTeamSize}
                placeholder="e.g., 5"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Budget (optional)</Text>
              <TextInput
                style={styles.input}
                value={budget}
                onChangeText={setBudget}
                placeholder="Leave empty for unlimited"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Free Transfers (default: 1)</Text>
              <TextInput
                style={styles.input}
                value={freeTransfers}
                onChangeText={setFreeTransfers}
                placeholder="e.g., 1"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Transfer Penalty (default: 30)</Text>
              <TextInput
                style={styles.input}
                value={transferPenalty}
                onChangeText={setTransferPenalty}
                placeholder="e.g., 30"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Deadline *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={showDateTimePicker}
              >
                <Text style={styles.dateButtonText}>
                  {deadline.toLocaleString()}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>
                  {editingRound ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    padding: 15,
  },
  roundCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roundTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closedBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  closedBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  closeButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 5,
  },
  editButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  roundDetails: {
    gap: 8,
  },
  detailText: {
    fontSize: 15,
    color: '#666',
  },
  closedText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#FFF',
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  inputDisabled: {
    backgroundColor: '#F0F0F0',
    color: '#999',
  },
  roundNumberDisplay: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  roundNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFF',
  },
  dateButtonText: {
    fontSize: 16,
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
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
