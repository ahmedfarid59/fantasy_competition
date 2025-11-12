export interface Player {
  id: number;
  name: string;
  price: number;
  qualified: boolean;
  points?: number;
}

export interface Round {
  round: number;
  deadline: string;
  playersAllowed: number;
  budget: number | null;
  isClosed?: boolean;
  freeTransfers: number;
  transferPenalty: number;
}

export interface PointsConfig {
  correctAnswer: number;
  wrongAnswer: number;
  transferPenalty: number;
  freeTransfersPerRound: number;
}

export interface UserTeam {
  userId: string;
  round: number;
  selectedPlayers: number[];
  captainId?: number | null;
  transfersUsed: number;
  totalPoints: number;
}

export interface User {
  id: string;
  name: string;
  totalPoints: number;
  teams: UserTeam[];
}

export interface Match {
  id: number;
  round: number;
  player1: {
    id: number;
    name: string;
  };
  player2: {
    id: number;
    name: string;
  };
  matchOrder: number;
  createdAt: string;
}
