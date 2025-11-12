from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import json
import os
import logging

logger = logging.getLogger("fantasy_backend.database")

# SQLite database
DATABASE_URL = "sqlite:///./fantasy_competition.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ============================================================================
# DATABASE MODELS
# ============================================================================

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=False)  # Hashed password
    is_admin = Column(Boolean, default=False)  # Admin flag
    total_points = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)
    last_activity = Column(DateTime, default=datetime.now)  # Track last activity
    is_online = Column(Boolean, default=False)  # Online status
    
    teams = relationship("Team", back_populates="user")
    transfers = relationship("Transfer", back_populates="user")


class Player(Base):
    __tablename__ = "players"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    price = Column(Integer, nullable=False)  # Price in EGP (stored as integer)
    qualified = Column(Boolean, default=True)
    points = Column(Integer, default=0)  # Current points - admin can edit directly
    created_at = Column(DateTime, default=datetime.now)
    
    scores = relationship("PlayerScore", back_populates="player")


class Round(Base):
    __tablename__ = "rounds"
    
    round = Column(Integer, primary_key=True, index=True)
    deadline = Column(DateTime, nullable=False)  # DateTime object
    team_size = Column(Integer, nullable=False)  # players_allowed renamed to team_size
    budget = Column(Integer, nullable=True)  # Null for unlimited
    is_closed = Column(Boolean, default=False)  # Admin can manually close round before deadline
    free_transfers = Column(Integer, default=1)  # Number of free transfers per round
    transfer_penalty = Column(Integer, default=30)  # Points deducted per transfer beyond free limit
    created_at = Column(DateTime, default=datetime.now)
    
    teams = relationship("Team", back_populates="round_info")


class Team(Base):
    __tablename__ = "teams"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    round = Column(Integer, ForeignKey("rounds.round"))
    selected_players = Column(JSON)  # List of player IDs
    captain_id = Column(Integer, nullable=True)  # Player ID of captain (gets 2x points)
    transfers_used = Column(Integer, default=0)
    total_points = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    user = relationship("User", back_populates="teams")
    round_info = relationship("Round", back_populates="teams")


class Transfer(Base):
    __tablename__ = "transfers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    round = Column(Integer)
    player_id = Column(Integer)
    action = Column(String)  # 'add' or 'remove'
    penalty_applied = Column(Boolean, default=False)
    points_deducted = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.now)
    
    user = relationship("User", back_populates="transfers")


class PlayerScore(Base):
    __tablename__ = "player_scores"
    
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"))
    round = Column(Integer)
    points = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)
    
    player = relationship("Player", back_populates="scores")


class Match(Base):
    __tablename__ = "matches"
    
    id = Column(Integer, primary_key=True, index=True)
    round_number = Column(Integer, ForeignKey("rounds.round"), nullable=False)
    player1_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    player2_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    match_order = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    
    player1 = relationship("Player", foreign_keys=[player1_id])
    player2 = relationship("Player", foreign_keys=[player2_id])


class Config(Base):
    __tablename__ = "config"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(JSON, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


# ============================================================================
# DATABASE FUNCTIONS
# ============================================================================

def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database with tables and seed data"""
    logger.info("🗄️ [DATABASE] Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Players are NOT seeded - admin must add them through the app
        logger.info("ℹ️  [DATABASE] Players table ready - admin can add players")
        
        # Rounds are NOT seeded - admin must create them through the app
        logger.info("ℹ️  [DATABASE] Rounds table ready - admin can create rounds")
        
        # Seed points config if not exists
        if db.query(Config).filter(Config.key == "points").count() == 0:
            logger.info("⚙️ [DATABASE] Seeding points configuration...")
            config = Config(
                key="points",
                value={
                    "correctAnswer": 5,
                    "wrongAnswer": 0,
                    "transferPenalty": 30,
                    "freeTransfersPerRound": 1
                }
            )
            db.add(config)
            db.commit()
            logger.info("✅ [DATABASE] Points configuration seeded")
        
        # NOTE: No default user created - users must register through the app
        logger.info("ℹ️  [DATABASE] No default users - authentication required")
        logger.info("✅ [DATABASE] Initialization complete")
        
    except Exception as e:
        logger.error(f"❌ [DATABASE] Error during initialization: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    from logger_config import get_logger
    logger = get_logger("fantasy_backend.database")
    logger.info("Initializing database...")
    init_db()
    logger.info("Database ready!")
