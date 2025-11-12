# Fantasy Competition App# Fantasy Competition App# Deploy FastAPI on Render



A full-stack fantasy sports competition application built with React Native (Expo) and FastAPI.



## 🏗️ Project StructureA full-stack fantasy sports application with React Native frontend and FastAPI backend.Use this repo as a template to deploy a Python [FastAPI](https://fastapi.tiangolo.com) service on Render.



```

fantasy-competition/

├── app/                    # 📱 Expo Router (Navigation)## Project StructureSee https://render.com/docs/deploy-fastapi or follow the steps below:

│   ├── (tabs)/            # Tab-based navigation

│   │   ├── index.tsx      # Home/Dashboard

│   │   ├── explore.tsx    # Team Selection

│   │   ├── myteam.tsx     # My Team Management```## Manual Steps

│   │   ├── leaderboard.tsx # Leaderboard View

│   │   ├── admin.tsx      # Admin Panelfantasy-competition/

│   │   └── settings.tsx   # Settings

│   ├── _layout.tsx        # Root layout with auth├── backend/                  # Python FastAPI Backend1. You may use this repository directly or [create your own repository from this template](https://github.com/render-examples/fastapi/generate) if you'd like to customize the code.

│   └── modal.tsx          # Modal screens

││   ├── __init__.py2. Create a new Web Service on Render.

├── src/                    # 🎨 Frontend Code

│   ├── components/        # Screen-specific components│   ├── main.py              # FastAPI application3. Specify the URL to your new repository or this repository.

│   │   └── ErrorBoundary.tsx

│   ││   ├── models.py            # Database models4. Render will automatically detect that you are deploying a Python service and use `pip` to download the dependencies.

│   ├── components-shared/ # Reusable UI components

│   │   ├── haptic-tab.tsx # Tab with haptic feedback│   ├── database.py          # Database configuration5. Specify the following as the Start Command.

│   │   ├── themed-text.tsx # Themed text component

│   │   ├── themed-view.tsx # Themed view component│   ├── crud.py              # CRUD operations

│   │   └── ui/

│   │       ├── icon-symbol.tsx│   ├── auth.py              # Authentication    ```shell

│   │       └── icon-symbol.ios.tsx

│   ││   ├── logger_config.py     # Logging configuration    uvicorn main:app --host 0.0.0.0 --port $PORT

│   ├── constants/         # App constants

│   │   └── theme.ts       # Light/Dark theme colors│   ├── requirements.txt     # Python dependencies    ```

│   │

│   ├── context/           # React Context providers│   └── README.md            # Backend documentation

│   │   ├── AuthContext.tsx # Authentication state

│   │   └── GameContext.tsx # Game state management│6. Click Create Web Service.

│   │

│   ├── hooks/             # Custom React hooks├── app/                     # Expo Router App Routes

│   │   ├── use-color-scheme.ts

│   │   ├── use-color-scheme.web.ts│   ├── (tabs)/             # Tab navigation screensOr simply click:

│   │   └── use-theme-color.ts

│   ││   ├── _layout.tsx         # Root layout

│   ├── screens/           # Screen components

│   │   ├── AdminScreen.tsx│   └── modal.tsx           # Modal screen[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/render-examples/fastapi)

│   │   ├── DashboardScreen.tsx

│   │   ├── HelpScreen.tsx│

│   │   ├── HomeScreen.tsx

│   │   ├── LoginScreen.tsx├── src/                    # React Native Source Code## Thanks

│   │   ├── MatchManagementScreen.tsx

│   │   ├── MyTeamScreen.tsx│   ├── components/         # Reusable components

│   │   ├── PlayerManagementScreen.tsx

│   │   ├── ProfileEditScreen.tsx│   ├── context/           # React context providersThanks to [Harish](https://harishgarg.com) for the [inspiration to create a FastAPI quickstart for Render](https://twitter.com/harishkgarg/status/1435084018677010434) and for some sample code!

│   │   ├── RoundManagementScreen.tsx│   ├── screens/           # Screen components

│   │   ├── ScoreManagementScreen.tsx│   ├── services/          # API services

│   │   ├── SettingsScreen.tsx│   ├── types/             # TypeScript types

│   │   └── TeamSelectionScreen.tsx│   └── utils/             # Utility functions

│   ││

│   ├── services/          # External services├── components/            # Shared UI components

│   │   └── api.ts         # API client│   ├── haptic-tab.tsx

│   ││   ├── themed-text.tsx

│   ├── types/             # TypeScript definitions│   ├── themed-view.tsx

│   │   └── index.ts│   └── ui/

│   ││

│   └── utils/             # Utility functions├── assets/               # Images and static assets

│       ├── connectionTester.ts # Network connectivity├── hooks/                # Custom React hooks

│       ├── errorHandler.ts    # Error handling├── constants/            # Constants and themes

│       ├── fileLogger.ts      # File logging├── .venv/               # Python virtual environment

│       ├── haptics.ts         # Haptic feedback└── node_modules/        # Node.js dependencies

│       ├── retryHelper.ts     # Retry logic```

│       ├── serverConfig.ts    # Server configuration

│       └── sounds.ts          # Sound effects## Quick Start

│

├── backend/                # 🐍 Python FastAPI Backend### Prerequisites

│   ├── main.py            # FastAPI app entry point

│   ├── models.py          # SQLAlchemy models- Node.js (v18 or higher)

│   ├── database.py        # Database configuration- Python 3.8+

│   ├── crud.py            # CRUD operations- npm or yarn

│   ├── auth.py            # Authentication logic- Expo CLI

│   ├── logger_config.py   # Logging configuration

│   ├── requirements.txt   # Python dependencies### Backend Setup

│   └── README.md          # Backend documentation

│1. **Navigate to backend folder:**

├── assets/                 # 📦 Static Assets   ```bash

│   └── images/   cd backend

│   ```

└── Configuration Files

    ├── app.json           # Expo configuration2. **Create virtual environment (if not exists):**

    ├── package.json       # Node dependencies   ```bash

    ├── tsconfig.json      # TypeScript config   python -m venv ../.venv

    └── eslint.config.js   # ESLint rules   ```

```

3. **Activate virtual environment:**

## 🚀 Quick Start   - Windows: `.venv\Scripts\activate`

   - macOS/Linux: `source .venv/bin/activate`

### Prerequisites

4. **Install dependencies:**

- **Node.js** (v18 or higher)   ```bash

- **Python** 3.8+   pip install -r requirements.txt

- **npm** or **yarn**   ```

- **Expo CLI** (optional, can use npx)

5. **Start backend server:**

### Frontend Setup   ```bash

   uvicorn main:app --reload --host 0.0.0.0 --port 5000

```bash   ```

# Install dependencies

npm install   Or use the startup script from project root:

   - Windows: `start-backend.bat`

# Start the Expo development server   - macOS/Linux: `./start-backend.sh`

npx expo start

### Frontend Setup

# Options:

# - Press 'a' for Android emulator1. **Install dependencies:**

# - Press 'i' for iOS simulator   ```bash

# - Press 'w' for web browser   npm install

# - Scan QR code with Expo Go app on your phone   ```

```

2. **Start Expo development server:**

### Backend Setup   ```bash

   npx expo start

#### Windows   ```

```bash

# Navigate to backend folder3. **Run on device/simulator:**

cd backend   - Press `a` for Android

   - Press `i` for iOS

# Install dependencies   - Scan QR code with Expo Go app

pip install -r requirements.txt

## Configuration

# Run the server

python main.py### Backend Configuration



# Or use the startup script- **Server URL**: Update in `src/utils/serverConfig.ts`

start-backend.bat- **Database**: SQLite database created in `backend/fantasy_competition.db`

```- **Port**: Default 5000 (configured in startup scripts)



#### Linux/Mac### Frontend Configuration

```bash

cd backend1. **Configure server URL in app:**

pip install -r requirements.txt   - Open Settings tab

uvicorn main:app --reload --host 0.0.0.0 --port 5000   - Enter server URL (e.g., `http://192.168.1.100:5000`)

   - Save settings

# Or use the startup script

chmod +x start-backend.sh2. **For development:**

./start-backend.sh   - Find your computer's IP address

```   - Use `http://[YOUR_IP]:5000` as server URL

   - Example: `http://192.168.1.100:5000`

## 🎯 Features

## Features

### User Features

- **Authentication** - Secure login/signup with JWT tokens### User Features

- **Team Management** - Create and manage fantasy teams- ✅ User registration and authentication

- **Player Selection** - Browse and select players- ✅ Team selection with budget constraints

- **Live Scoring** - Real-time score updates- ✅ Player transfers with penalty system

- **Leaderboard** - Track rankings and compete- ✅ Live leaderboard

- **Dark Mode** - Automatic light/dark theme support- ✅ Round-based scoring

- **Haptic Feedback** - Enhanced touch interactions- ✅ Haptic feedback on interactions

- ✅ Dark mode support

### Admin Features

- **Player Management** - Add, edit, remove players### Admin Features

- **Match Management** - Create and manage matches- ✅ Player management (add, edit, delete)

- **Score Management** - Update player scores- ✅ Round management

- **Round Management** - Control game rounds- ✅ Match scheduling

- **User Management** - Manage user accounts- ✅ Score updates

- ✅ Database export/import

### Technical Features

- **Offline Support** - Local caching and sync## API Documentation

- **Error Handling** - Comprehensive error management

- **Retry Logic** - Automatic retry for failed requestsWhen backend is running, access API documentation at:

- **File Logging** - Detailed logging for debugging- Swagger UI: http://localhost:5000/docs

- **Connection Testing** - Network connectivity checks- ReDoc: http://localhost:5000/redoc

- **Type Safety** - Full TypeScript implementation

## Development

## 🛠️ Technology Stack

### Backend Development

### Frontend

- **React Native** - Cross-platform mobile framework```bash

- **Expo** (~54.0.22) - Development platformcd backend

- **Expo Router** (~6.0.14) - File-based navigationuvicorn main:app --reload --host 0.0.0.0 --port 5000

- **TypeScript** - Type-safe development```

- **React Context** - State management

- **expo-haptics** - Haptic feedbackLogs are printed to console with detailed information about:

- API requests/responses

### Backend- Database operations

- **FastAPI** - Modern Python web framework- Authentication events

- **SQLAlchemy** - ORM for database operations- Errors with tracebacks

- **SQLite** - Local database (production: PostgreSQL recommended)

- **JWT** - Authentication tokens### Frontend Development

- **Pydantic** - Data validation

- **uvicorn** - ASGI server```bash

npx expo start

## 📱 App Navigation```



```- Hot reload enabled by default

┌─────────────────────────────────────┐- Use Expo Go app for testing on physical device

│         Authentication              │- Use Android Studio/Xcode for emulator testing

│         (LoginScreen)               │

└─────────────┬───────────────────────┘## Technologies

              │

              ▼### Backend

┌─────────────────────────────────────┐- **FastAPI**: Modern Python web framework

│         Tab Navigation              │- **SQLAlchemy**: SQL ORM

├─────────────────────────────────────┤- **SQLite**: Database

│ 🏠 Home      - Dashboard            │- **Uvicorn**: ASGI server

│ 🔍 Explore   - Team Selection       │- **Bcrypt**: Password hashing

│ ⚽ My Team   - Team Management       │

│ 🏆 Leaderboard - Rankings           │### Frontend

│ ⚙️  Admin    - Admin Panel          │- **React Native**: Mobile framework

│ ⚙️  Settings - User Settings        │- **Expo**: Development platform

└─────────────────────────────────────┘- **TypeScript**: Type safety

```- **Expo Router**: File-based routing

- **React Context**: State management

## 🔐 API Endpoints- **Expo Haptics**: Tactile feedback



### Authentication## Project Documentation

- `POST /signup` - Register new user

- `POST /login` - User login- `backend/README.md` - Backend API documentation

- `GET /users/me` - Get current user- `HAPTIC_FEEDBACK.md` - Haptic feedback implementation guide



### Players## Troubleshooting

- `GET /players` - Get all players

- `GET /players/{id}` - Get player details### Backend Issues

- `POST /players` - Create player (admin)

- `PUT /players/{id}` - Update player (admin)**Port already in use:**

- `DELETE /players/{id}` - Delete player (admin)```bash

# Change port in startup script or run:

### Teamsuvicorn main:app --reload --host 0.0.0.0 --port 5001

- `GET /teams` - Get all teams```

- `GET /teams/{id}` - Get team details

- `POST /teams` - Create team**Database locked:**

- `PUT /teams/{id}` - Update team- Stop all backend processes

- Delete `backend/fantasy_competition.db`

### Matches & Scoring- Restart backend (database will be recreated)

- `GET /matches` - Get all matches

- `POST /matches` - Create match (admin)### Frontend Issues

- `PUT /matches/{id}/scores` - Update scores (admin)

**Cannot connect to backend:**

See `backend/README.md` for complete API documentation.1. Verify backend is running

2. Check firewall settings

## 🎨 Theme System3. Ensure server URL in app settings is correct

4. Make sure device and computer are on same network

The app supports automatic light/dark mode based on system preferences:

**Metro bundler issues:**

```typescript```bash

// Light Themenpx expo start -c  # Clear cache

const light = {```

  text: '#11181C',

  background: '#fff',## License

  tint: '#0a7ea4',

  icon: '#687076',Private project for personal use.

  tabIconDefault: '#687076',
  tabIconSelected: '#0a7ea4'
};

// Dark Theme
const dark = {
  text: '#ECEDEE',
  background: '#151718',
  tint: '#fff',
  icon: '#9BA1A6',
  tabIconDefault: '#9BA1A6',
  tabIconSelected: '#fff'
};
```

## 🔧 Configuration

### Server Configuration
Update `src/utils/serverConfig.ts`:
```typescript
export const SERVER_CONFIG = {
  baseURL: 'http://192.168.1.100:5000', // Your server IP
  timeout: 10000,
  retryAttempts: 3
};
```

### Environment Variables
Create `.env` file in backend:
```
DATABASE_URL=sqlite:///./fantasy_competition.db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## 🧪 Testing

```bash
# Frontend - Run Expo in test mode
npm test

# Backend - Run pytest
cd backend
pytest
```

## 📝 Development Guidelines

### Code Organization
- **Navigation files** go in `app/` - Keep lightweight
- **Implementation code** goes in `src/` - All logic here
- **Backend code** in `backend/` - Isolated Python environment

### Import Convention
```typescript
// Use @/src prefix for src imports
import { ThemedText } from '@/src/components-shared/themed-text';
import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { Colors } from '@/src/constants/theme';

// App navigation imports
import { Tabs } from 'expo-router';
```

### Adding New Screens
1. Create component in `src/screens/MyScreen.tsx`
2. Export from screen component
3. Import in `app/(tabs)/myroute.tsx`
4. Add navigation route

### Adding New Features
1. Create types in `src/types/index.ts`
2. Add API calls in `src/services/api.ts`
3. Create context if needed in `src/context/`
4. Build screen in `src/screens/`
5. Add navigation route in `app/`

## 🐛 Troubleshooting

### "Cannot find module" errors
These are usually TypeScript cache issues:
1. Clear cache: `rm -rf .expo node_modules/.cache`
2. Reinstall: `npm install`
3. Reload VS Code

### Backend connection issues
1. Check server is running: `http://localhost:5000`
2. Verify IP in `serverConfig.ts` matches your machine
3. Check firewall allows port 5000
4. Use `connectionTester.ts` utility

### Expo app crashes
1. Clear Expo cache: `npx expo start -c`
2. Check error logs in terminal
3. Verify all dependencies installed
4. Check `fileLogger.ts` for detailed logs

## 📚 Additional Documentation

- **Backend API**: See `backend/README.md`
- **Frontend Organization**: See `FRONTEND_ORGANIZATION.md`
- **Backend Migration**: See `BACKEND_MIGRATION.md` (if exists)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- React Native community
- Expo team
- FastAPI contributors

---

**Built with ❤️ using React Native + FastAPI**

For questions or support, please open an issue on GitHub.
