"""
Authentication utilities for Fantasy Competition API
Includes password hashing, validation, and authorization
"""
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import Header, HTTPException, Depends
from database import User, get_db
from logger_config import get_logger
import re

logger = get_logger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Validation constants
MIN_USERNAME_LENGTH = 3
MAX_USERNAME_LENGTH = 50
MIN_PASSWORD_LENGTH = 6
MAX_PASSWORD_LENGTH = 100
USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_-]+$')
EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')


def validate_username(username: str) -> tuple[bool, str]:
    """
    Validate username format and length
    Returns: (is_valid, error_message)
    """
    if not username:
        return False, "Username is required"
    
    if len(username) < MIN_USERNAME_LENGTH:
        return False, f"Username must be at least {MIN_USERNAME_LENGTH} characters"
    
    if len(username) > MAX_USERNAME_LENGTH:
        return False, f"Username must not exceed {MAX_USERNAME_LENGTH} characters"
    
    if not USERNAME_PATTERN.match(username):
        return False, "Username can only contain letters, numbers, hyphens, and underscores"
    
    return True, ""


def validate_password(password: str) -> tuple[bool, str]:
    """
    Validate password strength and length
    Returns: (is_valid, error_message)
    """
    if not password:
        return False, "Password is required"
    
    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters"
    
    if len(password) > MAX_PASSWORD_LENGTH:
        return False, f"Password must not exceed {MAX_PASSWORD_LENGTH} characters"
    
    # Check for at least one number or special character (basic strength)
    if not any(char.isdigit() or not char.isalnum() for char in password):
        return False, "Password must contain at least one number or special character"
    
    return True, ""


def validate_email(email: str) -> tuple[bool, str]:
    """
    Validate email format
    Returns: (is_valid, error_message)
    """
    if not email:
        return False, "Email is required"
    
    if not EMAIL_PATTERN.match(email):
        return False, "Invalid email format"
    
    if len(email) > 255:
        return False, "Email is too long"
    
    return True, ""


def validate_name(name: str) -> tuple[bool, str]:
    """
    Validate user's full name
    Returns: (is_valid, error_message)
    """
    if not name or not name.strip():
        return False, "Name is required"
    
    if len(name.strip()) < 2:
        return False, "Name must be at least 2 characters"
    
    if len(name) > 100:
        return False, "Name is too long"
    
    return True, ""


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"❌ [AUTH] Password verification error: {e}")
        return False


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    """
    Authenticate a user with username and password
    Returns User object if valid, None otherwise
    """
    
    # Find user by username (using id field as username)
    user = db.query(User).filter(User.id == username).first()
    
    if not user:
        return None
    
    if not verify_password(password, user.password_hash):
        return None
    
    return user


def create_user(db: Session, username: str, name: str, email: str, password: str) -> User:
    """
    Create a new user with comprehensive validation and hashed password
    Raises ValueError with clear messages for validation failures
    """
    
    # Validate username
    valid, error = validate_username(username)
    if not valid:
        raise ValueError(error)
    
    # Validate password
    valid, error = validate_password(password)
    if not valid:
        raise ValueError(error)
    
    # Validate email
    valid, error = validate_email(email)
    if not valid:
        raise ValueError(error)
    
    # Validate name
    valid, error = validate_name(name)
    if not valid:
        raise ValueError(error)
    
    # Clean inputs
    username = username.strip()
    email = email.strip().lower()
    name = name.strip()
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.id == username).first()
    if existing_user:
        raise ValueError(f"Username '{username}' is already taken. Please choose a different username.")
    
    # Check if email already exists
    existing_email = db.query(User).filter(User.email == email).first()
    if existing_email:
        raise ValueError(f"Email '{email}' is already registered. Please use a different email or try logging in.")
    
    # Check if this is the first user - make them admin
    try:
        user_count = db.query(User).count()
        is_first_user = user_count == 0
    except Exception as e:
        logger.error(f"❌ [AUTH] Database error checking user count: {e}")
        raise ValueError("Database error. Please try again later.")
    
    # Create user with hashed password
    try:
        hashed = hash_password(password)
        user = User(
            id=username,
            name=name,
            email=email,
            password_hash=hashed,
            is_admin=is_first_user,  # First user is automatically admin
            total_points=0
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return user
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [AUTH] Error creating user '{username}': {e}")
        raise ValueError("Failed to create user account. Please try again.")


def verify_admin(x_user_id: str = Header(...), db: Session = Depends(get_db)) -> bool:
    """
    Dependency to verify if the current user is an admin
    Raises HTTPException with clear error messages if not authorized
    """
    # Validate header is present
    if not x_user_id or not x_user_id.strip():
        logger.warning("❌ [AUTH] Missing or empty X-User-Id header")
        raise HTTPException(
            status_code=401, 
            detail="Authentication required. Please log in to access this resource."
        )
    
    logger.info(f"🔒 [AUTH] Verifying admin access for user: {x_user_id}")
    
    try:
        user = db.query(User).filter(User.id == x_user_id.strip()).first()
    except Exception as e:
        logger.error(f"❌ [AUTH] Database error during admin verification: {e}")
        raise HTTPException(
            status_code=500,
            detail="Server error during authentication. Please try again."
        )
    
    if not user:
        logger.warning(f"❌ [AUTH] User not found: {x_user_id}")
        raise HTTPException(
            status_code=401, 
            detail="User account not found. Please log out and log in again."
        )
    
    if not user.is_admin:
        logger.warning(f"❌ [AUTH] User {x_user_id} attempted admin operation without permissions")
        raise HTTPException(
            status_code=403, 
            detail="Access denied. This operation requires administrator privileges."
        )
    
    logger.info(f"✅ [AUTH] Admin access granted for user: {x_user_id}")
    return True


def verify_user(x_user_id: str = Header(...), db: Session = Depends(get_db)) -> User:
    """
    Dependency to verify user exists and return user object
    Raises HTTPException if user not found
    """
    if not x_user_id or not x_user_id.strip():
        logger.warning("❌ [AUTH] Missing or empty X-User-Id header")
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in to access this resource."
        )
    
    try:
        user = db.query(User).filter(User.id == x_user_id.strip()).first()
    except Exception as e:
        logger.error(f"❌ [AUTH] Database error during user verification: {e}")
        raise HTTPException(
            status_code=500,
            detail="Server error during authentication. Please try again."
        )
    
    if not user:
        logger.warning(f"❌ [AUTH] User not found: {x_user_id}")
        raise HTTPException(
            status_code=401,
            detail="User account not found. Please log out and log in again."
        )
    
    return user


def verify_user_or_admin(target_user_id: str, x_user_id: str = Header(...), db: Session = Depends(get_db)) -> bool:
    """
    Dependency to verify user is either accessing their own data or is an admin
    Raises HTTPException if neither condition is met
    """
    if not x_user_id or not x_user_id.strip():
        logger.warning("❌ [AUTH] Missing or empty X-User-Id header")
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in to access this resource."
        )
    
    try:
        user = db.query(User).filter(User.id == x_user_id.strip()).first()
    except Exception as e:
        logger.error(f"❌ [AUTH] Database error during authorization check: {e}")
        raise HTTPException(
            status_code=500,
            detail="Server error during authorization. Please try again."
        )
    
    if not user:
        logger.warning(f"❌ [AUTH] User not found: {x_user_id}")
        raise HTTPException(
            status_code=401,
            detail="User account not found. Please log out and log in again."
        )
    
    # Check if user is accessing their own data
    if user.id == target_user_id:
        return True
    
    # Check if user is admin
    if user.is_admin:
        logger.info(f"✅ [AUTH] Admin {user.id} accessing data for user {target_user_id}")
        return True
    
    # User is neither owner nor admin
    logger.warning(f"❌ [AUTH] User {user.id} attempted to access data for user {target_user_id}")
    raise HTTPException(
        status_code=403,
        detail="Access denied. You can only access your own data."
    )
