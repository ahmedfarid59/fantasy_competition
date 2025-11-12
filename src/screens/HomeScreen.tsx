import React, { useEffect, useState } from 'react';
import {
    AccessibilityInfo,
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useGame } from '../context/GameContext';
import api from '../services/api';
import { Match } from '../types';

export default function HomeScreen() {
  const { currentRound, getCurrentRoundInfo, totalPoints, pointsConfig, rounds } = useGame();
  const roundInfo = getCurrentRoundInfo();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  useEffect(() => {
    console.log('🏠 [HOME SCREEN] Component Mounted');
    console.log('📊 [HOME SCREEN] Current Round:', currentRound);
    console.log('📊 [HOME SCREEN] Round Info:', roundInfo);
    console.log('📊 [HOME SCREEN] Total Points:', totalPoints);
    AccessibilityInfo.announceForAccessibility('Welcome to Fantasy Competition App');
  }, []);

  useEffect(() => {
    console.log('📈 [HOME SCREEN] Total Points Updated:', totalPoints);
  }, [totalPoints]);

  useEffect(() => {
    if (currentRound) {
      loadMatches();
    }
  }, [currentRound]);

  const loadMatches = async () => {
    setLoadingMatches(true);
    try {
      console.log(`⚔️ [HOME SCREEN] Loading matches for round ${currentRound}`);
      const response = await api.getMatches(currentRound);
      if (response.success && response.data) {
        setMatches(response.data);
        console.log(`✅ [HOME SCREEN] Loaded ${response.data.length} matches`);
      } else {
        console.log(`ℹ️ [HOME SCREEN] No matches found: ${response.error}`);
        setMatches([]);
      }
    } catch (error) {
      console.error('❌ [HOME SCREEN] Error loading matches:', error);
      setMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `${(amount / 1000000).toFixed(0)}M EGP`;
  };

  return (
    <ScrollView 
      style={styles.container}
      accessible={true}
      accessibilityLabel="Home screen"
    >
      <View style={styles.header}>
        <Text 
          style={styles.title}
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel="Fantasy Competition - General Knowledge Contest"
        >
          ⚡ Fantasy Competition
        </Text>
        <Text 
          style={styles.subtitle}
          accessible={true}
          accessibilityLabel="General Knowledge Contest"
        >
          General Knowledge Contest
        </Text>
      </View>

      <View 
        style={styles.card}
        accessible={true}
        accessibilityLabel={roundInfo ? `Current Round: Round ${currentRound}` : 'No active round'}
      >
        <Text style={styles.cardTitle}>Current Round</Text>
        {roundInfo ? (
          <>
            <Text style={styles.roundNumber}>Round {currentRound}</Text>
            <Text 
              style={styles.deadline}
              accessible={true}
              accessibilityLabel={`Deadline: ${formatDate(roundInfo.deadline)}`}
            >
              📅 Deadline: {formatDate(roundInfo.deadline)}
            </Text>
            <Text 
              style={styles.info}
              accessible={true}
              accessibilityLabel={`Select ${roundInfo.playersAllowed} players`}
            >
              👥 Players to Select: {roundInfo.playersAllowed}
            </Text>
            {roundInfo.budget ? (
              <Text 
                style={styles.info}
                accessible={true}
                accessibilityLabel={`Budget: ${formatCurrency(roundInfo.budget)}`}
              >
                💰 Budget: {formatCurrency(roundInfo.budget)}
              </Text>
            ) : (
              <Text 
                style={styles.info}
                accessible={true}
                accessibilityLabel="Budget: Unlimited"
              >
                💰 Budget: Unlimited
              </Text>
            )}
          </>
        ) : (
          <Text style={styles.noRoundText}>
            No active round at the moment. Check back soon!
          </Text>
        )}
      </View>

      <View 
        style={styles.card}
        accessible={true}
        accessibilityLabel={`Your Total Points: ${totalPoints}`}
      >
        <Text style={styles.cardTitle}>Your Score</Text>
        <Text style={styles.points}>{totalPoints} Points</Text>
      </View>

      <View style={styles.rulesCard}>
        <Text 
          style={styles.cardTitle}
          accessible={true}
          accessibilityRole="header"
        >
          📋 Game Rules
        </Text>
        <Text style={styles.ruleText} accessible={true}>
          • Select players within your budget for each round
        </Text>
        <Text style={styles.ruleText} accessible={true}>
          • {pointsConfig.freeTransfersPerRound} free transfer{pointsConfig.freeTransfersPerRound > 1 ? 's' : ''} per round
        </Text>
        <Text style={styles.ruleText} accessible={true}>
          • Extra transfers cost {pointsConfig.transferPenalty} points each
        </Text>
        <Text style={styles.ruleText} accessible={true}>
          • Earn {pointsConfig.correctAnswer} points for each correct answer
        </Text>
        {pointsConfig.wrongAnswer !== 0 && (
          <Text style={styles.ruleText} accessible={true}>
            • Lose {Math.abs(pointsConfig.wrongAnswer)} points for wrong answers
          </Text>
        )}
        <Text style={styles.ruleText} accessible={true}>
          • Choose a captain to double their points!
        </Text>
      </View>

      {/* Matches Section */}
      <View style={styles.card}>
        <Text 
          style={styles.cardTitle}
          accessible={true}
          accessibilityRole="header"
        >
          ⚔️ Round {currentRound} Matches
        </Text>
        {loadingMatches ? (
          <ActivityIndicator size="large" color="#1a237e" />
        ) : matches.length > 0 ? (
          matches
            .sort((a, b) => a.matchOrder - b.matchOrder)
            .map((match) => (
              <View key={match.id} style={styles.matchCard}>
                <Text style={styles.matchText}>
                  {match.player1.name} VS {match.player2.name}
                </Text>
              </View>
            ))
        ) : (
          <Text style={styles.noMatchesText}>No matches scheduled yet</Text>
        )}
      </View>

      {rounds.length > 0 && (
        <View style={styles.scheduleCard}>
          <Text 
            style={styles.cardTitle}
            accessible={true}
            accessibilityRole="header"
          >
            📅 Tournament Schedule
          </Text>
          {rounds
            .sort((a, b) => a.round - b.round)
            .map((round) => (
              <Text 
                key={round.round} 
                style={styles.scheduleText} 
                accessible={true}
              >
                Round {round.round}: {round.playersAllowed} player{round.playersAllowed > 1 ? 's' : ''}, {round.budget ? formatCurrency(round.budget) : 'unlimited'} budget
              </Text>
            ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1a237e',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#bbdefb',
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
    marginBottom: 10,
  },
  roundNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 10,
  },
  deadline: {
    fontSize: 16,
    color: '#424242',
    marginBottom: 8,
  },
  info: {
    fontSize: 16,
    color: '#424242',
    marginBottom: 5,
  },
  points: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  rulesCard: {
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
  ruleText: {
    fontSize: 15,
    color: '#424242',
    marginBottom: 8,
    lineHeight: 22,
  },
  scheduleCard: {
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 30,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scheduleText: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 8,
    lineHeight: 20,
  },
  matchCard: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#1a237e',
  },
  matchText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    textAlign: 'center',
  },
  noMatchesText: {
    fontSize: 15,
    color: '#757575',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  noRoundText: {
    fontSize: 16,
    color: '#757575',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
});
