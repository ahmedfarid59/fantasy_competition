from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


# ============================================================================
# PYDANTIC MODELS (Request/Response)
# ============================================================================

class UserCreate(BaseModel):
    id: str
    name: str
    email: str


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    name: str
    email: str
    password: str


class AuthResponse(BaseModel):
    success: bool
    message: str
    user: Optional[dict] = None


class PlayerCreate(BaseModel):
    name: str
    price: int
    qualified: bool = True
    points: Optional[int] = 0


class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[int] = None
    qualified: Optional[bool] = None
    points: Optional[int] = None


class PlayerResponse(BaseModel):
    id: int
    name: str
    price: int
    qualified: bool
    points: Optional[int] = 0
    
    class Config:
        from_attributes = True


class RoundCreate(BaseModel):
    round: int
    deadline: str  # ISO format datetime string
    team_size: int
    budget: Optional[int] = None
    free_transfers: Optional[int] = 1
    transfer_penalty: Optional[int] = 30


class RoundUpdate(BaseModel):
    deadline: Optional[str] = None
    team_size: Optional[int] = None
    budget: Optional[int] = None
    free_transfers: Optional[int] = None
    transfer_penalty: Optional[int] = None


class RoundResponse(BaseModel):
    round: int
    deadline: str
    team_size: int
    budget: Optional[int]
    is_closed: bool = False
    free_transfers: int = 1
    transfer_penalty: int = 30
    
    class Config:
        from_attributes = True


class TeamCreate(BaseModel):
    userId: str
    round: int
    selectedPlayers: List[int]
    captainId: Optional[int] = None  # Player ID of the captain (gets 2x points)


class TransferCreate(BaseModel):
    userId: str
    round: int
    playerId: int
    action: str  # 'add' or 'remove'


class ScoreUpdate(BaseModel):
    round: int
    scores: List[dict]  # [{"playerId": 1, "points": 5}, ...]


class LeaderboardEntry(BaseModel):
    rank: int
    userId: str
    name: str
    points: int
    
    class Config:
        from_attributes = True


class MatchCreate(BaseModel):
    round: int
    player1Id: int
    player2Id: int
    matchOrder: Optional[int] = 1


class MatchUpdate(BaseModel):
    player1Id: Optional[int] = None
    player2Id: Optional[int] = None
    matchOrder: Optional[int] = None


class MatchResponse(BaseModel):
    id: int
    round: int
    player1: dict  # {id, name}
    player2: dict  # {id, name}
    matchOrder: int
    createdAt: str
    
    class Config:
        from_attributes = True


# SQLAlchemy Models (imported from database.py)
from database import User, Player, Round, Team, Transfer, PlayerScore, Config, Match
