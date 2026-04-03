# Fantasy Competition

A full-stack fantasy sports competition application built with **React Native (Expo)** for mobile and **FastAPI** for the backend API.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Project Structure](#️-project-structure)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [API Reference](#-api-reference)
- [App Navigation](#-app-navigation)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

## 🎯 Features

### User Features
- ✅ User registration and login with bcrypt password hashing
- ✅ Fantasy team selection with budget constraints
- ✅ Player transfers with configurable penalty system
- ✅ Captain selection (2× points multiplier)
- ✅ Round-based scoring and leaderboard
- ✅ Dark mode (auto-detects system preference)
- ✅ Haptic feedback on interactions

### Admin Features
- ✅ Player management (add, edit, delete, set prices)
- ✅ Round management (deadlines, budgets, transfer rules)
- ✅ Match scheduling
- ✅ Score updates per round
- ✅ Database export / import (JSON)

### Technical Features
- ✅ Full TypeScript frontend
- ✅ Automatic retry logic for failed API requests
- ✅ Comprehensive error handling and structured logging
- ✅ Network connectivity testing utility
- ✅ Cross-platform (iOS, Android, Web)

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile / Web | React Native 0.81 · Expo 54 · Expo Router |
| Language (frontend) | TypeScript |
| State management | React Context |
| Backend framework | FastAPI 0.115 |
| Language (backend) | Python 3.8+ |
| ORM | SQLAlchemy 2.0 |
| Database | SQLite (dev) · PostgreSQL (prod) |
| Auth | bcrypt password hashing + header-based session |
| Server | Uvicorn / Gunicorn |

## 🗂️ Project Structure

```
fantasy-competition/
├── app/                        # Expo Router navigation
│   ├── (tabs)/                 # Tab-based screens
│   │   ├── index.tsx           # Home / Dashboard
│   │   ├── explore.tsx         # Team Selection
│   │   ├── myteam.tsx          # My Team Management
│   │   ├── leaderboard.tsx     # Leaderboard
│   │   ├── admin.tsx           # Admin Panel
│   │   └── settings.tsx        # User Settings
│   ├── _layout.tsx             # Root layout (auth guard)
│   └── modal.tsx               # Modal screens
│
├── src/                        # Frontend source code
│   ├── components/             # Screen-specific components
│   ├── components-shared/      # Reusable UI components
│   │   ├── haptic-tab.tsx
│   │   ├── themed-text.tsx
│   │   ├── themed-view.tsx
│   │   └── ui/
│   ├── constants/
│   │   └── theme.ts            # Light / Dark theme colours
│   ├── context/
│   │   ├── AuthContext.tsx     # Authentication state
│   │   └── GameContext.tsx     # Game state
│   ├── hooks/                  # Custom React hooks
│   ├── screens/                # Screen implementations
│   ├── services/
│   │   └── api.ts              # API client
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   └── utils/
│       ├── connectionTester.ts # Network connectivity check
│       ├── errorHandler.ts     # Error formatting
│       ├── fileLogger.ts       # File-based logging
│       ├── haptics.ts          # Haptic helpers
│       ├── retryHelper.ts      # Automatic retry logic
│       ├── serverConfig.ts     # Server URL (persisted)
│       └── sounds.ts           # Sound effects
│
├── backend/                    # Python FastAPI backend
│   ├── main.py                 # App entry point & routes
│   ├── models.py               # Pydantic request/response models
│   ├── database.py             # SQLAlchemy models & DB init
│   ├── crud.py                 # Database CRUD operations
│   ├── auth.py                 # Auth helpers & validators
│   ├── logger_config.py        # Logging setup
│   └── requirements.txt        # Python dependencies
│
├── assets/                     # Images and icons
├── app.json                    # Expo configuration
├── package.json                # Node dependencies
├── tsconfig.json               # TypeScript config
└── render.yaml                 # Render deployment config
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **Python** 3.8 or higher
- **npm** or **yarn**
- **Expo Go** app (optional — for testing on a physical device)

### 1. Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv ../.venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
source ../.venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start the development server
uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

The API will be available at `http://localhost:5000`.
Interactive docs: `http://localhost:5000/docs`

### 2. Frontend

```bash
# From the project root

# Install Node dependencies
npm install

# Start the Expo dev server
npx expo start
```

Then:
- Press **`a`** — open Android emulator
- Press **`i`** — open iOS simulator
- Press **`w`** — open in web browser
- Scan the **QR code** with the Expo Go app on your phone

## 🔧 Configuration

### Backend server URL (mobile app)

The app stores the server URL in device storage. To change it:

1. Open the app and go to the **Settings** tab.
2. Enter your server URL (e.g. `http://192.168.1.100:5000`).
3. Tap **Save**.

> **Tip:** Your phone and your computer must be on the same Wi-Fi network. Use your machine's local IP address, not `localhost`.

### Backend environment variables

Copy `backend/.env.example` to `backend/.env` and edit as needed:

```bash
cp backend/.env.example backend/.env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./fantasy_competition.db` | Database connection string |
| `HOST` | `0.0.0.0` | Server bind address |
| `PORT` | `5000` | Server port |

> **Note:** The backend uses bcrypt password hashing with a simple `X-User-Id` session header for authentication.

### Theme

The app automatically follows the system light/dark preference. Colours are defined in `src/constants/theme.ts`.

## 🔐 API Reference

Full interactive documentation is available at `http://localhost:5000/docs` while the backend is running.

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and start session |
| `POST` | `/api/auth/verify` | Verify session token |
| `DELETE` | `/api/auth/account` | Delete user account |

### Players

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/players` | Any |
| `GET` | `/api/players/qualified` | Any |
| `POST` | `/api/players` | Admin |
| `PUT` | `/api/players/{id}` | Admin |
| `DELETE` | `/api/players/{id}` | Admin |

### Rounds

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/rounds` | Any |
| `GET` | `/api/rounds/current` | Any |
| `POST` | `/api/rounds` | Admin |
| `PUT` | `/api/rounds/{round}` | Admin |
| `DELETE` | `/api/rounds/{round}` | Admin |

### Teams & Transfers

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/teams` | User |
| `POST` | `/api/teams` | User |
| `POST` | `/api/transfers` | User |

### Matches & Scoring

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/matches` | Any |
| `GET` | `/api/matches/round/{round}` | Any |
| `POST` | `/api/matches` | Admin |
| `PUT` | `/api/matches/{id}` | Admin |
| `DELETE` | `/api/matches/{id}` | Admin |
| `POST` | `/api/scores` | Admin |
| `GET` | `/api/leaderboard` | Any |
| `GET` | `/api/leaderboard/round/{round}` | Any |

### Data Management

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/export` | Admin |
| `POST` | `/api/import` | Admin |

## 📱 App Navigation

```
Login Screen
     │
     ▼
Tab Navigation
├── 🏠 Home          — Dashboard & recent activity
├── 🔍 Explore       — Browse & select players
├── ⚽ My Team        — Manage your squad
├── 🏆 Leaderboard   — Rankings
├── 🛡️ Admin         — Admin panel (admin users only)
└── ⚙️  Settings      — Server URL & preferences
```

## 🚢 Deployment

### Backend on Render

The repository includes a `render.yaml` for one-click deployment of the backend to [Render](https://render.com).

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

**Manual steps:**

1. Create a **Web Service** on Render and connect this repository.
2. Render auto-detects Python and installs dependencies via `pip`.
3. Set the **Start Command** to:
   ```
   cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
4. (Optional) Add environment variables in the Render dashboard.

**Production checklist:**

- [ ] Switch `DATABASE_URL` to a PostgreSQL connection string
- [ ] Update CORS `allow_origins` in `backend/main.py` to your exact domain
- [ ] Remove `--reload` flag from the start command
- [ ] Consider running with Gunicorn for multi-worker support:
  ```
  cd backend && gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
  ```

### Frontend (Expo / EAS)

For production mobile builds, use [Expo Application Services (EAS)](https://docs.expo.dev/eas/):

```bash
npm install -g eas-cli
eas build --platform all
```

For a static web build:

```bash
npx expo export --platform web
# Output is in the dist/ folder — deploy to any static host
```

## 🐛 Troubleshooting

### Backend won't start — port in use
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 5001
```

### Database locked / corrupt
```bash
# Stop the backend, then delete the database file
rm backend/fantasy_competition.db
# Restart backend — it will recreate the database automatically
```

### App can't connect to backend
1. Make sure the backend is running (`http://localhost:5000/health`).
2. Open **Settings** in the app and verify the server URL.
3. Ensure your phone and computer are on the **same Wi-Fi network**.
4. Check that your firewall allows port `5000`.

### Metro bundler / cache issues
```bash
npx expo start -c   # clears Metro cache
```

### "Cannot find module" TypeScript errors
```bash
rm -rf .expo node_modules/.cache
npm install
```

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-feature`.
3. Commit your changes: `git commit -m 'feat: add my feature'`.
4. Push to your branch: `git push origin feature/my-feature`.
5. Open a Pull Request.

## 📄 License

This project is licensed under the **MIT License**.

---

**Built with ❤️ using React Native + FastAPI**
