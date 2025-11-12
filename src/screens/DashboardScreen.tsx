import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ServerConfig } from '../utils/serverConfig';

const { width } = Dimensions.get('window');

interface PlayerInfo {
  id: number;
  name: string;
  points: number;
}

interface RoundPerformance {
  round: number;
  points: number;
  teamPoints: number;
  transfersUsed: number;
  players: PlayerInfo[];
  hasTeam: boolean;
}

interface UserStanding {
  userId: string;
  name: string;
  email: string;
  totalPoints: number;
  rank: number;
  rounds: RoundPerformance[];
}

interface RoundInfo {
  round: number;
  deadline: string;
  playersAllowed: number;
}

interface DetailedLeaderboardData {
  standings: UserStanding[];
  totalUsers: number;
  totalRounds: number;
  rounds: RoundInfo[];
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<DetailedLeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showRoundPicker, setShowRoundPicker] = useState(false);

  useEffect(() => {
    fetchDetailedLeaderboard();
  }, []);

  const fetchDetailedLeaderboard = async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const serverUrl = ServerConfig.getServerUrl();
      console.log('📊 [DASHBOARD] Fetching detailed leaderboard');

      const response = await fetch(`${serverUrl}/api/leaderboard/detailed`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
        console.log(`✅ [DASHBOARD] Loaded ${result.totalUsers} users across ${result.totalRounds} rounds`);
      } else {
        console.error('❌ [DASHBOARD] Failed to fetch leaderboard');
        Alert.alert(
          'Error',
          'Failed to load leaderboard data',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: () => fetchDetailedLeaderboard() }
          ]
        );
      }
    } catch (error) {
      console.error('❌ [DASHBOARD] Error:', error);
      Alert.alert(
        'Connection Error',
        'Could not connect to server. Please check your connection.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => fetchDetailedLeaderboard() }
        ]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDetailedLeaderboard(true);
  };

  const getRankColor = (rank: number): string => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#999';
  };

  const getRankEmoji = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}`;
  };

  const renderOverallStandings = () => {
    if (!data) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overall Standings</Text>
        {data.standings.map((standing) => {
          const isCurrentUser = standing.userId === user?.id;
          return (
            <TouchableOpacity
              key={standing.userId}
              style={[
                styles.standingCard,
                isCurrentUser && styles.currentUserCard,
                selectedUser === standing.userId && styles.selectedUserCard,
              ]}
              onPress={() => setSelectedUser(selectedUser === standing.userId ? null : standing.userId)}
            >
              <View style={styles.standingHeader}>
                <View style={styles.rankBadge}>
                  <Text style={[styles.rankText, { color: getRankColor(standing.rank) }]}>
                    {getRankEmoji(standing.rank)}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {standing.name} {isCurrentUser && '(You)'}
                  </Text>
                  <Text style={styles.userId}>@{standing.userId}</Text>
                </View>
                <View style={styles.pointsBadge}>
                  <Text style={styles.pointsValue}>{standing.totalPoints}</Text>
                  <Text style={styles.pointsLabel}>pts</Text>
                </View>
              </View>

              {selectedUser === standing.userId && (
                <View style={styles.userDetails}>
                  <Text style={styles.detailsTitle}>Round-by-Round Performance:</Text>
                  {standing.rounds.map((round) => (
                    <View key={round.round} style={styles.roundDetail}>
                      <View style={styles.roundHeader}>
                        <Text style={styles.roundNumber}>Round {round.round}</Text>
                        <Text style={styles.roundPoints}>
                          {round.hasTeam ? `${round.points} pts` : 'No Team'}
                        </Text>
                      </View>
                      {round.hasTeam && (
                        <View style={styles.roundInfo}>
                          <Text style={styles.roundInfoText}>
                            Transfers: {round.transfersUsed}
                          </Text>
                          <Text style={styles.roundInfoText}>
                            Players: {round.players.length}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderRoundStandings = () => {
    if (!data || !selectedRound) return null;

    // Calculate standings for selected round
    const roundStandings = data.standings
      .map((standing) => {
        const roundData = standing.rounds.find((r) => r.round === selectedRound);
        return {
          ...standing,
          roundPoints: roundData?.points || 0,
          hasTeam: roundData?.hasTeam || false,
          players: roundData?.players || [],
        };
      })
      .sort((a, b) => b.roundPoints - a.roundPoints);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Round {selectedRound} Standings</Text>
        {roundStandings.map((standing, index) => {
          const isCurrentUser = standing.userId === user?.id;
          const rank = index + 1;
          return (
            <View
              key={standing.userId}
              style={[styles.roundStandingCard, isCurrentUser && styles.currentUserCard]}
            >
              <View style={styles.standingHeader}>
                <View style={styles.rankBadge}>
                  <Text style={[styles.rankText, { color: getRankColor(rank) }]}>
                    {getRankEmoji(rank)}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {standing.name} {isCurrentUser && '(You)'}
                  </Text>
                </View>
                <View style={styles.pointsBadge}>
                  <Text style={styles.pointsValue}>
                    {standing.hasTeam ? standing.roundPoints : '-'}
                  </Text>
                  <Text style={styles.pointsLabel}>pts</Text>
                </View>
              </View>
              {standing.hasTeam && standing.players.length > 0 && (
                <View style={styles.playersSection}>
                  <Text style={styles.playersSectionTitle}>Team:</Text>
                  {standing.players.map((player) => (
                    <View key={player.id} style={styles.playerRow}>
                      <Text style={styles.playerName}>{player.name}</Text>
                      <Text style={styles.playerPoints}>{player.points} pts</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderRoundSelector = () => {
    if (!data) return null;

    const getSelectedRoundLabel = () => {
      if (selectedRound === null) return 'All Rounds';
      return `Round ${selectedRound}`;
    };

    return (
      <>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>View by Round</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowRoundPicker(true)}
          >
            <Text style={styles.dropdownText}>{getSelectedRoundLabel()}</Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>

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
              
              <TouchableOpacity
                style={[styles.roundOption, !selectedRound && styles.roundOptionSelected]}
                onPress={() => {
                  setSelectedRound(null);
                  setShowRoundPicker(false);
                }}
              >
                <Text style={[styles.roundOptionText, !selectedRound && styles.roundOptionTextSelected]}>
                  All Rounds
                </Text>
                {!selectedRound && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>

              {data.rounds.map((round) => (
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
      </>
    );
  };

  const renderStats = () => {
    if (!data) return null;

    const currentUserStanding = data.standings.find((s) => s.userId === user?.id);

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{data.totalUsers}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{data.totalRounds}</Text>
          <Text style={styles.statLabel}>Rounds</Text>
        </View>
        {currentUserStanding && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: getRankColor(currentUserStanding.rank) }]}>
                {getRankEmoji(currentUserStanding.rank)}
              </Text>
              <Text style={styles.statLabel}>Your Rank</Text>
            </View>
          </>
        )}
      </View>
    );
  };

  if (loading && !data) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {renderStats()}
      {renderRoundSelector()}
      {selectedRound ? renderRoundStandings() : renderOverallStandings()}
    </ScrollView>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  dropdown: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  standingCard: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  currentUserCard: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  selectedUserCard: {
    borderColor: '#007AFF',
  },
  roundStandingCard: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  standingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userId: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  pointsBadge: {
    alignItems: 'center',
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  pointsLabel: {
    fontSize: 10,
    color: '#666',
  },
  userDetails: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  roundDetail: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  roundPoints: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  roundInfo: {
    flexDirection: 'row',
    marginTop: 5,
    gap: 15,
  },
  roundInfoText: {
    fontSize: 12,
    color: '#666',
  },
  playersSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  playersSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  playerName: {
    fontSize: 12,
    color: '#333',
  },
  playerPoints: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
});
