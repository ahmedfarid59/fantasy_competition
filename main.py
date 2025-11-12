from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Header, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional
import uvicorn
from datetime import datetime
import traceback

from logger_config import get_logger
from database import get_db, init_db
import database
from models import (
    User, Player, Round, Team, Transfer, PlayerScore, Match,
    UserCreate, TeamCreate, TransferCreate, ScoreUpdate,
    LoginRequest, RegisterRequest, AuthResponse,
    PlayerCreate, PlayerUpdate, RoundCreate, RoundUpdate,
    MatchCreate, MatchUpdate, MatchResponse
)
from crud import (
    get_players, get_qualified_players, get_rounds, get_current_round,
    create_or_update_team, get_user_team, apply_transfer,
    get_leaderboard, update_player_scores, get_points_config,
    delete_user_account
)
import crud
import auth
from auth import authenticate_user, create_user, verify_admin

# Initialize logger
logger = get_logger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Fantasy Competition API",
    description="Backend API for Fantasy Competition Mobile App",
    version="1.0.0"
)

# CORS middleware - allow mobile app to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# GLOBAL ERROR HANDLERS
# ============================================================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors"""
    errors = exc.errors()
    logger.error(f"❌ [VALIDATION] Request validation failed: {errors}")
    
    # Format error messages for frontend
    error_messages = []
    for error in errors:
        field = " -> ".join(str(x) for x in error["loc"])
        message = error["msg"]
        error_messages.append(f"{field}: {message}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "detail": "Invalid request data",
            "errors": error_messages
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with consistent format"""
    logger.error(f"❌ [HTTP] {exc.status_code}: {exc.detail}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "detail": exc.detail
        }
    )

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors"""
    logger.error(f"❌ [DATABASE] SQLAlchemy error: {str(exc)}")
    logger.error(f"❌ [DATABASE] Traceback: {traceback.format_exc()}")
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "detail": "Database error occurred. Please try again later."
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all other uncaught exceptions"""
    logger.error(f"❌ [ERROR] Unhandled exception: {str(exc)}")
    logger.error(f"❌ [ERROR] Type: {type(exc).__name__}")
    logger.error(f"❌ [ERROR] Traceback: {traceback.format_exc()}")
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "detail": "An unexpected error occurred. Please try again later."
        }
    )

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 [SERVER] Starting Fantasy Competition API...")
    
    # Run database migrations automatically
    try:
        from migrate_database import migrate_database
        migrate_database()
    except Exception as e:
        logger.error(f"❌ [SERVER] Migration error: {e}")
        # Continue anyway - init_db will handle basic setup
    
    init_db()
    logger.info("✅ [SERVER] Database initialized")
    logger.info("📊 [SERVER] Server ready at http://localhost:5000")

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Fantasy Competition API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.post("/api/auth/login", response_model=AuthResponse)
async def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with username and password"""
    logger.info(f"🔐 [API] POST /api/auth/login - User: {credentials.username}")
    
    user = authenticate_user(db, credentials.username, credentials.password)
    
    if not user:
        logger.warning(f"❌ [API] Login failed for user: {credentials.username}")
        return AuthResponse(
            success=False,
            message="Invalid username or password"
        )
    
    logger.info(f"✅ [API] Login successful for user: {credentials.username}")
    return AuthResponse(
        success=True,
        message="Login successful",
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "isAdmin": user.is_admin,
            "totalPoints": user.total_points
        }
    )


@app.post("/api/auth/register", response_model=AuthResponse)
async def register(user_data: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user"""
    logger.info(f"👤 [API] POST /api/auth/register - User: {user_data.username}")
    
    try:
        user = create_user(
            db,
            username=user_data.username,
            name=user_data.name,
            email=user_data.email,
            password=user_data.password
        )
        
        logger.info(f"✅ [API] Registration successful for user: {user_data.username}")
        if user.is_admin:
            logger.info(f"👑 [API] User registered as ADMIN: {user_data.username}")
        return AuthResponse(
            success=True,
            message="Registration successful" + (" - You are the admin!" if user.is_admin else ""),
            user={
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "isAdmin": user.is_admin,
                "totalPoints": user.total_points
            }
        )
    except ValueError as e:
        logger.error(f"❌ [API] Registration failed: {str(e)}")
        return AuthResponse(
            success=False,
            message=str(e)
        )
    except Exception as e:
        logger.error(f"❌ [API] Registration error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/verify", response_model=AuthResponse)
async def verify_user(user_data: dict, db: Session = Depends(get_db)):
    """Verify if a user exists in the database (for session validation)"""
    user_id = user_data.get("userId")
    if not user_id:
        return AuthResponse(
            success=False,
            message="userId is required"
        )
    
    user = db.query(database.User).filter(database.User.id == user_id).first()
    if user:
        return AuthResponse(
            success=True,
            message="User verified",
            user={
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "isAdmin": user.is_admin,
                "totalPoints": user.total_points
            }
        )
    else:
        logger.warning(f"❌ [API] User verification failed: {user_id}")
        return AuthResponse(
            success=False,
            message="User not found in database"
        )


@app.post("/api/auth/activity")
async def update_activity(user_data: dict, db: Session = Depends(get_db)):
    """Update user's last activity timestamp"""
    user_id = user_data.get("userId")
    if not user_id:
        raise HTTPException(status_code=400, detail="userId is required")
    
    user = db.query(database.User).filter(database.User.id == user_id).first()
    if user:
        user.last_activity = datetime.now()
        user.is_online = True
        db.commit()
        logger.debug(f"🟢 [API] Activity updated for user: {user_id}")
        return {"success": True, "message": "Activity updated"}
    else:
        raise HTTPException(status_code=404, detail="User not found")


@app.delete("/api/auth/account")
async def delete_account(x_user_id: str = Header(...), db: Session = Depends(get_db)):
    """
    Delete user's own account and all associated data
    Requires authentication via X-User-Id header
    """
    logger.info(f"🗑️ [API] DELETE /api/auth/account - User {x_user_id} requesting account deletion")
    
    try:
        # Verify user exists
        user = db.query(database.User).filter(database.User.id == x_user_id).first()
        if not user:
            logger.warning(f"❌ [API] User not found: {x_user_id}")
            raise HTTPException(status_code=404, detail="User account not found")
        
        # Prevent last admin from deleting their account
        if user.is_admin:
            admin_count = db.query(database.User).filter(database.User.is_admin == True).count()
            if admin_count == 1:
                logger.warning(f"❌ [API] Last admin {x_user_id} attempted to delete account")
                raise HTTPException(
                    status_code=403, 
                    detail="Cannot delete account. You are the last administrator. Please assign another admin first."
                )
        
        # Delete the user account and all associated data
        result = crud.delete_user_account(db, x_user_id)
        
        logger.info(f"✅ [API] Account deleted successfully: {result['user_name']}")
        
        return {
            "success": True,
            "message": result["message"],
            "details": {
                "user_name": result["user_name"],
                "user_email": result["user_email"],
                "transfers_deleted": result["transfers_deleted"],
                "teams_deleted": result["teams_deleted"]
            }
        }
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"❌ [API] Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ [API] Unexpected error deleting account: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete account. Please try again.")


@app.get("/api/auth/users")
async def get_all_users(x_user_id: str = Header(...), db: Session = Depends(get_db)):
    """
    Get list of all users (for admin transfer)
    Requires authentication via X-User-Id header
    """
    logger.info(f"👥 [API] GET /api/auth/users - User {x_user_id} requesting user list")
    
    try:
        # Verify requesting user exists
        requesting_user = db.query(database.User).filter(database.User.id == x_user_id).first()
        if not requesting_user:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Get all users
        users = db.query(database.User).all()
        
        user_list = []
        for user in users:
            user_list.append({
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "isAdmin": user.is_admin,
                "totalPoints": user.total_points
            })
        
        logger.info(f"✅ [API] Returned {len(user_list)} users")
        return {"success": True, "data": user_list}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [API] Error fetching users: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")


@app.put("/api/auth/profile")
async def update_profile(
    update_data: dict,
    x_user_id: str = Header(...),
    db: Session = Depends(get_db)
):
    """
    Update user profile (name, email, password)
    Requires authentication via X-User-Id header
    """
    logger.info(f"✏️ [API] PUT /api/auth/profile - User {x_user_id} updating profile")
    
    try:
        # Verify user exists
        user = db.query(database.User).filter(database.User.id == x_user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Update name if provided
        if 'name' in update_data and update_data['name']:
            user.name = update_data['name']
            logger.info(f"📝 [API] Updated name for user {x_user_id}")
        
        # Update email if provided
        if 'email' in update_data and update_data['email']:
            # Check if email is already taken by another user
            existing_user = db.query(database.User).filter(
                database.User.email == update_data['email'],
                database.User.id != x_user_id
            ).first()
            if existing_user:
                raise HTTPException(status_code=400, detail="Email already in use by another user")
            
            user.email = update_data['email']
            logger.info(f"📧 [API] Updated email for user {x_user_id}")
        
        # Update password if provided
        if 'new_password' in update_data and update_data['new_password']:
            # Verify current password
            if 'current_password' not in update_data or not update_data['current_password']:
                raise HTTPException(status_code=400, detail="Current password required to change password")
            
            if not auth.verify_password(update_data['current_password'], user.password_hash):
                raise HTTPException(status_code=400, detail="Current password is incorrect")
            
            # Hash and update new password
            user.password_hash = auth.hash_password(update_data['new_password'])
            logger.info(f"🔒 [API] Updated password for user {x_user_id}")
        
        db.commit()
        db.refresh(user)
        
        logger.info(f"✅ [API] Profile updated successfully for user {x_user_id}")
        
        return {
            "success": True,
            "message": "Profile updated successfully",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "isAdmin": user.is_admin
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [API] Error updating profile: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update profile")


@app.post("/api/auth/transfer-admin")
async def transfer_admin(
    transfer_data: dict,
    x_user_id: str = Header(...),
    db: Session = Depends(get_db)
):
    """
    Transfer admin rights to another user
    Requires authentication via X-User-Id header and current user must be admin
    """
    logger.info(f"👑 [API] POST /api/auth/transfer-admin - User {x_user_id} transferring admin")
    
    try:
        # Verify current user exists and is admin
        current_user = db.query(database.User).filter(database.User.id == x_user_id).first()
        if not current_user:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Only admins can transfer admin rights")
        
        # Get target user
        target_user_id = transfer_data.get('target_user_id')
        if not target_user_id:
            raise HTTPException(status_code=400, detail="Target user ID required")
        
        target_user = db.query(database.User).filter(database.User.id == target_user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="Target user not found")
        
        # Cannot transfer to self
        if target_user_id == x_user_id:
            raise HTTPException(status_code=400, detail="Cannot transfer admin rights to yourself")
        
        # Transfer admin rights
        current_user.is_admin = False
        target_user.is_admin = True
        
        db.commit()
        
        logger.info(f"✅ [API] Admin rights transferred from {current_user.name} to {target_user.name}")
        
        return {
            "success": True,
            "message": f"Admin rights transferred to {target_user.name}",
            "previousAdmin": current_user.name,
            "newAdmin": target_user.name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [API] Error transferring admin: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to transfer admin rights")


@app.get("/api/admin/connected-users")
async def get_connected_users(db: Session = Depends(get_db), is_admin: bool = Depends(verify_admin)):
    """Get list of users and their connection status (admin only)"""
    logger.info("👥 [API] GET /api/admin/connected-users - Fetching connected users")
    
    from datetime import timedelta
    
    # Users active in last 5 minutes are considered online
    online_threshold = datetime.now() - timedelta(minutes=5)
    
    users = db.query(database.User).all()
    
    connected_users = []
    for user in users:
        is_active = user.last_activity and user.last_activity > online_threshold
        
        connected_users.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "totalPoints": user.total_points,
            "lastActivity": user.last_activity.isoformat() if user.last_activity else None,
            "isOnline": is_active,
            "createdAt": user.created_at.isoformat()
        })
    
    # Sort by last activity (most recent first)
    connected_users.sort(key=lambda x: x["lastActivity"] or "", reverse=True)
    
    online_count = sum(1 for u in connected_users if u["isOnline"])
    logger.info(f"✅ [API] Found {online_count} online users out of {len(connected_users)} total")
    
    return {
        "users": connected_users,
        "totalUsers": len(connected_users),
        "onlineUsers": online_count,
        "timestamp": datetime.now().isoformat()
    }


# ============================================================================
# PLAYERS ENDPOINTS
# ============================================================================

@app.get("/api/players", response_model=List[dict])
async def get_all_players(db: Session = Depends(get_db)):
    """Get all players"""
    logger.info("📊 [API] GET /api/players - Fetching all players")
    players = get_players(db)
    logger.info(f"✅ [API] Returned {len(players)} players")
    return players

@app.get("/api/players/{round_number}", response_model=List[dict])
async def get_players_for_round(round_number: int, db: Session = Depends(get_db)):
    """Get qualified players for a specific round"""
    logger.info(f"📊 [API] GET /api/players/{round_number} - Fetching qualified players")
    players = get_qualified_players(db, round_number)
    logger.info(f"✅ [API] Returned {len(players)} qualified players for round {round_number}")
    return players


# ============================================================================
# ROUNDS ENDPOINTS
# ============================================================================

@app.get("/api/rounds", response_model=List[dict])
async def get_all_rounds(db: Session = Depends(get_db)):
    """Get all rounds configuration"""
    logger.info("📅 [API] GET /api/rounds - Fetching all rounds")
    rounds = get_rounds(db)
    logger.info(f"✅ [API] Returned {len(rounds)} rounds")
    return rounds

@app.get("/api/rounds/current", response_model=dict)
async def get_current_round_info(db: Session = Depends(get_db)):
    """Get current active round"""
    logger.info("📅 [API] GET /api/rounds/current - Fetching current round")
    current = get_current_round(db)
    if not current:
        logger.error("❌ [API] No active round found")
        raise HTTPException(status_code=404, detail="No active round found")
    logger.info(f"✅ [API] Current round: {current['round']}")
    return current


# ============================================================================
# TEAMS ENDPOINTS
# ============================================================================

@app.post("/api/team", response_model=dict)
async def submit_team(team_data: TeamCreate, x_user_id: str = Header(...), db: Session = Depends(get_db)):
    """Submit or update team selection"""
    logger.info(f"💾 [API] POST /api/team - User: {team_data.userId}, Round: {team_data.round}")
    logger.info(f"📋 [API] Selected players: {team_data.selectedPlayers}")
    
    # Verify user is submitting their own team (or is admin)
    from auth import verify_user_or_admin
    try:
        verify_user_or_admin(team_data.userId, x_user_id, db)
    except HTTPException:
        raise
    
    try:
        result = create_or_update_team(db, team_data)
        logger.info(f"✅ [API] Team saved successfully for user {team_data.userId}")
        return result
    except ValueError as e:
        logger.error(f"❌ [API] Validation error saving team: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ [API] Error saving team: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save team. Please try again.")

@app.get("/api/team/{user_id}/{round_number}", response_model=dict)
async def get_team(user_id: str, round_number: int, x_user_id: str = Header(...), db: Session = Depends(get_db)):
    """Get user's team for a specific round"""
    logger.info(f"📂 [API] GET /api/team/{user_id}/{round_number} - Fetching team")
    
    # Verify user is accessing their own team (or is admin)
    from auth import verify_user_or_admin
    try:
        verify_user_or_admin(user_id, x_user_id, db)
    except HTTPException:
        raise
    
    team = get_user_team(db, user_id, round_number)
    if not team:
        logger.info(f"ℹ️ [API] No team found for user {user_id} in round {round_number}")
        raise HTTPException(status_code=404, detail="Team not found for this round")
    logger.info(f"✅ [API] Team retrieved: {len(team.get('selectedPlayers', []))} players")
    return team


# ============================================================================
# TRANSFERS ENDPOINTS
# ============================================================================

@app.post("/api/transfer", response_model=dict)
async def apply_player_transfer(transfer_data: TransferCreate, x_user_id: str = Header(...), db: Session = Depends(get_db)):
    """Apply a transfer (add or remove player)"""
    logger.info(f"🔄 [API] POST /api/transfer - User: {transfer_data.userId}")
    logger.info(f"🔄 [API] Action: {transfer_data.action}, Player: {transfer_data.playerId}")
    
    # Verify user is modifying their own team (or is admin)
    from auth import verify_user_or_admin
    try:
        verify_user_or_admin(transfer_data.userId, x_user_id, db)
    except HTTPException:
        raise
    
    try:
        result = apply_transfer(db, transfer_data)
        logger.info(f"✅ [API] Transfer applied. Penalty: {result.get('penaltyApplied', False)}")
        return result
    except ValueError as e:
        logger.error(f"❌ [API] Validation error applying transfer: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ [API] Error applying transfer: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to apply transfer. Please try again.")


# ============================================================================
# LEADERBOARD ENDPOINTS
# ============================================================================

@app.get("/api/leaderboard", response_model=List[dict])
async def get_rankings(round_number: Optional[int] = None, db: Session = Depends(get_db)):
    """Get leaderboard rankings (optionally for specific round)"""
    logger.info(f"🏆 [API] GET /api/leaderboard - Round: {round_number or 'all'}")
    leaderboard = get_leaderboard(db, round_number)
    logger.info(f"✅ [API] Returned {len(leaderboard)} leaderboard entries")
    return leaderboard

@app.get("/api/leaderboard/detailed")
async def get_detailed_leaderboard_endpoint(db: Session = Depends(get_db)):
    """Get detailed leaderboard with round-by-round standings for all users"""
    logger.info(f"📊 [API] GET /api/leaderboard/detailed - Fetching comprehensive standings")
    from crud import get_detailed_leaderboard
    result = get_detailed_leaderboard(db)
    logger.info(f"✅ [API] Returned detailed standings for {result['totalUsers']} users")
    return result


# ============================================================================
# ADMIN ENDPOINTS
# ============================================================================

@app.post("/api/admin/players", response_model=dict)
async def create_player_endpoint(player_data: PlayerCreate, db: Session = Depends(get_db), is_admin: bool = Depends(verify_admin)):
    """Create a new player (admin only)"""
    logger.info(f"👑 [API] POST /api/admin/players - Creating player: {player_data.name}")
    
    try:
        from crud import create_player
        result = create_player(db, player_data)
        logger.info(f"✅ [API] Player created successfully")
        return result
    except ValueError as e:
        logger.error(f"❌ [API] Error creating player: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ [API] Error creating player: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/admin/players/{player_id}", response_model=dict)
async def update_player_endpoint(player_id: int, player_data: PlayerUpdate, db: Session = Depends(get_db), is_admin: bool = Depends(verify_admin)):
    """Update a player (admin only)"""
    logger.info(f"👑 [API] PUT /api/admin/players/{player_id} - Updating player")
    
    try:
        from crud import update_player
        result = update_player(db, player_id, player_data)
        logger.info(f"✅ [API] Player updated successfully")
        return result
    except ValueError as e:
        logger.error(f"❌ [API] Error updating player: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ [API] Error updating player: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/admin/players/{player_id}", response_model=dict)
async def delete_player_endpoint(player_id: int, db: Session = Depends(get_db), is_admin: bool = Depends(verify_admin)):
    """Delete a player (admin only)"""
    logger.info(f"👑 [API] DELETE /api/admin/players/{player_id} - Deleting player")
    
    try:
        from crud import delete_player
        result = delete_player(db, player_id)
        logger.info(f"✅ [API] Player deleted successfully")
        return result
    except ValueError as e:
        logger.error(f"❌ [API] Error deleting player: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ [API] Error deleting player: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/update-scores", response_model=dict)
async def update_scores(score_data: ScoreUpdate, db: Session = Depends(get_db), is_admin: bool = Depends(verify_admin)):
    """Update player scores for a round (admin only)"""
    
    try:
        result = update_player_scores(db, score_data)
        return result
    except Exception as e:
        logger.error(f"❌ [API] Error updating scores: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/admin/calculate-points/{round_number}", response_model=dict)
async def calculate_team_points(round_number: int, db: Session = Depends(get_db), is_admin: bool = Depends(verify_admin)):
    """Manually recalculate team points for a round (admin only)"""
    logger.info(f"👑 [API] POST /api/admin/calculate-points/{round_number} - Recalculating team points")
    
    try:
        from crud import calculate_team_points_for_round
        result = calculate_team_points_for_round(db, round_number)
        logger.info(f"✅ [API] Team points recalculated successfully")
        return result
    except ValueError as e:
        logger.error(f"❌ [API] Error calculating team points: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ [API] Error calculating team points: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/rounds", response_model=dict)
async def create_round_endpoint(round_data: RoundCreate, db: Session = Depends(get_db), is_admin: bool = Depends(verify_admin)):
    """Create a new round (admin only)"""
    logger.info(f"👑 [API] POST /api/admin/rounds - Creating round {round_data.round}")
    
    try:
        from crud import create_round
        result = create_round(db, round_data)
        logger.info(f"✅ [API] Round created successfully")
        return result
    except ValueError as e:
        logger.error(f"❌ [API] Error creating round: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ [API] Error creating round: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/admin/rounds/{round_number}", response_model=dict)
async def update_round_endpoint(round_number: int, round_data: RoundUpdate, db: Session = Depends(get_db), is_admin: bool = Depends(verify_admin)):
    """Update a round (admin only)"""
    
    try:
        from crud import update_round
        result = update_round(db, round_number, round_data)
        return result
    except ValueError as e:
        logger.error(f"❌ [API] Error updating round: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ [API] Error updating round: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/admin/rounds/{round_number}", response_model=dict)
async def delete_round_endpoint(round_number: int, db: Session = Depends(get_db), is_admin: bool = Depends(verify_admin)):
    """Delete a round (admin only)"""
    logger.info(f"👑 [API] DELETE /api/admin/rounds/{round_number} - Deleting round")
    
    try:
        from crud import delete_round
        result = delete_round(db, round_number)
        logger.info(f"✅ [API] Round deleted successfully")
        return result
    except ValueError as e:
        logger.error(f"❌ [API] Error deleting round: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ [API] Error deleting round: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/rounds/{round_number}/close", response_model=dict)
async def close_round_endpoint(round_number: int, db: Session = Depends(get_db), is_admin: bool = Depends(verify_admin)):
    """Manually close a round before its deadline (admin only)"""
    logger.info(f"👑 [API] POST /api/admin/rounds/{round_number}/close - Closing round")
    
    try:
        from crud import close_round
        result = close_round(db, round_number)
        logger.info(f"✅ [API] Round closed successfully")
        return result
    except ValueError as e:
        logger.error(f"❌ [API] Error closing round: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ [API] Error closing round: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CONFIG ENDPOINTS
# ============================================================================

@app.get("/api/config/points", response_model=dict)
async def get_points_configuration(db: Session = Depends(get_db)):
    """Get points configuration"""
    logger.info("⚙️ [API] GET /api/config/points - Fetching points config")
    config = get_points_config(db)
    logger.info(f"✅ [API] Points config: {config}")
    return config


@app.put("/api/admin/config/points", response_model=dict)
async def update_points_configuration(config_data: dict, db: Session = Depends(get_db), is_admin: bool = Depends(verify_admin)):
    """Update points configuration (admin only)"""
    logger.info("👑 [API] PUT /api/admin/config/points - Updating points config")
    
    try:
        from crud import update_points_config
        result = update_points_config(db, config_data)
        logger.info(f"✅ [API] Points config updated successfully")
        return result
    except Exception as e:
        logger.error(f"❌ [API] Error updating points config: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/admin/backup/database")
async def download_database_backup(is_admin: bool = Depends(verify_admin)):
    """Download SQLite database file as backup (admin only)"""
    from fastapi.responses import FileResponse
    import os
    
    logger.info("💾 [API] GET /api/admin/backup/database - Database backup requested")
    
    db_path = "./fantasy_competition.db"
    
    if not os.path.exists(db_path):
        logger.error(f"❌ [API] Database file not found: {db_path}")
        raise HTTPException(status_code=404, detail="Database file not found")
    
    # Generate filename with timestamp
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    download_filename = f"fantasy_competition_backup_{timestamp}.db"
    
    logger.info(f"✅ [API] Sending database backup: {download_filename}")
    
    return FileResponse(
        path=db_path,
        media_type="application/octet-stream",
        filename=download_filename
    )


@app.post("/api/admin/backup/restore")
async def restore_database_backup(file: bytes = None):
    """Restore/upload database from backup file (admin only)"""
    import os
    import shutil
    from fastapi import File, UploadFile
    from datetime import datetime
    
    logger.info("📤 [API] POST /api/admin/backup/restore - Database restore requested")
    
    # This endpoint expects the file as form-data
    # We'll create a separate endpoint that properly handles file uploads
    pass


@app.post("/api/admin/backup/upload")
async def upload_database_backup(file: UploadFile = File(...), is_admin: bool = Depends(verify_admin)):
    """Upload and restore database from backup file (admin only)"""
    import os
    import shutil
    from datetime import datetime
    
    logger.info(f"📤 [API] POST /api/admin/backup/upload - Restoring database from: {file.filename}")
    
    # Validate file
    if not file.filename or not file.filename.endswith('.db'):
        logger.error("❌ [API] Invalid file type - must be .db file")
        raise HTTPException(status_code=400, detail="Invalid file type. Must be a .db file")
    
    try:
        db_path = "./fantasy_competition.db"
        backup_path = f"./fantasy_competition_backup_before_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
        
        # Create backup of current database before replacing
        if os.path.exists(db_path):
            logger.info(f"💾 [API] Creating safety backup: {backup_path}")
            shutil.copy2(db_path, backup_path)
        
        # Read uploaded file and save as new database
        logger.info("📝 [API] Writing uploaded database file...")
        contents = await file.read()
        
        with open(db_path, 'wb') as f:
            f.write(contents)
        
        logger.info(f"✅ [API] Database restored successfully from {file.filename}")
        logger.info(f"ℹ️  [API] Previous database backed up to: {backup_path}")
        
        return {
            "success": True,
            "message": "Database restored successfully",
            "backup_created": backup_path if os.path.exists(backup_path) else None,
            "note": "Server will reload with new database"
        }
        
    except Exception as e:
        logger.error(f"❌ [API] Error restoring database: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to restore database: {str(e)}")


# ============================================================================
# MATCHES ENDPOINTS
# ============================================================================

@app.get("/api/matches/{round_number}", response_model=List[dict])
async def get_matches_for_round(round_number: int, db: Session = Depends(get_db)):
    """Get all matches for a specific round (public)"""
    logger.info(f"⚔️ [API] GET /api/matches/{round_number} - Fetching matches")
    
    try:
        from crud import get_matches
        matches = get_matches(db, round_number)
        logger.info(f"✅ [API] Returned {len(matches)} matches")
        return matches
    except Exception as e:
        logger.error(f"❌ [API] Error fetching matches: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/matches", response_model=dict)
async def create_match_endpoint(match_data: dict, db: Session = Depends(get_db), is_admin: bool = Depends(verify_admin)):
    """Create a new match (admin only)"""
    logger.info(f"👑 [API] POST /api/admin/matches - Creating match")
    
    try:
        from models import MatchCreate
        from crud import create_match
        
        match_create = MatchCreate(**match_data)
        result = create_match(db, match_create)
        logger.info(f"✅ [API] Match created successfully")
        return result
    except ValueError as e:
        logger.error(f"❌ [API] Error creating match: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ [API] Error creating match: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/admin/matches/{match_id}", response_model=dict)
async def update_match_endpoint(match_id: int, match_data: dict, db: Session = Depends(get_db), is_admin: bool = Depends(verify_admin)):
    """Update a match (admin only)"""
    logger.info(f"👑 [API] PUT /api/admin/matches/{match_id} - Updating match")
    
    try:
        from models import MatchUpdate
        from crud import update_match
        
        match_update = MatchUpdate(**match_data)
        result = update_match(db, match_id, match_update)
        logger.info(f"✅ [API] Match updated successfully")
        return result
    except ValueError as e:
        logger.error(f"❌ [API] Error updating match: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ [API] Error updating match: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/admin/matches/{match_id}", response_model=dict)
async def delete_match_endpoint(match_id: int, db: Session = Depends(get_db), is_admin: bool = Depends(verify_admin)):
    """Delete a match (admin only)"""
    logger.info(f"👑 [API] DELETE /api/admin/matches/{match_id} - Deleting match")
    
    try:
        from crud import delete_match
        result = delete_match(db, match_id)
        logger.info(f"✅ [API] Match deleted successfully")
        return result
    except ValueError as e:
        logger.error(f"❌ [API] Error deleting match: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ [API] Error deleting match: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# RUN SERVER
# ============================================================================

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("⚡ FANTASY COMPETITION API SERVER")
    logger.info("=" * 60)
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5000,
        reload=True,
        reload_excludes=[".venv/*", "node_modules/*", ".git/*", "logs/*"],
        log_level="info"
    )
