"""
Automatic Round Processor
Runs rounds automatically at deadline, calculates points, and updates rankings
"""
import schedule
import time
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import SessionLocal, Round
from crud import calculate_team_points_for_round

logger = logging.getLogger("fantasy_backend.round_processor")


def check_and_process_rounds():
    """Check for rounds that have passed deadline and process them"""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        logger.info(f"🔍 [PROCESSOR] Checking for rounds to process at {now}")
        
        # Get all rounds that have passed deadline but not processed
        rounds = db.query(Round).filter(Round.is_closed == False).all()
        
        for round_obj in rounds:
            deadline = round_obj.deadline
            
            # Check if deadline has passed
            if now > deadline:
                logger.info(f"⏰ [PROCESSOR] Round {round_obj.round} deadline passed. Processing...")
                
                try:
                    # Calculate team points for this round
                    result = calculate_team_points_for_round(db, round_obj.round)
                    
                    # Mark round as closed
                    round_obj.is_closed = True
                    db.commit()
                    
                    logger.info(f"✅ [PROCESSOR] Round {round_obj.round} processed successfully")
                    logger.info(f"   Teams updated: {result.get('teams_updated', 0)}")
                    logger.info(f"   Users updated: {result.get('users_updated', 0)}")
                    
                except Exception as e:
                    db.rollback()
                    logger.error(f"❌ [PROCESSOR] Error processing round {round_obj.round}: {e}")
        
    except Exception as e:
        logger.error(f"❌ [PROCESSOR] Error in check_and_process_rounds: {e}")
    finally:
        db.close()


def start_round_processor():
    """Start the automatic round processor"""
    logger.info("🚀 [PROCESSOR] Starting automatic round processor")
    logger.info("   Checking every 1 minute for rounds past deadline")
    
    # Schedule check every minute
    schedule.every(1).minutes.do(check_and_process_rounds)
    
    # Run immediately on start
    check_and_process_rounds()
    
    # Keep running
    while True:
        schedule.run_pending()
        time.sleep(1)


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s | %(levelname)s | %(name)s | %(message)s'
    )
    
    start_round_processor()
