import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';
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

export default function MyTeamScreen() {
  const {
    players,
    selectedPlayers,
    removePlayer,
    getCurrentRoundInfo,
    transfersUsed,
    pointsConfig,
    totalPoints,
    refreshData,
    hasMatches,
  } = useGame();

  const roundInfo = getCurrentRoundInfo();
  const selectedPlayerObjects = players.filter(p => selectedPlayers.includes(p.id));

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 [MY TEAM] Screen focused, refreshing data...');
      refreshData();
    }, [refreshData])
  );

  useEffect(() => {
    console.log('⭐ [MY TEAM] Component Mounted');
    console.log('📋 [MY TEAM] Selected Players:', selectedPlayers);
    console.log('📊 [MY TEAM] Total Points:', totalPoints);
    console.log('🔄 [MY TEAM] Transfers Used:', transfersUsed);
    console.log('📊 [MY TEAM] Free Transfers Remaining:', pointsConfig.freeTransfersPerRound - transfersUsed);
    
    const totalCost = selectedPlayerObjects.reduce((sum, p) => sum + p.price, 0);
    console.log('💰 [MY TEAM] Total Team Cost:', totalCost / 1000000, 'M EGP');
    
    AccessibilityInfo.announceForAccessibility(
      `My Team Screen. ${selectedPlayers.length} players selected. Total points: ${totalPoints}`
    );
  }, []);

  const formatCurrency = (amount: number) => {
    return `${(amount / 1000000).toFixed(1)}M EGP`;
  };

  const handleRemovePlayer = (playerId: number, playerName: string) => {
    console.log(`🗑️ [MY TEAM] Remove button pressed for: ${playerName} (ID: ${playerId})`);
    
    // Validate player ID
    if (!playerId || typeof playerId !== 'number' || playerId <= 0) {
      console.error(`❌ [MY TEAM] Invalid player ID: ${playerId}`);
      Alert.alert('Error', 'Invalid player. Please refresh and try again.');
      return;
    }

    // Validate player exists
    const player = players.find(p => p.id === playerId);
    if (!player) {
      console.error(`❌ [MY TEAM] Player not found: ${playerId}`);
      Alert.alert(
        'Player Not Found',
        'This player no longer exists. Please refresh the player list.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Verify player is actually in the team
    if (!selectedPlayers.includes(playerId)) {
      console.warn(`⚠️ [MY TEAM] Player ${playerName} is not in the team`);
      Alert.alert(
        'Invalid Operation',
        'This player is not in your team.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    const freeTransfersRemaining = pointsConfig.freeTransfersPerRound - transfersUsed;
    console.log(`🔄 [MY TEAM] Free transfers remaining: ${freeTransfersRemaining}`);
    
    if (freeTransfersRemaining <= 0) {
      console.log(`⚠️ [MY TEAM] No free transfers - penalty will apply (-${pointsConfig.transferPenalty} points)`);
      Alert.alert(
        'Transfer Penalty',
        `You have exceeded your free transfer limit. This will deduct ${pointsConfig.transferPenalty} points from your total. Do you want to continue?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              console.log('❌ [MY TEAM] Transfer cancelled by user');
              AccessibilityInfo.announceForAccessibility('Transfer cancelled');
            }
          },
          {
            text: 'Continue',
            style: 'destructive',
            onPress: () => {
              console.log('✅ [MY TEAM] User confirmed transfer with penalty');
              removePlayer(playerId);
              AccessibilityInfo.announceForAccessibility(
                `${playerName} removed. ${pointsConfig.transferPenalty} points deducted`
              );
            }
          }
        ],
        { cancelable: true }
      );
    } else {
      console.log(`✅ [MY TEAM] Free transfer available - no penalty`);
      removePlayer(playerId);
      AccessibilityInfo.announceForAccessibility(
        `${playerName} removed. ${freeTransfersRemaining - 1} free transfers remaining`
      );
    }
  };

  const totalSpent = selectedPlayerObjects.reduce((sum, player) => sum + player.price, 0);

  // Show message if no round is available
  if (!roundInfo) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateIcon}>📅</Text>
          <Text style={styles.emptyStateTitle}>No Upcoming Round</Text>
          <Text style={styles.emptyStateMessage}>
            There are currently no rounds available.
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
            You'll be able to view your team once the admin creates matches for this round.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      accessible={true}
      accessibilityLabel="My team screen"
    >
      {/* Team Summary */}
      <View 
        style={styles.summaryCard}
        accessible={true}
        accessibilityLabel={`Team summary. ${selectedPlayers.length} players selected. Total cost: ${formatCurrency(totalSpent)}. Total points: ${totalPoints}`}
      >
        <Text 
          style={styles.summaryTitle}
          accessible={true}
          accessibilityRole="header"
        >
          Team Summary
        </Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Round:</Text>
          <Text style={styles.summaryValue}>{roundInfo?.round}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Players:</Text>
          <Text style={styles.summaryValue}>
            {selectedPlayers.length} / {roundInfo?.playersAllowed}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Cost:</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalSpent)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Points:</Text>
          <Text style={[styles.summaryValue, styles.pointsValue]}>{totalPoints}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Transfers Used:</Text>
          <Text style={styles.summaryValue}>
            {transfersUsed} ({pointsConfig.freeTransfersPerRound - transfersUsed} free remaining)
          </Text>
        </View>
      </View>

      {/* Transfer Info */}
      <View style={styles.infoCard}>
        <Text 
          style={styles.infoTitle}
          accessible={true}
          accessibilityRole="header"
        >
          ℹ️ Transfer Information
        </Text>
        <Text style={styles.infoText} accessible={true}>
          • {pointsConfig.freeTransfersPerRound} free transfer per round
        </Text>
        <Text style={styles.infoText} accessible={true}>
          • Additional transfers cost {pointsConfig.transferPenalty} points each
        </Text>
        <Text style={styles.infoText} accessible={true}>
          • You've used {transfersUsed} transfer{transfersUsed !== 1 ? 's' : ''} this round
        </Text>
      </View>

      {/* Selected Players */}
      {selectedPlayerObjects.length > 0 ? (
        <View style={styles.section}>
          <Text 
            style={styles.sectionTitle}
            accessible={true}
            accessibilityRole="header"
          >
            Your Players ({selectedPlayers.length})
          </Text>
          {selectedPlayerObjects.map((player) => (
            <View
              key={player.id}
              style={styles.playerCard}
              accessible={true}
              accessibilityLabel={`${player.name}. Price: ${formatCurrency(player.price)}. Points: ${player.points || 0}`}
            >
              <View style={styles.playerMainInfo}>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.playerPrice}>{formatCurrency(player.price)}</Text>
                <Text 
                  style={styles.playerPoints}
                  accessible={true}
                  accessibilityLabel={`${player.points || 0} points earned`}
                >
                  Points: {player.points || 0}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemovePlayer(player.id, player.name)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${player.name} from team`}
                accessibilityHint="Double tap to remove this player. May incur point penalty if no free transfers remaining."
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View 
          style={styles.emptyState}
          accessible={true}
          accessibilityLabel="No players selected. Go to Team Selection to add players"
        >
          <Text style={styles.emptyStateText}>No Players Selected</Text>
          <Text style={styles.emptyStateSubtext}>
            Go to Team Selection to pick your players
          </Text>
        </View>
      )}

      {/* Points Breakdown */}
      <View style={styles.pointsCard}>
        <Text 
          style={styles.pointsTitle}
          accessible={true}
          accessibilityRole="header"
        >
          📊 Points System
        </Text>
        <Text style={styles.pointsText} accessible={true}>
          • Correct Answer: +{pointsConfig.correctAnswer} points
        </Text>
        <Text style={styles.pointsText} accessible={true}>
          • Wrong Answer: {pointsConfig.wrongAnswer} points
        </Text>
        <Text style={styles.pointsText} accessible={true}>
          • Transfer Penalty: -{pointsConfig.transferPenalty} points
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  summaryCard: {
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
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#424242',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  pointsValue: {
    color: '#4caf50',
    fontSize: 18,
  },
  infoCard: {
    backgroundColor: '#e3f2fd',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
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
  },
  playerMainInfo: {
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
    marginBottom: 2,
  },
  playerPoints: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#9e9e9e',
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#bdbdbd',
    textAlign: 'center',
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
  pointsCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 30,
  },
  pointsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 10,
  },
  pointsText: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 5,
  },
});
