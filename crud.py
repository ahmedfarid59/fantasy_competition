from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Optional
import json
import logging
import re

from database import User, Player, Round, Team, Transfer, PlayerScore, Config
from models import TeamCreate, TransferCreate, ScoreUpdate, PlayerCreate, PlayerUpdate

logger = logging.getLogger("fantasy_backend.crud")


# ============================================================================
# VALIDATION CONSTANTS
# ============================================================================

MIN_PLAYER_NAME_LENGTH = 2
MAX_PLAYER_NAME_LENGTH = 100
MIN_PLAYER_PRICE = 1000000
MAX_PLAYER_PRICE = 10000000
MIN_ROUND_NUMBER = 1
MAX_ROUND_NUMBER = 1000
MIN_TEAM_SIZE = 1
MAX_TEAM_SIZE = 50
MIN_BUDGET = 0
MAX_BUDGET = 1000000
MIN_POINTS = -10000
MAX_POINTS = 10000


# ============================================================================
# VALIDATION HELPERS
# ============================================================================

def validate_player_name(name: str) -> tuple[bool, str]:
    """Validate player name"""
    if not name or not name.strip():
        return False, "Player name cannot be empty"
    
    name_trimmed = name.strip()
    
    if len(name_trimmed) < MIN_PLAYER_NAME_LENGTH:
        return False, f"Player name must be at least {MIN_PLAYER_NAME_LENGTH} characters"
    
    if len(name_trimmed) > MAX_PLAYER_NAME_LENGTH:
        return False, f"Player name cannot exceed {MAX_PLAYER_NAME_LENGTH} characters"
    
    return True, name_trimmed


def validate_player_price(price: float) -> tuple[bool, str]:
    """Validate player price"""
    if price is None:
        return False, "Player price is required"
    
    if not isinstance(price, (int, float)):
        return False, "Player price must be a number"
    
    if price < MIN_PLAYER_PRICE:
        return False, f"Player price must be at least {MIN_PLAYER_PRICE:,}"
    
    if price > MAX_PLAYER_PRICE:
        return False, f"Player price cannot exceed {MAX_PLAYER_PRICE:,}"
    
    return True, ""


def validate_round_number(round_num: int) -> tuple[bool, str]:
    """Validate round number"""
    if round_num is None:
        return False, "Round number is required"
    
    if not isinstance(round_num, int):
        return False, "Round number must be an integer"
    
    if round_num < MIN_ROUND_NUMBER:
        return False, f"Round number must be at least {MIN_ROUND_NUMBER}"
    
    if round_num > MAX_ROUND_NUMBER:
        return False, f"Round number cannot exceed {MAX_ROUND_NUMBER}"
    
    return True, ""


def validate_team_size(size: int) -> tuple[bool, str]:
    """Validate team size"""
    if size is None:
        return False, "Team size is required"
    
    if not isinstance(size, int):
        return False, "Team size must be an integer"
    
    if size < MIN_TEAM_SIZE:
        return False, f"Team size must be at least {MIN_TEAM_SIZE}"
    
    if size > MAX_TEAM_SIZE:
        return False, f"Team size cannot exceed {MAX_TEAM_SIZE}"
    
    return True, ""


def validate_budget(budget: float) -> tuple[bool, str]:
    """Validate budget"""
    if budget is None:
        return True, ""  # Budget is optional
    
    if not isinstance(budget, (int, float)):
        return False, "Budget must be a number"
    
    if budget < 1000000:
        return False, "Budget must be at least 1,000,000"
    
    return True, ""


def validate_points(points: int) -> tuple[bool, str]:
    """Validate points value"""
    if points is None:
        return False, "Points value is required"
    
    if not isinstance(points, int):
        return False, "Points must be an integer"
    
    if points < MIN_POINTS:
        return False, f"Points cannot be less than {MIN_POINTS}"
    
    if points > MAX_POINTS:
        return False, f"Points cannot exceed {MAX_POINTS}"
    
    return True, ""


def validate_deadline(deadline_str: str) -> tuple[bool, str, Optional[datetime]]:
    """Validate and parse deadline string"""
    if not deadline_str or not deadline_str.strip():
        return False, "Deadline is required", None
    
    try:
        deadline_dt = datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
        return True, "", deadline_dt
    except (ValueError, AttributeError) as e:
        return False, f"Invalid deadline format. Use ISO format (e.g., 2024-01-01T12:00:00)", None


# ============================================================================
# CRUD OPERATIONS
# ============================================================================

# Player Management
def create_player(db: Session, player_data: PlayerCreate) -> dict:
    """Create a new player (admin only)"""
    
    try:
        # Validate player name
        is_valid, result = validate_player_name(player_data.name)
        if not is_valid:
            raise ValueError(result)
        player_name = result
        
        # Validate player price
        is_valid, error_msg = validate_player_price(player_data.price)
        if not is_valid:
            raise ValueError(error_msg)
        
        # Validate qualified field
        if not isinstance(player_data.qualified, bool):
            raise ValueError("Qualified field must be true or false")
        
        # Check if player with same name exists
        existing = db.query(Player).filter(Player.name == player_name).first()
        if existing:
            raise ValueError(f"Player '{player_name}' already exists. Please use a different name.")
        
        player = Player(
            name=player_name,
            price=player_data.price,
            qualified=player_data.qualified,
            points=player_data.points or 0
        )
        db.add(player)
        db.commit()
        db.refresh(player)
        
        return {
            "id": player.id,
            "name": player.name,
            "price": player.price,
            "qualified": player.qualified,
            "points": player.points
        }
    except ValueError as e:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise ValueError(f"Failed to create player. Please try again.")


def update_player(db: Session, player_id: int, player_data: PlayerUpdate) -> dict:
    """Update a player (admin only)"""
    
    try:
        # Validate player_id
        if not player_id or not isinstance(player_id, int) or player_id <= 0:
            raise ValueError("Invalid player ID")
        
        player = db.query(Player).filter(Player.id == player_id).first()
        if not player:
            raise ValueError(f"Player with ID {player_id} not found")
        
        # Validate and update name if provided
        if player_data.name is not None:
            is_valid, result = validate_player_name(player_data.name)
            if not is_valid:
                raise ValueError(result)
            
            # Check if name already taken by another player
            existing = db.query(Player).filter(
                Player.name == result,
                Player.id != player_id
            ).first()
            if existing:
                raise ValueError(f"Player name '{result}' is already taken by another player")
            
            player.name = result
        
        # Validate and update price if provided
        if player_data.price is not None:
            is_valid, error_msg = validate_player_price(player_data.price)
            if not is_valid:
                raise ValueError(error_msg)
            player.price = player_data.price
        
        # Validate and update qualified if provided
        if player_data.qualified is not None:
            if not isinstance(player_data.qualified, bool):
                raise ValueError("Qualified field must be true or false")
            player.qualified = player_data.qualified
        
        # Validate and update points if provided
        if player_data.points is not None:
            is_valid, error_msg = validate_points(player_data.points)
            if not is_valid:
                raise ValueError(error_msg)
            player.points = player_data.points
        
        db.commit()
        db.refresh(player)
        
        return {
            "id": player.id,
            "name": player.name,
            "price": player.price,
            "qualified": player.qualified,
            "points": player.points
        }
    except ValueError as e:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise ValueError(f"Failed to update player. Please try again.")


def delete_player(db: Session, player_id: int) -> dict:
    """Delete a player (admin only)"""
    
    try:
        # Validate player_id
        if not player_id or not isinstance(player_id, int) or player_id <= 0:
            raise ValueError("Invalid player ID")
        
        player = db.query(Player).filter(Player.id == player_id).first()
        if not player:
            raise ValueError(f"Player with ID {player_id} not found")
        
        # Check if player is used in any teams
        teams_using = db.query(Team).filter(
            Team.selected_players.contains([player_id])
        ).count()
        
        if teams_using > 0:
            raise ValueError(
                f"Cannot delete player '{player.name}' as they are selected in {teams_using} team(s). "
                f"Please remove the player from all teams first."
            )
        
        player_name = player.name
        db.delete(player)
        db.commit()
        
        return {"success": True, "message": f"Player '{player_name}' has been successfully deleted"}
    except ValueError as e:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise ValueError(f"Failed to delete player. Please try again.")


def get_players(db: Session) -> List[dict]:
    """Get all players"""
    players = db.query(Player).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "price": p.price,
            "qualified": p.qualified,
            "points": getattr(p, 'points', 0)  # Get points directly from player
        }
        for p in players
    ]


def get_qualified_players(db: Session, round_number: int) -> List[dict]:
    """Get qualified players for a specific round"""
    players = db.query(Player).filter(Player.qualified == True).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "price": p.price,
            "qualified": p.qualified,
            "points": getattr(p, 'points', 0)
        }
        for p in players
    ]


# Round Management
def create_round(db: Session, round_data) -> dict:
    """Create a new round (admin only)"""
    from models import RoundCreate
    logger.info(f"➕ [CRUD] Creating round: {round_data.round}")
    logger.info(f"📊 [CRUD] Round data: round={round_data.round}, deadline={round_data.deadline}, team_size={round_data.team_size}, budget={round_data.budget}")
    
    try:
        # Validate round number
        is_valid, error_msg = validate_round_number(round_data.round)
        if not is_valid:
            logger.warning(f"❌ [CRUD] Invalid round number: {error_msg}")
            raise ValueError(error_msg)
        
        # Validate team size
        is_valid, error_msg = validate_team_size(round_data.team_size)
        if not is_valid:
            logger.warning(f"❌ [CRUD] Invalid team size: {error_msg}")
            raise ValueError(error_msg)
        
        # Validate budget
        is_valid, error_msg = validate_budget(round_data.budget)
        if not is_valid:
            raise ValueError(error_msg)
        
        # Validate and parse deadline
        is_valid, error_msg, deadline_dt = validate_deadline(round_data.deadline)
        if not is_valid:
            raise ValueError(error_msg)
        
        # Check deadline is in the future
        now = datetime.now(timezone.utc)
        if deadline_dt <= now:
            raise ValueError("Deadline must be in the future")
        
        # Check if round already exists
        existing = db.query(Round).filter(Round.round == round_data.round).first()
        if existing:
            raise ValueError(f"Round {round_data.round} already exists. Please use a different round number.")
        
        round_obj = Round(
            round=round_data.round,
            deadline=deadline_dt,
            team_size=round_data.team_size,
            budget=round_data.budget,
            free_transfers=round_data.free_transfers or 1,
            transfer_penalty=round_data.transfer_penalty or 30
        )
        db.add(round_obj)
        db.commit()
        db.refresh(round_obj)
        
        return {
            "round": round_obj.round,
            "deadline": round_obj.deadline.isoformat(),
            "team_size": round_obj.team_size,
            "budget": round_obj.budget,
            "free_transfers": round_obj.free_transfers,
            "transfer_penalty": round_obj.transfer_penalty
        }
    except ValueError as e:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise ValueError(f"Failed to create round. Please try again.")


def update_round(db: Session, round_number: int, round_data) -> dict:
    """Update a round (admin only)"""
    from models import RoundUpdate
    
    try:
        # Validate round number
        is_valid, error_msg = validate_round_number(round_number)
        if not is_valid:
            raise ValueError(error_msg)
        
        round_obj = db.query(Round).filter(Round.round == round_number).first()
        if not round_obj:
            raise ValueError(f"Round {round_number} not found")
        
        # Validate and update deadline if provided
        if round_data.deadline is not None:
            is_valid, error_msg, deadline_dt = validate_deadline(round_data.deadline)
            if not is_valid:
                raise ValueError(error_msg)
            
            round_obj.deadline = deadline_dt
        else:
            # If not updating deadline, check if current deadline has passed
            current_deadline = round_obj.deadline if isinstance(round_obj.deadline, datetime) else datetime.fromisoformat(round_obj.deadline.replace('+03:00', ''))
            now = datetime.now(timezone.utc)
            
            if now > current_deadline:
                raise ValueError(f"Cannot edit round {round_number}. The deadline has already passed. To edit this round, please update the deadline to a future date.")
        
        # Validate and update team size if provided
        if round_data.team_size is not None:
            is_valid, error_msg = validate_team_size(round_data.team_size)
            if not is_valid:
                raise ValueError(error_msg)
            round_obj.team_size = round_data.team_size
        
        # Validate and update budget if provided
        if round_data.budget is not None:
            is_valid, error_msg = validate_budget(round_data.budget)
            if not is_valid:
                raise ValueError(error_msg)
            round_obj.budget = round_data.budget
        
        # Validate and update free_transfers if provided
        if round_data.free_transfers is not None:
            if not isinstance(round_data.free_transfers, int) or round_data.free_transfers < 0:
                raise ValueError("Free transfers must be a non-negative integer")
            round_obj.free_transfers = round_data.free_transfers
        
        # Validate and update transfer_penalty if provided
        if round_data.transfer_penalty is not None:
            if not isinstance(round_data.transfer_penalty, int) or round_data.transfer_penalty < 0:
                raise ValueError("Transfer penalty must be a non-negative integer")
            round_obj.transfer_penalty = round_data.transfer_penalty
        
        db.commit()
        db.refresh(round_obj)
        
        return {
            "round": round_obj.round,
            "deadline": round_obj.deadline.isoformat(),
            "team_size": round_obj.team_size,
            "budget": round_obj.budget,
            "free_transfers": round_obj.free_transfers,
            "transfer_penalty": round_obj.transfer_penalty
        }
    except ValueError as e:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [CRUD] Error updating round: {e}")
        raise ValueError(f"Failed to update round. Please try again.")


def delete_round(db: Session, round_number: int) -> dict:
    """Delete a round (admin only)"""
    logger.info(f"🗑️ [CRUD] Deleting round: {round_number}")
    
    try:
        # Validate round number
        is_valid, error_msg = validate_round_number(round_number)
        if not is_valid:
            logger.warning(f"❌ [CRUD] Invalid round number: {error_msg}")
            raise ValueError(error_msg)
        
        round_obj = db.query(Round).filter(Round.round == round_number).first()
        if not round_obj:
            raise ValueError(f"Round {round_number} not found")
        
        # Check if round has teams submitted
        teams_count = db.query(Team).filter(Team.round == round_number).count()
        if teams_count > 0:
            logger.warning(f"⚠️ [CRUD] Cannot delete round {round_number}: has {teams_count} teams")
            raise ValueError(
                f"Cannot delete round {round_number} as {teams_count} team(s) have been submitted. "
                f"Please delete all teams for this round first."
            )
        
        # Delete associated matches first
        from models import Match
        matches_count = db.query(Match).filter(Match.round_number == round_number).count()
        if matches_count > 0:
            logger.info(f"🗑️ [CRUD] Deleting {matches_count} match(es) associated with round {round_number}")
            db.query(Match).filter(Match.round_number == round_number).delete()
            logger.info(f"✅ [CRUD] Deleted {matches_count} match(es)")
        
        # Delete the round
        db.delete(round_obj)
        db.commit()
        
        logger.info(f"✅ [CRUD] Round {round_number} deleted (with {matches_count} matches)")
        return {
            "success": True, 
            "message": f"Round {round_number} and {matches_count} associated match(es) have been successfully deleted"
        }
    except ValueError as e:
        db.rollback()
        logger.error(f"❌ [CRUD] Validation error deleting round: {e}")
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [CRUD] Unexpected error deleting round: {e}")
        raise ValueError(f"Failed to delete round. Please try again.")


def close_round(db: Session, round_number: int) -> dict:
    """Manually close a round before its deadline (admin only)"""
    logger.info(f"🔒 [CRUD] Closing round: {round_number}")
    
    try:
        # Validate round number
        is_valid, error_msg = validate_round_number(round_number)
        if not is_valid:
            logger.warning(f"❌ [CRUD] Invalid round number: {error_msg}")
            raise ValueError(error_msg)
        
        round_obj = db.query(Round).filter(Round.round == round_number).first()
        if not round_obj:
            raise ValueError(f"Round {round_number} not found")
        
        # Check if already closed
        if getattr(round_obj, 'is_closed', False):
            logger.warning(f"⚠️ [CRUD] Round {round_number} is already closed")
            raise ValueError(f"Round {round_number} is already closed")
        
        # Check if deadline has already passed
        deadline = round_obj.deadline if isinstance(round_obj.deadline, datetime) else datetime.fromisoformat(round_obj.deadline.replace('+03:00', ''))
        now = datetime.now(timezone.utc)
        if now > deadline:
            logger.warning(f"⚠️ [CRUD] Round {round_number} deadline has already passed")
            raise ValueError(f"Round {round_number} deadline has already passed. No need to close manually.")
        
        # Close the round
        round_obj.is_closed = True
        db.commit()
        db.refresh(round_obj)
        
        logger.info(f"✅ [CRUD] Round {round_number} closed successfully")
        
        # Automatically calculate team points when closing round
        logger.info(f"🧮 [CRUD] Calculating team points for closed round {round_number}")
        try:
            calc_result = calculate_team_points_for_round(db, round_number)
            logger.info(f"✅ [CRUD] Points calculated: {calc_result.get('teams_updated', 0)} teams, {calc_result.get('users_updated', 0)} users")
        except Exception as e:
            logger.error(f"⚠️ [CRUD] Failed to calculate points during round closure: {e}")
            # Don't fail the closure if points calculation fails
        
        return {
            "round": round_obj.round,
            "deadline": round_obj.deadline.isoformat(),
            "team_size": round_obj.team_size,
            "budget": round_obj.budget,
            "is_closed": round_obj.is_closed,
            "teams_updated": calc_result.get('teams_updated', 0) if 'calc_result' in locals() else 0,
            "users_updated": calc_result.get('users_updated', 0) if 'calc_result' in locals() else 0,
            "message": f"Round {round_number} has been closed and points calculated. No more team submissions allowed."
        }
    except ValueError as e:
        db.rollback()
        logger.error(f"❌ [CRUD] Validation error closing round: {e}")
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [CRUD] Unexpected error closing round: {e}")
        raise ValueError(f"Failed to close round. Please try again.")


def get_rounds(db: Session) -> List[dict]:
    """Get all rounds"""
    rounds = db.query(Round).order_by(Round.round).all()
    return [
        {
            "round": r.round,
            "deadline": r.deadline.isoformat() if isinstance(r.deadline, datetime) else r.deadline,
            "playersAllowed": r.team_size,
            "budget": r.budget,
            "isClosed": getattr(r, 'is_closed', False),
            "freeTransfers": getattr(r, 'free_transfers', 1),
            "transferPenalty": getattr(r, 'transfer_penalty', 30)
        }
        for r in rounds
    ]


def get_current_round(db: Session) -> Optional[dict]:
    """Get current active round based on deadlines and closed status"""
    now = datetime.now(timezone.utc)
    rounds = db.query(Round).order_by(Round.round).all()
    
    for r in rounds:
        # Skip if round is manually closed by admin
        if getattr(r, 'is_closed', False):
            continue
            
        deadline = r.deadline if isinstance(r.deadline, datetime) else datetime.fromisoformat(r.deadline.replace('+03:00', ''))
        if now < deadline:
            return {
                "round": r.round,
                "deadline": r.deadline.isoformat() if isinstance(r.deadline, datetime) else r.deadline,
                "playersAllowed": r.team_size,
                "budget": r.budget,
                "isClosed": False
            }
    
    # Return last round if all deadlines passed (but not closed)
    if rounds:
        last = rounds[-1]
        return {
            "round": last.round,
            "deadline": last.deadline.isoformat() if isinstance(last.deadline, datetime) else last.deadline,
            "playersAllowed": last.team_size,
            "budget": last.budget,
            "isClosed": getattr(last, 'is_closed', False)
        }
    
    return None


def create_or_update_team(db: Session, team_data: TeamCreate) -> dict:
    """Create or update team selection"""
    logger.info(f"💾 [CRUD] Creating/updating team for user {team_data.userId}, round {team_data.round}")
    
    try:
        # Validate user ID
        if not team_data.userId or not str(team_data.userId).strip():
            raise ValueError("User ID is required")
        
        # Validate round number
        is_valid, error_msg = validate_round_number(team_data.round)
        if not is_valid:
            logger.warning(f"❌ [CRUD] Invalid round number: {error_msg}")
            raise ValueError(error_msg)
        
        # Validate selectedPlayers is a list
        if not isinstance(team_data.selectedPlayers, list):
            raise ValueError("Selected players must be a list")
        
        # Check for duplicate players
        if len(team_data.selectedPlayers) != len(set(team_data.selectedPlayers)):
            raise ValueError("Cannot select the same player multiple times")
        
        # Check if user exists, create if not
        user = db.query(User).filter(User.id == team_data.userId).first()
        if not user:
            logger.info(f"👤 [CRUD] Creating new user: {team_data.userId}")
            user = User(id=team_data.userId, name=team_data.userId, email=f"{team_data.userId}@fantasy.com")
            db.add(user)
            db.commit()
        
        # Validate round exists
        round_info = db.query(Round).filter(Round.round == team_data.round).first()
        if not round_info:
            raise ValueError(f"Round {team_data.round} does not exist. Please contact the administrator.")
        
        # Check if round is manually closed by admin
        if getattr(round_info, 'is_closed', False):
            raise ValueError(f"Round {team_data.round} has been closed by admin. Team submissions are no longer allowed.")
        
        # Check if round deadline has passed
        deadline = round_info.deadline if isinstance(round_info.deadline, datetime) else datetime.fromisoformat(round_info.deadline.replace('+03:00', ''))
        now = datetime.now(timezone.utc)
        if now > deadline:
            raise ValueError(f"Round {team_data.round} deadline has passed. Team submissions are closed.")
        
        # Validate team size
        if len(team_data.selectedPlayers) != round_info.team_size:
            raise ValueError(
                f"Invalid team size. You must select exactly {round_info.team_size} player(s), "
                f"but {len(team_data.selectedPlayers)} were selected."
            )
        
        # Validate captain if provided
        if team_data.captainId is not None:
            if not isinstance(team_data.captainId, int) or team_data.captainId <= 0:
                raise ValueError("Invalid captain ID")
            
            if team_data.captainId not in team_data.selectedPlayers:
                raise ValueError("Captain must be one of your selected players")
            
            logger.info(f"⭐ [CRUD] Captain selected: Player ID {team_data.captainId}")
        
        # Validate all players exist and calculate budget
        total_cost = 0
        qualified_count = 0
        
        for player_id in team_data.selectedPlayers:
            if not isinstance(player_id, int) or player_id <= 0:
                raise ValueError(f"Invalid player ID: {player_id}")
            
            player = db.query(Player).filter(Player.id == player_id).first()
            if not player:
                raise ValueError(f"Player with ID {player_id} not found")
            
            if not player.qualified:
                logger.warning(f"⚠️ [CRUD] Non-qualified player selected: {player.name}")
            else:
                qualified_count += 1
            
            total_cost += player.price
        
        # Validate budget if set
        if round_info.budget is not None:
            if total_cost > round_info.budget:
                raise ValueError(
                    f"Budget exceeded. Your team costs {total_cost}, "
                    f"but the budget limit is {round_info.budget}. "
                    f"Please remove expensive players or choose cheaper alternatives."
                )
        
        # Check if team already exists
        existing_team = db.query(Team).filter(
            Team.user_id == team_data.userId,
            Team.round == team_data.round
        ).first()
        
        # Special case: Round 1 - team can only be saved once
        if team_data.round == 1:
            if existing_team:
                logger.warning(f"🔒 [CRUD] Team already submitted for Round 1 - updates not allowed")
                raise ValueError("Your Round 1 team is locked after first submission. You cannot make changes once saved.")
            else:
                logger.info(f"➕ [CRUD] Creating Round 1 team")
                new_team = Team(
                    user_id=team_data.userId,
                    round=team_data.round,
                    selected_players=team_data.selectedPlayers,
                    captain_id=team_data.captainId,
                    transfers_used=0,
                    total_points=0
                )
                db.add(new_team)
        else:
            # Round 2+: Team updates allowed via transfer system
            if existing_team:
                # Calculate transfers used
                old_players = set(existing_team.selected_players)
                new_players = set(team_data.selectedPlayers)
                
                players_out = old_players - new_players
                players_in = new_players - old_players
                transfers_made = len(players_in)  # Number of players coming in
                
                if transfers_made == 0 and existing_team.captain_id == team_data.captainId:
                    logger.info(f"ℹ️ [CRUD] No changes to team")
                    raise ValueError("No changes detected. Your team is already saved with these players.")
                
                # Calculate transfer penalty
                free_transfers = round_info.free_transfers or 1
                transfer_penalty_points = round_info.transfer_penalty or 30
                
                # Transfers used so far in this round
                current_transfers = existing_team.transfers_used or 0
                total_transfers = current_transfers + transfers_made
                
                # Calculate penalty
                penalty_transfers = max(0, total_transfers - free_transfers)
                penalty_points = penalty_transfers * transfer_penalty_points
                
                logger.info(f"🔄 [CRUD] Updating team - Transfers: {transfers_made}, Total: {total_transfers}, Free: {free_transfers}, Penalty: {penalty_points}")
                logger.info(f"📤 [CRUD] Players out: {list(players_out)}")
                logger.info(f"📥 [CRUD] Players in: {list(players_in)}")
                
                # Update team
                existing_team.selected_players = team_data.selectedPlayers
                existing_team.captain_id = team_data.captainId
                existing_team.transfers_used = total_transfers
                existing_team.updated_at = datetime.now()
                
                # Apply penalty to total points (will be negative to deduct)
                if penalty_points > 0:
                    existing_team.total_points = (existing_team.total_points or 0) - penalty_points
                    logger.warning(f"⚠️ [CRUD] Transfer penalty applied: -{penalty_points} points")
            else:
                # First time for this round - create team (auto-carries from previous round)
                logger.info(f"➕ [CRUD] Creating team for Round {team_data.round}")
                new_team = Team(
                    user_id=team_data.userId,
                    round=team_data.round,
                    selected_players=team_data.selectedPlayers,
                    captain_id=team_data.captainId,
                    transfers_used=0,
                    total_points=0
                )
                db.add(new_team)
        
        db.commit()
        
        # Get updated team info
        final_team = db.query(Team).filter(
            Team.user_id == team_data.userId,
            Team.round == team_data.round
        ).first()
        
        transfers_made = 0
        penalty_applied = 0
        if team_data.round > 1 and existing_team:
            old_players = set(existing_team.selected_players)
            new_players = set(team_data.selectedPlayers)
            transfers_made = len(new_players - old_players)
            free_transfers = round_info.free_transfers or 1
            transfer_penalty_points = round_info.transfer_penalty or 30
            penalty_transfers = max(0, final_team.transfers_used - free_transfers)
            penalty_applied = penalty_transfers * transfer_penalty_points
        
        logger.info(f"✅ [CRUD] Team saved successfully (Cost: {total_cost}, Qualified: {qualified_count}, Transfers: {transfers_made}, Penalty: {penalty_applied})")
        
        return {
            "success": True,
            "message": "Team saved successfully" + (f" - {penalty_applied} points deducted for transfers" if penalty_applied > 0 else ""),
            "userId": team_data.userId,
            "round": team_data.round,
            "players": len(team_data.selectedPlayers),
            "totalCost": total_cost,
            "qualifiedPlayers": qualified_count,
            "transfersUsed": final_team.transfers_used if final_team else 0,
            "penaltyApplied": penalty_applied
        }
    except ValueError as e:
        db.rollback()
        logger.error(f"❌ [CRUD] Validation error saving team: {e}")
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [CRUD] Unexpected error saving team: {e}")
        raise ValueError(f"Failed to save team. Please try again.")


def get_user_team(db: Session, user_id: str, round_number: int) -> Optional[dict]:
    """Get user's team for a specific round. If team doesn't exist for this round, 
    returns the most recent previous round's team"""
    team = db.query(Team).filter(
        Team.user_id == user_id,
        Team.round == round_number
    ).first()
    
    if team:
        return {
            "userId": team.user_id,
            "round": team.round,
            "selectedPlayers": team.selected_players,
            "captainId": team.captain_id,
            "transfersUsed": team.transfers_used,
            "totalPoints": team.total_points
        }
    
    # If no team for this round, try to get the most recent previous round's team
    previous_team = db.query(Team).filter(
        Team.user_id == user_id,
        Team.round < round_number
    ).order_by(Team.round.desc()).first()
    
    if previous_team:
        # Return previous team data but with current round number
        # and reset transfers used for the new round
        return {
            "userId": previous_team.user_id,
            "round": round_number,  # Current round
            "selectedPlayers": previous_team.selected_players,
            "captainId": previous_team.captain_id,
            "transfersUsed": 0,  # Reset for new round
            "totalPoints": 0,  # Will be calculated
            "carriedOver": True  # Flag to indicate this is from previous round
        }
    
    return None


def apply_transfer(db: Session, transfer_data: TransferCreate) -> dict:
    """Apply a transfer (add or remove player)"""
    logger.info(f"🔄 [CRUD] Applying transfer for user {transfer_data.userId}")
    
    # Get user's team
    team = db.query(Team).filter(
        Team.user_id == transfer_data.userId,
        Team.round == transfer_data.round
    ).first()
    
    if not team:
        raise ValueError("Team not found")
    
    # Get points config
    config = get_points_config(db)
    free_transfers = config["freeTransfersPerRound"]
    penalty = config["transferPenalty"]
    
    # Check if penalty applies
    penalty_applied = team.transfers_used >= free_transfers
    points_deducted = penalty if penalty_applied else 0
    
    # Update team
    if transfer_data.action == "remove":
        if transfer_data.playerId in team.selected_players:
            team.selected_players.remove(transfer_data.playerId)
    elif transfer_data.action == "add":
        if transfer_data.playerId not in team.selected_players:
            team.selected_players.append(transfer_data.playerId)
    
    # Increment transfer count
    team.transfers_used += 1
    
    # Note: Transfer penalties are applied during team points calculation
    # (in calculate_team_points_for_round function) to avoid double-counting
    
    # Record transfer
    transfer_record = Transfer(
        user_id=transfer_data.userId,
        round=transfer_data.round,
        player_id=transfer_data.playerId,
        action=transfer_data.action,
        penalty_applied=penalty_applied,
        points_deducted=points_deducted
    )
    db.add(transfer_record)
    
    db.commit()
    
    logger.info(f"✅ [CRUD] Transfer applied. Will incur penalty: {penalty_applied} (applied during points calculation)")
    
    return {
        "success": True,
        "penaltyWillApply": penalty_applied,
        "penaltyAmount": points_deducted,
        "transfersUsed": team.transfers_used,
        "totalPoints": team.total_points,
        "message": "Transfer successful. Penalties will be applied when round scores are finalized."
    }


def get_leaderboard(db: Session, round_number: Optional[int] = None) -> List[dict]:
    """Get leaderboard rankings"""
    logger.info(f"🏆 [CRUD] Fetching leaderboard for round {round_number or 'all'}")
    
    # Query users with their total points
    users = db.query(User).order_by(User.total_points.desc()).all()
    
    leaderboard = []
    for rank, user in enumerate(users, 1):
        leaderboard.append({
            "rank": rank,
            "userId": user.id,
            "name": user.name,
            "points": user.total_points
        })
    
    return leaderboard


def update_player_scores(db: Session, score_data: ScoreUpdate) -> dict:
    """Update player scores for a round (admin only)"""
    logger.info(f"📊 [CRUD] Updating scores for round {score_data.round}")
    
    try:
        # Validate round number
        is_valid, error_msg = validate_round_number(score_data.round)
        if not is_valid:
            logger.warning(f"❌ [CRUD] Invalid round number: {error_msg}")
            raise ValueError(error_msg)
        
        # Validate round exists
        round_info = db.query(Round).filter(Round.round == score_data.round).first()
        if not round_info:
            raise ValueError(f"Round {score_data.round} does not exist")
        
        # Validate scores is a list
        if not isinstance(score_data.scores, list):
            raise ValueError("Scores must be a list")
        
        if len(score_data.scores) == 0:
            raise ValueError("At least one score must be provided")
        
        updated_count = 0
        
        for score in score_data.scores:
            # Validate score structure
            if not isinstance(score, dict):
                raise ValueError("Each score must be an object with playerId and points")
            
            if "playerId" not in score or "points" not in score:
                raise ValueError("Each score must have playerId and points fields")
            
            player_id = score["playerId"]
            points = score["points"]
            
            # Validate player ID
            if not isinstance(player_id, int) or player_id <= 0:
                raise ValueError(f"Invalid player ID: {player_id}")
            
            # Validate player exists
            player = db.query(Player).filter(Player.id == player_id).first()
            if not player:
                raise ValueError(f"Player with ID {player_id} not found")
            
            # Validate points
            is_valid, error_msg = validate_points(points)
            if not is_valid:
                logger.warning(f"❌ [CRUD] Invalid points for player {player_id}: {error_msg}")
                raise ValueError(f"Invalid points for player '{player.name}': {error_msg}")
            
            # Check if score already exists
            existing = db.query(PlayerScore).filter(
                PlayerScore.player_id == player_id,
                PlayerScore.round == score_data.round
            ).first()
            
            if existing:
                existing.points = points
                logger.debug(f"🔄 [CRUD] Updated score for player {player_id}: {points}")
            else:
                new_score = PlayerScore(
                    player_id=player_id,
                    round=score_data.round,
                    points=points
                )
                db.add(new_score)
                logger.debug(f"➕ [CRUD] Created score for player {player_id}: {points}")
            
            updated_count += 1
        
        db.commit()
        logger.info(f"✅ [CRUD] Updated {updated_count} player scores for round {score_data.round}")
        
        # Automatically calculate team points after updating player scores
        logger.info(f"🧮 [CRUD] Auto-calculating team points for round {score_data.round}")
        calc_result = calculate_team_points_for_round(db, score_data.round)
        
        return {
            "success": True,
            "round": score_data.round,
            "updated": updated_count,
            "teams_updated": calc_result.get("teams_updated", 0),
            "users_updated": calc_result.get("users_updated", 0)
        }
    except ValueError as e:
        db.rollback()
        logger.error(f"❌ [CRUD] Validation error updating scores: {e}")
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [CRUD] Unexpected error updating scores: {e}")
        raise ValueError(f"Failed to update player scores. Please try again.")


def calculate_team_points_for_round(db: Session, round_number: int) -> dict:
    """Calculate and update team points for all teams in a round, including captain bonus"""
    logger.info(f"🧮 [CRUD] Calculating team points for round {round_number}")
    
    try:
        # Validate round exists
        round_info = db.query(Round).filter(Round.round == round_number).first()
        if not round_info:
            raise ValueError(f"Round {round_number} does not exist")
        
        # Get all teams for this round
        teams = db.query(Team).filter(Team.round == round_number).all()
        
        if not teams:
            logger.info(f"ℹ️ [CRUD] No teams found for round {round_number}")
            return {"success": True, "round": round_number, "teams_updated": 0}
        
        teams_updated = 0
        
        for team in teams:
            total_points = 0
            selected_players = team.selected_players if isinstance(team.selected_players, list) else []
            captain_id = team.captain_id
            
            logger.debug(f"👥 [CRUD] Calculating points for team {team.id} (User: {team.user_id})")
            logger.debug(f"   Players: {selected_players}, Captain: {captain_id}")
            
            # Calculate points for each player in the team
            for player_id in selected_players:
                # Get player score for this round
                player_score = db.query(PlayerScore).filter(
                    PlayerScore.player_id == player_id,
                    PlayerScore.round == round_number
                ).first()
                
                if player_score:
                    points = player_score.points
                    
                    # Apply captain bonus (2x points)
                    if captain_id and player_id == captain_id:
                        points = points * 2
                        logger.debug(f"   ⭐ Player {player_id} (Captain): {player_score.points} x 2 = {points} points")
                    else:
                        logger.debug(f"   👤 Player {player_id}: {points} points")
                    
                    total_points += points
                else:
                    logger.debug(f"   ⚠️ Player {player_id}: No score recorded yet")
            
            # Calculate transfer penalties using round-specific settings
            transfer_penalty = 0
            if team.transfers_used > 0:
                # Get round-specific transfer settings
                free_transfers = getattr(round_info, 'free_transfers', 1)
                penalty_per_transfer = getattr(round_info, 'transfer_penalty', 30)
                
                # Calculate penalty for transfers beyond free limit
                penalty_transfers = max(0, team.transfers_used - free_transfers)
                transfer_penalty = penalty_transfers * penalty_per_transfer
                
                if transfer_penalty > 0:
                    logger.debug(f"   💸 Transfer penalty: {penalty_transfers} transfers x {penalty_per_transfer} = -{transfer_penalty} points")
            
            # Update team total points (player points - transfer penalties)
            team.total_points = total_points - transfer_penalty
            teams_updated += 1
            
            logger.info(f"✅ [CRUD] Team {team.id} (User: {team.user_id}): {total_points} - {transfer_penalty} = {team.total_points} points")
        
        # Update user total points (sum of all their teams across all rounds)
        users_updated = 0
        all_users = db.query(User).all()
        
        for user in all_users:
            user_teams = db.query(Team).filter(Team.user_id == user.id).all()
            user_total = sum(t.total_points for t in user_teams)
            user.total_points = user_total
            users_updated += 1
            logger.debug(f"👤 [CRUD] User {user.id} total: {user_total} points")
        
        db.commit()
        
        logger.info(f"✅ [CRUD] Updated {teams_updated} teams and {users_updated} users for round {round_number}")
        
        return {
            "success": True,
            "round": round_number,
            "teams_updated": teams_updated,
            "users_updated": users_updated
        }
        
    except ValueError as e:
        db.rollback()
        logger.error(f"❌ [CRUD] Validation error calculating team points: {e}")
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [CRUD] Unexpected error calculating team points: {e}")
        raise ValueError(f"Failed to calculate team points. Please try again.")


def get_points_config(db: Session) -> dict:
    """Get points configuration"""
    config = db.query(Config).filter(Config.key == "points").first()
    if config:
        return config.value
    
    # Return default if not found
    return {
        "correctAnswer": 5,
        "wrongAnswer": 0,
        "transferPenalty": 30,
        "freeTransfersPerRound": 1
    }


def update_points_config(db: Session, config_data: dict) -> dict:
    """Update points configuration (admin only)"""
    logger.info(f"⚙️ [CRUD] Updating points configuration")
    
    config = db.query(Config).filter(Config.key == "points").first()
    
    if config:
        # Update existing config
        config.value = config_data
        config.updated_at = datetime.now()
    else:
        # Create new config
        config = Config(
            key="points",
            value=config_data
        )
        db.add(config)
    
    db.commit()
    db.refresh(config)
    
    logger.info(f"✅ [CRUD] Points config updated: {config_data}")
    return config.value


def get_detailed_leaderboard(db: Session) -> dict:
    """Get detailed user standings across all rounds"""
    logger.info(f"📊 [CRUD] Fetching detailed leaderboard with round-by-round data")
    
    # Get all users
    users = db.query(User).all()
    
    # Get all rounds
    rounds = db.query(Round).order_by(Round.round).all()
    round_numbers = [r.round for r in rounds]
    
    # Build detailed standings
    standings = []
    
    for user in users:
        user_data = {
            "userId": user.id,
            "name": user.name,
            "email": user.email,
            "totalPoints": user.total_points,
            "rounds": []
        }
        
        # Get performance for each round
        for round_num in round_numbers:
            # Get team for this round
            team = db.query(Team).filter(
                Team.user_id == user.id,
                Team.round == round_num
            ).first()
            
            if team:
                # Get player names and scores
                players_info = []
                round_points = 0
                
                for player_id in team.selected_players:
                    player = db.query(Player).filter(Player.id == player_id).first()
                    if player:
                        # Get player's score for this round
                        player_score = db.query(PlayerScore).filter(
                            PlayerScore.player_id == player_id,
                            PlayerScore.round == round_num
                        ).first()
                        
                        score_points = player_score.points if player_score else 0
                        
                        # Double points for captain
                        is_captain = (team.captain_id == player_id)
                        if is_captain:
                            score_points *= 2
                            logger.debug(f"⭐ [CRUD] Captain bonus applied for player {player_id}")
                        
                        round_points += score_points
                        
                        players_info.append({
                            "id": player.id,
                            "name": player.name,
                            "points": score_points,
                            "isCaptain": is_captain
                        })
                
                # Apply transfer penalties
                round_points -= (team.transfers_used * 30)  # Simplified - should use config
                
                user_data["rounds"].append({
                    "round": round_num,
                    "points": round_points,
                    "teamPoints": team.total_points,
                    "transfersUsed": team.transfers_used,
                    "players": players_info,
                    "hasTeam": True
                })
            else:
                # User didn't submit team for this round
                user_data["rounds"].append({
                    "round": round_num,
                    "points": 0,
                    "teamPoints": 0,
                    "transfersUsed": 0,
                    "players": [],
                    "hasTeam": False
                })
        
        standings.append(user_data)
    
    # Sort by total points
    standings.sort(key=lambda x: x["totalPoints"], reverse=True)
    
    # Add ranks
    for rank, user_data in enumerate(standings, 1):
        user_data["rank"] = rank
    
    logger.info(f"✅ [CRUD] Built detailed leaderboard for {len(standings)} users across {len(round_numbers)} rounds")
    
    return {
        "standings": standings,
        "totalUsers": len(standings),
        "totalRounds": len(round_numbers),
        "rounds": [{"round": r.round, "deadline": r.deadline.isoformat() if isinstance(r.deadline, datetime) else r.deadline, "playersAllowed": r.team_size} for r in rounds]
    }


# ============================================================================
# MATCH MANAGEMENT (ADMIN)
# ============================================================================

def create_match(db: Session, match_data) -> dict:
    """Create a new match between two players for a round (admin only)"""
    from models import Match
    logger.info(f"⚔️ [CRUD] Creating match for round {match_data.round}: Player {match_data.player1Id} vs Player {match_data.player2Id}")
    
    try:
        # Validate round number
        is_valid, error_msg = validate_round_number(match_data.round)
        if not is_valid:
            logger.warning(f"❌ [CRUD] Invalid round number: {error_msg}")
            raise ValueError(error_msg)
        
        # Validate round exists
        round_info = db.query(Round).filter(Round.round == match_data.round).first()
        if not round_info:
            raise ValueError(f"Round {match_data.round} does not exist")
        
        # Validate player IDs
        if not isinstance(match_data.player1Id, int) or match_data.player1Id <= 0:
            raise ValueError("Invalid player 1 ID")
        
        if not isinstance(match_data.player2Id, int) or match_data.player2Id <= 0:
            raise ValueError("Invalid player 2 ID")
        
        if match_data.player1Id == match_data.player2Id:
            raise ValueError("Cannot create match with the same player. Please select two different players.")
        
        # Validate players exist
        player1 = db.query(Player).filter(Player.id == match_data.player1Id).first()
        player2 = db.query(Player).filter(Player.id == match_data.player2Id).first()
        
        if not player1:
            raise ValueError(f"Player 1 with ID {match_data.player1Id} not found")
        if not player2:
            raise ValueError(f"Player 2 with ID {match_data.player2Id} not found")
        
        # Validate match order
        match_order = match_data.matchOrder or 1
        if not isinstance(match_order, int) or match_order <= 0:
            raise ValueError("Match order must be a positive integer")
        
        # Check if match already exists for these players in this round
        existing = db.query(Match).filter(
            Match.round_number == match_data.round,
            ((Match.player1_id == match_data.player1Id) & (Match.player2_id == match_data.player2Id)) |
            ((Match.player1_id == match_data.player2Id) & (Match.player2_id == match_data.player1Id))
        ).first()
        
        if existing:
            raise ValueError(
                f"A match between '{player1.name}' and '{player2.name}' already exists for round {match_data.round}"
            )
        
        # Create match
        new_match = Match(
            round_number=match_data.round,
            player1_id=match_data.player1Id,
            player2_id=match_data.player2Id,
            match_order=match_order
        )
        
        db.add(new_match)
        db.commit()
        db.refresh(new_match)
        
        logger.info(f"✅ [CRUD] Match created with ID {new_match.id}")
        
        return {
            "success": True,
            "match": {
                "id": new_match.id,
                "round": new_match.round_number,
                "player1": {"id": player1.id, "name": player1.name},
                "player2": {"id": player2.id, "name": player2.name},
                "matchOrder": new_match.match_order,
                "createdAt": new_match.created_at.isoformat()
            }
        }
    except ValueError as e:
        db.rollback()
        logger.error(f"❌ [CRUD] Validation error creating match: {e}")
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [CRUD] Unexpected error creating match: {e}")
        raise ValueError(f"Failed to create match. Please try again.")


def get_matches(db: Session, round_number: int) -> List[dict]:
    """Get all matches for a specific round"""
    from models import Match
    logger.info(f"⚔️ [CRUD] Fetching matches for round {round_number}")
    
    matches = db.query(Match).filter(
        Match.round_number == round_number
    ).order_by(Match.match_order).all()
    
    result = []
    for match in matches:
        player1 = db.query(Player).filter(Player.id == match.player1_id).first()
        player2 = db.query(Player).filter(Player.id == match.player2_id).first()
        
        result.append({
            "id": match.id,
            "round": match.round_number,
            "player1": {"id": player1.id, "name": player1.name} if player1 else None,
            "player2": {"id": player2.id, "name": player2.name} if player2 else None,
            "matchOrder": match.match_order,
            "createdAt": match.created_at.isoformat()
        })
    
    logger.info(f"✅ [CRUD] Found {len(result)} matches for round {round_number}")
    return result


def update_match(db: Session, match_id: int, match_data) -> dict:
    """Update an existing match (admin only)"""
    from models import Match
    logger.info(f"⚔️ [CRUD] Updating match {match_id}")
    
    try:
        # Validate match ID
        if not match_id or not isinstance(match_id, int) or match_id <= 0:
            raise ValueError("Invalid match ID")
        
        match = db.query(Match).filter(Match.id == match_id).first()
        if not match:
            raise ValueError(f"Match with ID {match_id} not found")
        
        # Update fields if provided
        if match_data.player1Id is not None:
            if not isinstance(match_data.player1Id, int) or match_data.player1Id <= 0:
                raise ValueError("Invalid player 1 ID")
            
            player1 = db.query(Player).filter(Player.id == match_data.player1Id).first()
            if not player1:
                raise ValueError(f"Player 1 with ID {match_data.player1Id} not found")
            match.player1_id = match_data.player1Id
        
        if match_data.player2Id is not None:
            if not isinstance(match_data.player2Id, int) or match_data.player2Id <= 0:
                raise ValueError("Invalid player 2 ID")
            
            player2 = db.query(Player).filter(Player.id == match_data.player2Id).first()
            if not player2:
                raise ValueError(f"Player 2 with ID {match_data.player2Id} not found")
            match.player2_id = match_data.player2Id
        
        if match_data.matchOrder is not None:
            if not isinstance(match_data.matchOrder, int) or match_data.matchOrder <= 0:
                raise ValueError("Match order must be a positive integer")
            match.match_order = match_data.matchOrder
        
        # Validate not same player
        if match.player1_id == match.player2_id:
            raise ValueError("Cannot have match with the same player. Please select two different players.")
        
        # Check for duplicate match
        existing = db.query(Match).filter(
            Match.id != match_id,
            Match.round_number == match.round_number,
            ((Match.player1_id == match.player1_id) & (Match.player2_id == match.player2_id)) |
            ((Match.player1_id == match.player2_id) & (Match.player2_id == match.player1_id))
        ).first()
        
        if existing:
            player1 = db.query(Player).filter(Player.id == match.player1_id).first()
            player2 = db.query(Player).filter(Player.id == match.player2_id).first()
            raise ValueError(
                f"A match between '{player1.name}' and '{player2.name}' already exists for this round"
            )
        
        db.commit()
        db.refresh(match)
        
        # Get player details
        player1 = db.query(Player).filter(Player.id == match.player1_id).first()
        player2 = db.query(Player).filter(Player.id == match.player2_id).first()
        
        logger.info(f"✅ [CRUD] Match {match_id} updated")
        
        return {
            "success": True,
            "match": {
                "id": match.id,
                "round": match.round_number,
                "player1": {"id": player1.id, "name": player1.name},
                "player2": {"id": player2.id, "name": player2.name},
                "matchOrder": match.match_order,
                "createdAt": match.created_at.isoformat()
            }
        }
    except ValueError as e:
        db.rollback()
        logger.error(f"❌ [CRUD] Validation error updating match: {e}")
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [CRUD] Unexpected error updating match: {e}")
        raise ValueError(f"Failed to update match. Please try again.")


def delete_match(db: Session, match_id: int) -> dict:
    """Delete a match (admin only)"""
    from models import Match
    logger.info(f"⚔️ [CRUD] Deleting match {match_id}")
    
    try:
        # Validate match ID
        if not match_id or not isinstance(match_id, int) or match_id <= 0:
            raise ValueError("Invalid match ID")
        
        match = db.query(Match).filter(Match.id == match_id).first()
        if not match:
            raise ValueError(f"Match with ID {match_id} not found")
        
        # Get player names for confirmation message
        player1 = db.query(Player).filter(Player.id == match.player1_id).first()
        player2 = db.query(Player).filter(Player.id == match.player2_id).first()
        
        match_description = f"Round {match.round_number}"
        if player1 and player2:
            match_description += f": {player1.name} vs {player2.name}"
        
        db.delete(match)
        db.commit()
        
        logger.info(f"✅ [CRUD] Match {match_id} deleted")
        
        return {
            "success": True,
            "message": f"Match ({match_description}) has been successfully deleted"
        }
    except ValueError as e:
        db.rollback()
        logger.error(f"❌ [CRUD] Validation error deleting match: {e}")
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [CRUD] Unexpected error deleting match: {e}")
        raise ValueError(f"Failed to delete match. Please try again.")


# ============================================================================
# USER ACCOUNT MANAGEMENT
# ============================================================================

def delete_user_account(db: Session, user_id: str) -> dict:
    """Delete a user account and all associated data"""
    logger.info(f"👤 [CRUD] Deleting user account: {user_id}")
    
    try:
        # Validate user ID
        if not user_id or not isinstance(user_id, str):
            raise ValueError("Invalid user ID")
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User with ID {user_id} not found")
        
        user_name = user.name
        user_email = user.email
        
        logger.info(f"👤 [CRUD] Deleting user: {user_name} ({user_email})")
        
        # Delete associated data
        # 1. Delete user's transfers
        transfers_deleted = db.query(Transfer).filter(Transfer.user_id == user_id).delete()
        logger.info(f"🔄 [CRUD] Deleted {transfers_deleted} transfers")
        
        # 2. Delete user's teams
        teams_deleted = db.query(Team).filter(Team.user_id == user_id).delete()
        logger.info(f"⚽ [CRUD] Deleted {teams_deleted} teams")
        
        # 3. Note: Don't delete UserRound entries yet as they're used for leaderboard history
        # They will be cleaned up when rounds are deleted
        
        # 4. Delete the user
        db.delete(user)
        db.commit()
        
        logger.info(f"✅ [CRUD] User account deleted: {user_name}")
        
        return {
            "success": True,
            "message": f"Account for {user_name} has been successfully deleted",
            "user_name": user_name,
            "user_email": user_email,
            "transfers_deleted": transfers_deleted,
            "teams_deleted": teams_deleted
        }
    except ValueError as e:
        db.rollback()
        logger.error(f"❌ [CRUD] Validation error deleting user account: {e}")
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [CRUD] Unexpected error deleting user account: {e}")
        raise ValueError(f"Failed to delete account. Please try again.")
