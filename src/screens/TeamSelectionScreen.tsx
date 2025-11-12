import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    AccessibilityInfo,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useGame } from '../context/GameContext';
import { Player } from '../types';
import { ErrorHandler } from '../utils/errorHandler';
import { playSound, SoundEffect } from '../utils/sounds';

export default function TeamSelectionScreen() {
  const {
    players,
    selectedPlayers,
    captainId,
    selectPlayer,
    removePlayer,
    setCaptain,
    saveTeam,
    getCurrentRoundInfo,
    getRemainingBudget,
    canSelectPlayer,
    transfersUsed,
    pointsConfig,
    refreshData,
    hasMatches,
  } = useGame();

  const roundInfo = getCurrentRoundInfo();
  const remainingBudget = getRemainingBudget();
  const [previousTeamSize, setPreviousTeamSize] = useState(0);
  const [initialPlayers, setInitialPlayers] = useState<number[]>([]);
  const [transferCount, setTransferCount] = useState(0);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 [TEAM SELECTION] Screen focused, refreshing data...');
      refreshData();
    }, [refreshData])
  );

  useEffect(() => {
    console.log('👥 [TEAM SELECTION] Component Mounted');
    console.log('📋 [TEAM SELECTION] Available Players:', players.length);
    console.log('📋 [TEAM SELECTION] Round Info:', roundInfo);
    console.log('📋 [TEAM SELECTION] Currently Selected:', selectedPlayers);
    console.log('📋 [TEAM SELECTION] Transfers Used:', transfersUsed);
    AccessibilityInfo.announceForAccessibility(
      `Team Selection Screen. Select ${roundInfo?.playersAllowed} players for Round ${roundInfo?.round}`
    );
  }, []);

  useEffect(() => {
    // Announce budget changes
    if (roundInfo?.budget !== null) {
      AccessibilityInfo.announceForAccessibility(
        `Remaining budget: ${formatCurrency(remainingBudget)}`
      );
    }
  }, [remainingBudget]);

  useEffect(() => {
    // Announce team size changes
    if (selectedPlayers.length > previousTeamSize) {
      AccessibilityInfo.announceForAccessibility(
        `Player added. ${selectedPlayers.length} of ${roundInfo?.playersAllowed} players selected`
      );
    } else if (selectedPlayers.length < previousTeamSize) {
      AccessibilityInfo.announceForAccessibility(
        `Player removed. ${selectedPlayers.length} of ${roundInfo?.playersAllowed} players selected`
      );
    }
    setPreviousTeamSize(selectedPlayers.length);
  }, [selectedPlayers.length]);

  // Track initial team to calculate transfers
  useEffect(() => {
    if (selectedPlayers.length === roundInfo?.playersAllowed && initialPlayers.length === 0) {
      setInitialPlayers([...selectedPlayers]);
    }
  }, [selectedPlayers, roundInfo, initialPlayers.length]);

  // Calculate transfers made
  useEffect(() => {
    if (initialPlayers.length > 0) {
      const initialSet = new Set(initialPlayers);
      const currentSet = new Set(selectedPlayers);
      const playersIn = selectedPlayers.filter(p => !initialSet.has(p));
      setTransferCount(playersIn.length);
    } else {
      setTransferCount(0);
    }
  }, [selectedPlayers, initialPlayers]);

  const formatCurrency = (amount: number) => {
    if (amount === Infinity) return 'Unlimited';
    return `${(amount / 1000000).toFixed(1)}M EGP`;
  };

  const handleSelectPlayer = (player: Player) => {
    const context = {
      screen: 'TeamSelectionScreen',
      function: 'handleSelectPlayer',
      operation: 'Select/remove player',
      data: { playerId: player.id, playerName: player.name },
    };

    console.log('� [TeamSelection] handleSelectPlayer called:', {
      player: { id: player.id, name: player.name, price: player.price },
      currentlySelected: selectedPlayers.length,
      maxAllowed: roundInfo?.playersAllowed,
      remainingBudget,
      isAlreadySelected: selectedPlayers.includes(player.id),
    });
    
    // Validate player object
    if (!player || !player.id) {
      console.error('❌ [TeamSelection] Invalid player object:', player);
      ErrorHandler.handleError('Invalid player object', { context, showAlert: false });
      Alert.alert('Error', 'Invalid player. Please refresh and try again.');
      return;
    }

    // Validate player exists in the players list
    const playerExists = players.find(p => p.id === player.id);
    if (!playerExists) {
      console.error('❌ [TeamSelection] Player not found in players list:', {
        playerId: player.id,
        totalPlayers: players.length,
      });
      ErrorHandler.handleError(`Player ${player.id} not found`, { context, showAlert: false });
      Alert.alert(
        'Player Not Found',
        'This player no longer exists. Please refresh the player list.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Validate round info
    if (!roundInfo) {
      console.error('❌ [TeamSelection] No round info available');
      ErrorHandler.handleError('No round info', { context, showAlert: false });
      Alert.alert(
        'Invalid Round',
        'Unable to determine the current round. Please refresh and try again.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (selectedPlayers.includes(player.id)) {
      console.log('📤 [TeamSelection] Removing player:', player.name);
      removePlayer(player.id);
      playSound(SoundEffect.SWIPE);
      ErrorHandler.logSuccess(context, { action: 'removed', playerId: player.id });
    } else if (canSelectPlayer(player.id)) {
      console.log('📥 [TeamSelection] Adding player:', player.name);
      selectPlayer(player.id);
      playSound(SoundEffect.CLICK);
      ErrorHandler.logSuccess(context, { action: 'selected', playerId: player.id });
    } else {
      // Provide specific feedback
      console.warn('⛔ [TeamSelection] Cannot select player - checking reason...');
      
      if (roundInfo && selectedPlayers.length >= roundInfo.playersAllowed) {
        console.log(`⛔ [TEAM SELECTION] Reason: Team is full (${selectedPlayers.length}/${roundInfo.playersAllowed})`);
        Alert.alert(
          'Team Full',
          `You can only select ${roundInfo.playersAllowed} players for this round.`,
          [{ text: 'OK', style: 'default' }],
          { cancelable: true }
        );
        AccessibilityInfo.announceForAccessibility(
          `Cannot select player. Team is full. Maximum ${roundInfo.playersAllowed} players allowed.`
        );
      } else if (roundInfo?.budget && player.price > remainingBudget) {
        console.log(`⛔ [TEAM SELECTION] Reason: Budget exceeded (Need: ${player.price / 1000000}M, Have: ${remainingBudget / 1000000}M)`);
        Alert.alert(
          'Budget Exceeded',
          `Not enough budget. You need ${formatCurrency(player.price)} but only have ${formatCurrency(remainingBudget)} remaining.`,
          [{ text: 'OK', style: 'default' }],
          { cancelable: true }
        );
        AccessibilityInfo.announceForAccessibility(
          `Cannot select player. Budget exceeded. Need ${formatCurrency(player.price)} but only ${formatCurrency(remainingBudget)} remaining.`
        );
      }
    }
  };

  const handleSaveTeam = async () => {
    const context = {
      screen: 'TeamSelectionScreen',
      function: 'handleSaveTeam',
      operation: 'Save team',
      data: {
        selectedCount: selectedPlayers.length,
        requiredCount: roundInfo?.playersAllowed,
        captainId,
        transfersUsed,
      },
    };

    ErrorHandler.logOperation(context);
    console.log('� [TeamSelection] Save team initiated:', {
      selectedPlayers: selectedPlayers.length,
      required: roundInfo?.playersAllowed,
      captainId,
      transfersUsed,
      selectedPlayerIds: selectedPlayers,
    });
    
    if (!roundInfo) {
      console.error('❌ [TeamSelection] No round info available');
      ErrorHandler.handleError('No round info', { context, showAlert: false });
      return;
    }
    
    if (selectedPlayers.length !== roundInfo.playersAllowed) {
      console.warn('⛔ [TeamSelection] Team incomplete:', {
        selected: selectedPlayers.length,
        required: roundInfo.playersAllowed,
        difference: roundInfo.playersAllowed - selectedPlayers.length,
      });
      Alert.alert(
        'Incomplete Team',
        `Please select exactly ${roundInfo.playersAllowed} players.`,
        [{ text: 'OK', style: 'default' }],
        { cancelable: true }
      );
      AccessibilityInfo.announceForAccessibility(
        `Cannot save. Please select exactly ${roundInfo.playersAllowed} players. Currently selected: ${selectedPlayers.length}`
      );
      return;
    }

    try {
      console.log('📤 [TeamSelection] Calling saveTeam...');
      await saveTeam();
      
      ErrorHandler.logSuccess(context, {
        playersCount: selectedPlayers.length,
        captainId,
      });
      console.log('✅ [TeamSelection] Team saved successfully');
      
      playSound(SoundEffect.SUCCESS);
      Alert.alert(
        'Team Saved',
        'Your team has been saved successfully!',
        [{ text: 'OK', style: 'default' }],
        { cancelable: true }
      );
      AccessibilityInfo.announceForAccessibility('Team saved successfully');
    } catch (error) {
      console.error('❌ [TeamSelection] Save team failed:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      ErrorHandler.handleError(error, { context });
    }
  };

  const qualifiedPlayers = players.filter(p => p.qualified);
  const selectedPlayerObjects = players.filter(p => selectedPlayers.includes(p.id));

  // Show message if no round is available
  if (!roundInfo) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateIcon}>📅</Text>
          <Text style={styles.emptyStateTitle}>No Upcoming Round</Text>
          <Text style={styles.emptyStateMessage}>
            There are currently no rounds available for team selection.
          </Text>
          <Text style={styles.emptyStateHint}>
            Please check back later or contact the admin to create a new round.
          </Text>
        </View>
      </View>
    );
  }

  // Show message if no matches exist for the round
  if (!hasMatches) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateIcon}>⚔️</Text>
          <Text style={styles.emptyStateTitle}>No Matches Available</Text>
          <Text style={styles.emptyStateMessage}>
            Matches for Round {roundInfo.round} haven't been created yet.
          </Text>
          <Text style={styles.emptyStateHint}>
            Team selection will be available once the admin creates matches for this round.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Transfer info banner */}
        {transferCount > 0 && roundInfo && (
          <View style={[styles.infoBanner, transferCount > roundInfo.freeTransfers ? styles.penaltyBanner : undefined]}>
            <Text style={styles.infoBannerIcon}>{transferCount > roundInfo.freeTransfers ? '⚠️' : '�'}</Text>
            <Text style={styles.infoBannerText}>
              {transferCount} transfer{transferCount !== 1 ? 's' : ''} made.
              {transferCount > roundInfo.freeTransfers 
                ? ` ${(transferCount - roundInfo.freeTransfers) * roundInfo.transferPenalty} points will be deducted.`
                : ` ${roundInfo.freeTransfers - transferCount} free transfer${roundInfo.freeTransfers - transferCount !== 1 ? 's' : ''} remaining.`
              }
            </Text>
          </View>
        )}

        {/* Round 1 info banner */}
        {roundInfo?.round === 1 && selectedPlayers.length > 0 && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerIcon}>ℹ️</Text>
            <Text style={styles.infoBannerText}>
              Round 1 team can only be saved once. Choose carefully!
            </Text>
          </View>
        )}

        {/* Budget and Team Info */}
        <View 
          style={styles.infoCard}
          accessible={true}
          accessibilityLabel={`Team information. Selected ${selectedPlayers.length} of ${roundInfo?.playersAllowed} players. Remaining budget: ${formatCurrency(remainingBudget)}`}
        >
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Players:</Text>
            <Text 
              style={styles.infoValue}
              accessible={true}
              accessibilityLabel={`${selectedPlayers.length} of ${roundInfo?.playersAllowed} players selected`}
            >
              {selectedPlayers.length} / {roundInfo?.playersAllowed}
            </Text>
          </View>
          {roundInfo?.budget !== null && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Budget:</Text>
              <Text 
                style={[
                  styles.infoValue,
                  remainingBudget < 0 && styles.budgetExceeded
                ]}
                accessible={true}
                accessibilityLabel={`Remaining budget: ${formatCurrency(remainingBudget)}`}
              >
                {formatCurrency(remainingBudget)}
              </Text>
            </View>
          )}
          {roundInfo && roundInfo.round > 1 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Transfers:</Text>
              <Text 
                style={[
                  styles.infoValue,
                  transferCount > roundInfo.freeTransfers && styles.penaltyText
                ]}
                accessible={true}
                accessibilityLabel={`${transferCount} transfers this edit. ${roundInfo.freeTransfers} free per round. ${roundInfo.transferPenalty} points penalty per extra transfer`}
              >
                {transferCount} ({roundInfo.freeTransfers} free, -{roundInfo.transferPenalty}pts each after)
              </Text>
            </View>
          )}
        </View>

        {/* Selected Players */}
        {selectedPlayerObjects.length > 0 && (
          <View style={styles.section}>
            <Text 
              style={styles.sectionTitle}
              accessible={true}
              accessibilityRole="header"
            >
              Your Team
            </Text>
            <Text style={styles.captainHint}>
              ⭐ Tap the star to set a captain (doubles their points!)
            </Text>
            {selectedPlayerObjects.map((player) => {
              const isCaptain = captainId === player.id;
              return (
                <View key={player.id} style={styles.playerCardContainer}>
                  <TouchableOpacity
                    style={[
                      styles.captainButton,
                      isCaptain && styles.captainButtonActive
                    ]}
                    onPress={() => setCaptain(isCaptain ? null : player.id)}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={isCaptain ? `${player.name} is captain` : `Set ${player.name} as captain`}
                    accessibilityHint="Double tap to toggle captain status"
                  >
                    <Text style={[
                      styles.captainButtonText,
                      isCaptain && styles.captainButtonTextActive
                    ]}>
                      ⭐
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.playerCard,
                      styles.selectedPlayerCard,
                      isCaptain && styles.captainPlayerCard
                    ]}
                    onPress={() => handleSelectPlayer(player)}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${player.name} from team. Price: ${formatCurrency(player.price)}${isCaptain ? '. Currently captain' : ''}`}
                    accessibilityHint="Double tap to remove this player from your team"
                  >
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>
                        {player.name}
                        {isCaptain && <Text style={styles.captainLabel}> (C)</Text>}
                      </Text>
                      <Text style={styles.playerPrice}>{formatCurrency(player.price)}</Text>
                    </View>
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>✓ Selected</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Available Players */}
        <View style={styles.section}>
          <Text 
            style={styles.sectionTitle}
            accessible={true}
            accessibilityRole="header"
          >
            Available Players
          </Text>
          {qualifiedPlayers
            .filter(p => !selectedPlayers.includes(p.id))
            .map((player) => {
              const canSelect = canSelectPlayer(player.id);
              return (
                <TouchableOpacity
                  key={player.id}
                  style={[
                    styles.playerCard,
                    !canSelect && styles.disabledPlayerCard
                  ]}
                  onPress={() => handleSelectPlayer(player)}
                  disabled={!canSelect}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Select player ${player.name}. Price: ${formatCurrency(player.price)}`}
                  accessibilityHint={canSelect ? "Double tap to add this player to your team" : "Cannot select this player"}
                  accessibilityState={{ disabled: !canSelect }}
                >
                  <View style={styles.playerInfo}>
                    <Text style={[
                      styles.playerName,
                      !canSelect && styles.disabledText
                    ]}>
                      {player.name}
                    </Text>
                    <Text style={[
                      styles.playerPrice,
                      !canSelect && styles.disabledText
                    ]}>
                      {formatCurrency(player.price)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            selectedPlayers.length !== roundInfo?.playersAllowed && styles.saveButtonDisabled
          ]}
          onPress={handleSaveTeam}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Save team"
          accessibilityHint={
            selectedPlayers.length === roundInfo?.playersAllowed
              ? "Double tap to save your team selection"
              : `Cannot save. Please select ${roundInfo?.playersAllowed} players`
          }
        >
          <Text style={styles.saveButtonText}>Save Team</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  budgetExceeded: {
    color: '#d32f2f',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a237e',
    marginLeft: 15,
    marginBottom: 10,
  },
  playerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPlayerCard: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4caf50',
  },
  disabledPlayerCard: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  lockedPlayerCard: {
    backgroundColor: '#fafafa',
    opacity: 0.7,
    borderColor: '#bdbdbd',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  playerPrice: {
    fontSize: 14,
    color: '#757575',
  },
  disabledText: {
    color: '#9e9e9e',
  },
  selectedBadge: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  selectedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  captainHint: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 15,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  playerCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
    marginBottom: 10,
  },
  captainButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  captainButtonActive: {
    backgroundColor: '#ffd700',
    borderColor: '#ffa000',
  },
  captainButtonText: {
    fontSize: 20,
    opacity: 0.3,
  },
  captainButtonTextActive: {
    opacity: 1,
  },
  captainPlayerCard: {
    borderColor: '#ffa000',
    borderWidth: 2,
  },
  captainLabel: {
    color: '#ffa000',
    fontWeight: 'bold',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    margin: 16,
    marginBottom: 0,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2',
  },
  infoBannerIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#0d47a1',
    lineHeight: 20,
  },
  lockedBanner: {
    backgroundColor: '#ffebee',
    borderLeftColor: '#c62828',
  },
  penaltyBanner: {
    backgroundColor: '#fff3e0',
    borderLeftColor: '#f57c00',
  },
  penaltyText: {
    color: '#f57c00',
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  emptyStateHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#1a237e',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9e9e9e',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
