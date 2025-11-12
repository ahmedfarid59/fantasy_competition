import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import api from '../services/api';
import { Player, PointsConfig, Round, UserTeam } from '../types';
import { ErrorHandler } from '../utils/errorHandler';
import { useAuth } from './AuthContext';

interface GameContextType {
  players: Player[];
  rounds: Round[];
  pointsConfig: PointsConfig;
  currentRound: number;
  selectedPlayers: number[];
  captainId: number | null;
  totalPoints: number;
  transfersUsed: number;
  loading: boolean;
  error: string | null;
  hasMatches: boolean;
  selectPlayer: (playerId: number) => void;
  removePlayer: (playerId: number) => void;
  setCaptain: (playerId: number | null) => void;
  saveTeam: () => Promise<void>;
  loadTeam: () => Promise<void>;
  getCurrentRoundInfo: () => Round | undefined;
  getRemainingBudget: () => number;
  canSelectPlayer: (playerId: number) => boolean;
  resetSelection: () => void;
  refreshData: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [pointsConfig, setPointsConfig] = useState<PointsConfig>({
    correctAnswer: 5,
    wrongAnswer: 0,
    transferPenalty: 30,
    freeTransfersPerRound: 1
  });
  const [currentRound, setCurrentRound] = useState(1);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [captainId, setCaptainId] = useState<number | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [transfersUsed, setTransfersUsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMatches, setHasMatches] = useState(false);

  // Helper function to determine current round from round data
  const determinCurrentRoundFromData = (roundsData: Round[]) => {
    if (roundsData.length === 0) {
      console.log('⏸️ [GAME CONTEXT] No rounds provided, skipping current round determination');
      return 1;
    }
    
    console.log('🕐 [GAME CONTEXT] Determining current round...');
    const now = new Date();
    console.log('📅 [GAME CONTEXT] Current Date/Time:', now.toISOString());
    let current = 1;
    
    for (const round of roundsData) {
      const deadline = new Date(round.deadline);
      console.log(`📍 [GAME CONTEXT] Round ${round.round} deadline:`, deadline.toISOString());
      if (now < deadline) {
        current = round.round;
        break;
      }
    }
    
    console.log('✅ [GAME CONTEXT] Current Round Determined:', current);
    setCurrentRound(current);
    return current;
  };

  // Initialize context on mount
  useEffect(() => {
    console.log('🎮 [GAME CONTEXT] Game Context initialized (data loading skipped on startup)');
    // Don't load data automatically on startup - only when explicitly called
    // refreshData();
  }, []);

  const refreshData = async () => {
    const context = {
      screen: 'GameContext',
      function: 'refreshData',
      operation: 'Refresh all game data',
    };

    ErrorHandler.logOperation(context);
    setLoading(true);
    setError(null);
    
    try {
      // Fetch players
      console.log('📊 [GameContext] Fetching players...');
      const playersResponse = await api.getPlayers();
      
      console.log('📊 [GameContext] Players API response:', {
        success: playersResponse.success,
        hasData: !!playersResponse.data,
        dataType: typeof playersResponse.data,
        isArray: Array.isArray(playersResponse.data),
      });

      if (playersResponse.success && playersResponse.data) {
        const playersArray = playersResponse.data as unknown as Player[];
        
        // Validate players data
        if (!Array.isArray(playersArray)) {
          console.error('❌ [GameContext] Players data is not an array:', typeof playersArray);
          throw new Error('Invalid players data received from server');
        }
        
        console.log(`📊 [GameContext] Received ${playersArray.length} players from API`);
        
        // Validate each player has required fields
        const validPlayers = playersArray.filter((player) => {
          if (!player.id || !player.name || typeof player.price !== 'number') {
            console.warn('⚠️ [GameContext] Invalid player data:', player);
            return false;
          }
          return true;
        });
        
        if (validPlayers.length === 0) {
          console.warn('⚠️ [GameContext] No valid players in database - app will work with limited functionality');
          setPlayers([]);
        } else {
          console.log(`✅ [GameContext] ${validPlayers.length} valid players (${playersArray.length - validPlayers.length} invalid)`);
          setPlayers(validPlayers);
        }
      } else {
        console.error('❌ [GameContext] Players API failed:', playersResponse.error);
        throw new Error(playersResponse.error || 'Failed to load players');
      }

      // Fetch rounds
      console.log('📅 [GameContext] Fetching rounds...');
      const roundsResponse = await api.getRounds();
      
      console.log('📅 [GameContext] Rounds API response:', {
        success: roundsResponse.success,
        hasData: !!roundsResponse.data,
        dataType: typeof roundsResponse.data,
        isArray: Array.isArray(roundsResponse.data),
      });

      let validRounds: Round[] = [];

      if (roundsResponse.success && roundsResponse.data) {
        const roundsArray = roundsResponse.data as unknown as Round[];
        
        // Validate rounds data
        if (!Array.isArray(roundsArray)) {
          console.error('❌ [GameContext] Rounds data is not an array:', typeof roundsArray);
          throw new Error('Invalid rounds data received from server');
        }
        
        console.log(`📅 [GameContext] Received ${roundsArray.length} rounds from API`);
        
        // Allow empty rounds array - app can work without rounds
        if (roundsArray.length === 0) {
          console.warn('⚠️ [GameContext] No rounds in database - app will work with limited functionality');
          setRounds([]);
          setCurrentRound(1);
        } else {
          // Log each round for debugging
          roundsArray.forEach((round, index) => {
            console.log(`📅 [GameContext] Round ${index + 1}:`, {
              round: round.round,
              deadline: round.deadline,
              playersAllowed: round.playersAllowed,
              budget: round.budget,
              hasRound: !!round.round,
              hasDeadline: !!round.deadline,
              hasPlayersAllowed: !!round.playersAllowed,
            });
          });
          
          // Validate each round has required fields
          validRounds = roundsArray.filter((round) => {
            const isValid = !!(round.round && round.deadline && round.playersAllowed);
            if (!isValid) {
              console.warn('⚠️ [GameContext] Invalid round data:', {
                round,
                missingRound: !round.round,
                missingDeadline: !round.deadline,
                missingPlayersAllowed: !round.playersAllowed,
              });
            }
            return isValid;
          });
          
          if (validRounds.length === 0) {
            console.warn('⚠️ [GameContext] All rounds invalid, using empty rounds array');
            setRounds([]);
            setCurrentRound(1);
          } else {
            console.log(`✅ [GameContext] ${validRounds.length} valid rounds (${roundsArray.length - validRounds.length} invalid)`);
            setRounds(validRounds);
            
            // Determine current round using the fresh data (not state)
            determinCurrentRoundFromData(validRounds);
          }
        }
      } else {
        console.error('❌ [GameContext] Rounds API failed:', roundsResponse.error);
        throw new Error(roundsResponse.error || 'Failed to load rounds');
      }

      // Check if matches exist for current round
      if (validRounds && validRounds.length > 0) {
        const currentRoundNum = validRounds[0]?.round || 1;
        console.log('⚔️ [GameContext] Checking matches for round', currentRoundNum);
        const matchesResponse = await api.getMatches(currentRoundNum);
        
        if (matchesResponse.success && matchesResponse.data) {
          const matchesArray = Array.isArray(matchesResponse.data) ? matchesResponse.data : [];
          setHasMatches(matchesArray.length > 0);
          console.log(`⚔️ [GameContext] Found ${matchesArray.length} matches for round ${currentRoundNum}`);
        } else {
          setHasMatches(false);
          console.log('⚔️ [GameContext] No matches found for current round');
        }
      } else {
        setHasMatches(false);
      }

      // Fetch points config
      console.log('⚙️ [GameContext] Fetching points config...');
      const configResponse = await api.getPointsConfig();
      
      console.log('⚙️ [GameContext] Config API response:', {
        success: configResponse.success,
        hasData: !!configResponse.data,
      });

      if (configResponse.success && configResponse.data) {
        const config = configResponse.data as PointsConfig;
        
        // Validate config has required fields
        if (
          typeof config.correctAnswer !== 'number' ||
          typeof config.wrongAnswer !== 'number' ||
          typeof config.transferPenalty !== 'number' ||
          typeof config.freeTransfersPerRound !== 'number'
        ) {
          console.warn('⚠️ [GameContext] Invalid config data, using defaults:', config);
        } else {
          setPointsConfig(config);
          console.log('✅ [GameContext] Points config loaded:', config);
        }
      } else {
        console.warn('⚠️ [GameContext] Failed to load config, using defaults');
      }

      // After loading data, load team (will be called after state updates)
      console.log('👥 [GameContext] Loading team data...');
      await loadTeam();
      
      ErrorHandler.logSuccess(context, {
        playersCount: players.length,
        roundsCount: rounds.length,
        currentRound,
      });
      console.log('✅ [GameContext] All data loaded successfully');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load game data';
      console.error('❌ [GameContext] Error in refreshData:', {
        error: errorMsg,
        stack: err instanceof Error ? err.stack : undefined,
      });
      
      ErrorHandler.handleError(err, {
        context,
        showAlert: false,
      });
      
      setError(errorMsg);
      
      // Provide more specific error messages
      let alertTitle = 'Error';
      let alertMessage = errorMsg;
      
      if (errorMsg.includes('Cannot connect') || errorMsg.includes('Network') || errorMsg.includes('Failed to fetch')) {
        alertTitle = 'Connection Error';
        alertMessage = `${errorMsg}\n\nTroubleshooting:\n1. Check if backend is running\n2. Verify Server URL in Settings\n3. Check your internet connection`;
      } else if (errorMsg.includes('Failed to load')) {
        alertTitle = 'Loading Error';
        alertMessage = errorMsg;
      }
      
      Alert.alert(
        alertTitle,
        alertMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => refreshData() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const determineCurrentRound = () => {
    if (rounds.length === 0) {
      console.log('⏸️ [GAME CONTEXT] No rounds loaded yet, skipping current round determination');
      return;
    }
    
    determinCurrentRoundFromData(rounds);
  };

  const getCurrentRoundInfo = (): Round | undefined => {
    return rounds.find((r: Round) => r.round === currentRound);
  };

  const getRemainingBudget = (): number => {
    const roundInfo = getCurrentRoundInfo();
    if (!roundInfo || roundInfo.budget === null) {
      console.log('💰 [BUDGET] No budget limit (unlimited)');
      return Infinity;
    }
    
    const spent = selectedPlayers.reduce((sum: number, playerId: number) => {
      const player = players.find((p: Player) => p.id === playerId);
      return sum + (player?.price || 0);
    }, 0);
    
    const remaining = roundInfo.budget - spent;
    console.log(`💰 [BUDGET] Total: ${roundInfo.budget / 1000000}M | Spent: ${spent / 1000000}M | Remaining: ${remaining / 1000000}M`);
    return remaining;
  };

  const canSelectPlayer = (playerId: number): boolean => {
    const roundInfo = getCurrentRoundInfo();
    if (!roundInfo) return false;
    
    // Check if already selected
    if (selectedPlayers.includes(playerId)) return false;
    
    // Check team size
    if (selectedPlayers.length >= roundInfo.playersAllowed) return false;
    
    // Check budget
    const player = players.find((p: Player) => p.id === playerId);
    if (!player) return false;
    
    if (roundInfo.budget !== null) {
      const remainingBudget = getRemainingBudget();
      if (player.price > remainingBudget) return false;
    }
    
    return true;
  };

  const selectPlayer = (playerId: number) => {
    // Validate player ID
    if (!playerId || typeof playerId !== 'number' || playerId <= 0) {
      console.error(`❌ [PLAYER SELECT] Invalid player ID: ${playerId}`);
      Alert.alert('Error', 'Invalid player selection. Please try again.');
      return;
    }

    const player = players.find((p: Player) => p.id === playerId);
    
    if (!player) {
      console.error(`❌ [PLAYER SELECT] Player not found: ${playerId}`);
      Alert.alert(
        'Player Not Found',
        'This player does not exist. Please refresh the player list.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    console.log(`👤 [PLAYER SELECT] Attempting to select: ${player.name} (${player.price / 1000000}M)`);
    
    if (canSelectPlayer(playerId)) {
      const newSelection = [...selectedPlayers, playerId];
      console.log(`✅ [PLAYER SELECT] Player selected! Total players: ${newSelection.length}`);
      setSelectedPlayers(newSelection);
    } else {
      console.log(`❌ [PLAYER SELECT] Cannot select player - validation failed`);
    }
  };

  const removePlayer = (playerId: number) => {
    // Validate player ID
    if (!playerId || typeof playerId !== 'number' || playerId <= 0) {
      console.error(`❌ [PLAYER REMOVE] Invalid player ID: ${playerId}`);
      Alert.alert('Error', 'Invalid player removal. Please try again.');
      return;
    }

    const player = players.find((p: Player) => p.id === playerId);
    
    if (!player) {
      console.error(`❌ [PLAYER REMOVE] Player not found: ${playerId}`);
      Alert.alert(
        'Player Not Found',
        'This player does not exist. Please refresh the player list.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Verify player is actually selected
    if (!selectedPlayers.includes(playerId)) {
      console.warn(`⚠️ [PLAYER REMOVE] Player ${player.name} is not in the team`);
      return;
    }
    
    console.log(`🗑️ [PLAYER REMOVE] Removing: ${player?.name}`);
    
    const newSelection = selectedPlayers.filter((id: number) => id !== playerId);
    console.log(`✅ [PLAYER REMOVE] Player removed! Total players: ${newSelection.length}`);
    
    // If removed player was captain, clear captain
    if (captainId === playerId) {
      console.log(`⭐ [CAPTAIN] Captain removed, clearing captain selection`);
      setCaptainId(null);
    }
    
    // Check if transfer penalty applies
    const freeTransfersRemaining = pointsConfig.freeTransfersPerRound - transfersUsed;
    if (freeTransfersRemaining <= 0) {
      const newTransfers = transfersUsed + 1;
      console.log(`⚠️ [TRANSFER] No free transfers! Penalty applied: -${pointsConfig.transferPenalty} points`);
      console.log(`📊 [TRANSFER] Transfers used: ${newTransfers}`);
      setTransfersUsed(newTransfers);
      setTotalPoints(totalPoints - pointsConfig.transferPenalty);
    } else {
      const newTransfers = transfersUsed + 1;
      console.log(`✅ [TRANSFER] Free transfer used. Remaining: ${freeTransfersRemaining - 1}`);
      setTransfersUsed(newTransfers);
    }
    
    setSelectedPlayers(newSelection);
  };

  const setCaptain = (playerId: number | null) => {
    if (playerId === null) {
      console.log(`⭐ [CAPTAIN] Clearing captain selection`);
      setCaptainId(null);
      return;
    }

    // Validate player ID
    if (typeof playerId !== 'number' || playerId <= 0) {
      console.error(`❌ [CAPTAIN] Invalid player ID: ${playerId}`);
      Alert.alert('Error', 'Invalid captain selection. Please try again.');
      return;
    }

    // Verify player exists
    const player = players.find((p: Player) => p.id === playerId);
    if (!player) {
      console.error(`❌ [CAPTAIN] Player not found: ${playerId}`);
      Alert.alert(
        'Player Not Found',
        'This player does not exist. Please refresh the player list.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Verify player is in team
    if (!selectedPlayers.includes(playerId)) {
      console.warn(`⚠️ [CAPTAIN] Cannot set captain - ${player.name} is not in team`);
      Alert.alert(
        'Invalid Captain',
        'You can only set a captain from your selected players.',
        [{ text: 'OK' }]
      );
      return;
    }

    console.log(`⭐ [CAPTAIN] Setting captain: ${player.name}`);
    setCaptainId(playerId);
  };

  const resetSelection = () => {
    setSelectedPlayers([]);
    setCaptainId(null);
    setTransfersUsed(0);
  };

  const saveTeam = async () => {
    // Validate user exists
    if (!user || !user.id) {
      console.error('❌ [SAVE] No user logged in');
      Alert.alert(
        'Authentication Required',
        'You must be logged in to save your team. Please log in and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Validate round info
    const roundInfo = getCurrentRoundInfo();
    if (!roundInfo) {
      console.error('❌ [SAVE] No round info available');
      Alert.alert(
        'Invalid Round',
        'Unable to determine the current round. Please refresh and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if round is closed
    if (roundInfo.isClosed) {
      console.error('❌ [SAVE] Round is closed');
      Alert.alert(
        'Round Closed',
        `Round ${roundInfo.round} has been closed. Team submissions are no longer allowed.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Validate team size
    if (selectedPlayers.length !== roundInfo.playersAllowed) {
      console.error(`❌ [SAVE] Invalid team size: ${selectedPlayers.length}/${roundInfo.playersAllowed}`);
      Alert.alert(
        'Incomplete Team',
        `You must select exactly ${roundInfo.playersAllowed} players before saving.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Validate all players still exist
    const invalidPlayers = selectedPlayers.filter(
      (playerId) => !players.find((p) => p.id === playerId)
    );
    if (invalidPlayers.length > 0) {
      console.error(`❌ [SAVE] Invalid players in selection: ${invalidPlayers.join(', ')}`);
      Alert.alert(
        'Invalid Team',
        'Some players in your team no longer exist. Please refresh and select again.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Validate captain if set
    if (captainId !== null) {
      if (!selectedPlayers.includes(captainId)) {
        console.error(`❌ [SAVE] Captain ${captainId} not in selected players`);
        Alert.alert(
          'Invalid Captain',
          'Your captain must be one of your selected players. Please fix this before saving.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    // Validate budget
    if (roundInfo.budget !== null) {
      const totalCost = selectedPlayers.reduce((sum, playerId) => {
        const player = players.find((p) => p.id === playerId);
        return sum + (player?.price || 0);
      }, 0);

      if (totalCost > roundInfo.budget) {
        console.error(`❌ [SAVE] Budget exceeded: ${totalCost} > ${roundInfo.budget}`);
        Alert.alert(
          'Budget Exceeded',
          `Your team costs ${(totalCost / 1000000).toFixed(1)}M but the budget is ${(roundInfo.budget / 1000000).toFixed(1)}M. Please adjust your team.`,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    try {
      console.log('💾 [SAVE] Saving team for Round', currentRound);
      const teamData: UserTeam = {
        userId: user.id, // Use authenticated user ID
        round: currentRound,
        selectedPlayers,
        captainId,
        transfersUsed,
        totalPoints,
      };
      
      console.log('💾 [SAVE] Team Data:', JSON.stringify(teamData, null, 2));

      // Save to server first
      const response = await api.submitTeam({
        userId: user.id,
        round: currentRound,
        selectedPlayers,
        captainId: captainId || undefined,
      });

      if (!response.success) {
        console.error('❌ [SAVE] Server error:', response.error);
        Alert.alert(
          'Save Failed',
          response.error || 'Failed to save team to server. Please try again.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Save locally after server success
      await AsyncStorage.setItem(`team_${user.id}_round_${currentRound}`, JSON.stringify(teamData));
      console.log('✅ [SAVE] Team saved successfully!');
    } catch (error) {
      console.error('❌ [SAVE] Error saving team:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'Save Failed',
        `Failed to save team: ${errorMsg}`,
        [{ text: 'OK' }]
      );
    }
  };

  const loadTeam = async () => {
    if (!user || !user.id) {
      console.log('ℹ️ [LOAD] No user logged in, skipping team load');
      return;
    }

    try {
      console.log('📂 [LOAD] Loading team for Round', currentRound);
      
      // Load from server first
      const response = await api.getUserTeam(user.id, currentRound);
      
      if (response.success && response.data) {
        const teamData = response.data as UserTeam;
        console.log('📂 [LOAD] Team loaded from server:', JSON.stringify(teamData, null, 2));
        
        // Validate loaded data
        if (!Array.isArray(teamData.selectedPlayers)) {
          console.error('❌ [LOAD] Invalid team data: selectedPlayers is not an array');
          return;
        }

        // Validate all players still exist
        const validPlayers = teamData.selectedPlayers.filter(
          (playerId) => players.find((p) => p.id === playerId)
        );

        if (validPlayers.length !== teamData.selectedPlayers.length) {
          console.warn(`⚠️ [LOAD] Some players no longer exist. Loaded ${validPlayers.length}/${teamData.selectedPlayers.length}`);
        }

        setSelectedPlayers(validPlayers);
        
        // Validate captain
        if (teamData.captainId && validPlayers.includes(teamData.captainId)) {
          setCaptainId(teamData.captainId);
        } else {
          setCaptainId(null);
        }
        
        setTransfersUsed(teamData.transfersUsed || 0);
        setTotalPoints(teamData.totalPoints || 0);
        
        // Save locally as backup
        await AsyncStorage.setItem(
          `team_${user.id}_round_${currentRound}`,
          JSON.stringify(teamData)
        );
        
        console.log('✅ [LOAD] Team loaded successfully!');
      } else if (response.error && !response.error.includes('404')) {
        // Only log/show error if it's not a "team not found" error
        console.warn('⚠️ [LOAD] Error loading team from server:', response.error);
        
        // Try loading from local storage as fallback
        const savedTeam = await AsyncStorage.getItem(`team_${user.id}_round_${currentRound}`);
        if (savedTeam) {
          const teamData: UserTeam = JSON.parse(savedTeam);
          console.log('📂 [LOAD] Using locally saved team:', JSON.stringify(teamData, null, 2));
          setSelectedPlayers(teamData.selectedPlayers || []);
          setCaptainId(teamData.captainId || null);
          setTransfersUsed(teamData.transfersUsed || 0);
          setTotalPoints(teamData.totalPoints || 0);
        }
      } else {
        console.log('ℹ️ [LOAD] No saved team found for this round');
      }
    } catch (error) {
      console.error('❌ [LOAD] Error loading team:', error);
      // Try local storage as fallback
      try {
        const savedTeam = await AsyncStorage.getItem(`team_${user.id}_round_${currentRound}`);
        if (savedTeam) {
          const teamData: UserTeam = JSON.parse(savedTeam);
          console.log('📂 [LOAD] Using locally saved team as fallback');
          setSelectedPlayers(teamData.selectedPlayers || []);
          setCaptainId(teamData.captainId || null);
          setTransfersUsed(teamData.transfersUsed || 0);
          setTotalPoints(teamData.totalPoints || 0);
        }
      } catch (localError) {
        console.error('❌ [LOAD] Error loading from local storage:', localError);
      }
    }
  };

  return (
    <GameContext.Provider
      value={{
        players,
        rounds,
        pointsConfig,
        currentRound,
        selectedPlayers,
        captainId,
        totalPoints,
        transfersUsed,
        loading,
        error,
        hasMatches,
        selectPlayer,
        removePlayer,
        setCaptain,
        saveTeam,
        loadTeam,
        getCurrentRoundInfo,
        getRemainingBudget,
        canSelectPlayer,
        resetSelection,
        refreshData,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
