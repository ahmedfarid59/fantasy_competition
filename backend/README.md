# Fantasy Competition Backend

## Directory Structure

```
backend/
├── __init__.py           # Package initialization
├── main.py              # FastAPI application entry point
├── models.py            # SQLAlchemy models and Pydantic schemas
├── database.py          # Database configuration and session management
├── crud.py              # Database CRUD operations
├── auth.py              # Authentication and authorization
├── logger_config.py     # Logging configuration
├── requirements.txt     # Python dependencies
└── fantasy_competition.db  # SQLite database (created on first run)
```

## Setup and Installation

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Run the Backend Server

From the `backend` directory:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

Or from the project root:

```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/verify` - Verify authentication token
- `DELETE /api/auth/account` - Delete user account

### Players
- `GET /api/players` - Get all players
- `GET /api/players/qualified` - Get qualified players
- `POST /api/players` - Create new player (admin only)
- `PUT /api/players/{player_id}` - Update player (admin only)
- `DELETE /api/players/{player_id}` - Delete player (admin only)

### Rounds
- `GET /api/rounds` - Get all rounds
- `GET /api/rounds/current` - Get current active round
- `POST /api/rounds` - Create new round (admin only)
- `PUT /api/rounds/{round_number}` - Update round (admin only)
- `DELETE /api/rounds/{round_number}` - Delete round (admin only)

### Teams
- `GET /api/teams` - Get user's team
- `POST /api/teams` - Save/update team
- `POST /api/transfers` - Apply player transfer

### Matches
- `GET /api/matches` - Get all matches
- `GET /api/matches/round/{round_number}` - Get matches for specific round
- `POST /api/matches` - Create match (admin only)
- `PUT /api/matches/{match_id}` - Update match (admin only)
- `DELETE /api/matches/{match_id}` - Delete match (admin only)

### Scores & Leaderboard
- `POST /api/scores` - Update player scores (admin only)
- `GET /api/leaderboard` - Get overall leaderboard
- `GET /api/leaderboard/round/{round_number}` - Get round-specific leaderboard
- `GET /api/points-config` - Get points configuration

### Data Management
- `GET /api/export` - Export database as JSON (admin only)
- `POST /api/import` - Import database from JSON (admin only)

## Configuration

The backend uses SQLite by default with the database file `fantasy_competition.db` stored in the backend directory.

### Database Configuration
Edit `database.py` to change database settings:
```python
SQLALCHEMY_DATABASE_URL = "sqlite:///./fantasy_competition.db"
```

### CORS Settings
CORS is configured in `main.py` to allow all origins for development. Update for production:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Logging

Logs are written to the console with detailed information about:
- API requests and responses
- Database operations
- Authentication events
- Errors with full tracebacks

Configure logging in `logger_config.py`.

## Development

The server runs in development mode with auto-reload enabled when using `--reload` flag.

Access the API documentation at:
- Swagger UI: http://localhost:5000/docs
- ReDoc: http://localhost:5000/redoc

## Production Deployment

For production deployment:

1. Remove `--reload` flag
2. Update CORS origins to specific domains
3. Use a production-ready database (PostgreSQL recommended)
4. Set up proper environment variables for secrets
5. Use a production ASGI server like Gunicorn with Uvicorn workers

Example production command:
```bash
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:5000
```
