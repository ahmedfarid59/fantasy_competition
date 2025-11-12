// API Service for Fantasy Competition App
// This connects to the FastAPI backend
import { ServerConfig } from '../utils/serverConfig';

// Server URL is now configurable through the Settings screen!
// The default is http://10.40.47.201:5000
// Users can change it without rebuilding the app.

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  errors?: string[];
}

export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  statusCode?: number;
  errors?: string[];
}

class ApiService {
  private currentUserId: string | null = null;
  private onAuthenticationFailure?: () => void;

  setCurrentUser(userId: string | null) {
    this.currentUserId = userId;
    console.log(`👤 [API] Current user set to: ${userId}`);
  }

  setAuthenticationFailureHandler(handler: () => void) {
    this.onAuthenticationFailure = handler;
    console.log(`🔐 [API] Authentication failure handler registered`);
  }

  private getBaseUrl(): string {
    const serverUrl = ServerConfig.getServerUrl();
    return `${serverUrl}/api`;
  }

  private categorizeError(statusCode: number): ErrorType {
    if (statusCode === 401) return ErrorType.AUTHENTICATION;
    if (statusCode === 403) return ErrorType.AUTHORIZATION;
    if (statusCode === 404) return ErrorType.NOT_FOUND;
    if (statusCode === 422) return ErrorType.VALIDATION;
    if (statusCode >= 500) return ErrorType.SERVER;
    return ErrorType.UNKNOWN;
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const fullUrl = `${this.getBaseUrl()}${endpoint}`;
    const startTime = Date.now();
    
    console.log('🌐 [API] REQUEST START:', {
      method: options.method || 'GET',
      endpoint,
      url: fullUrl,
      timestamp: new Date().toISOString(),
      hasBody: !!options.body,
      bodyPreview: options.body ? JSON.stringify(options.body).substring(0, 200) : undefined,
    });
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };
      
      // Add user ID header for admin verification
      if (this.currentUserId) {
        headers['X-User-Id'] = this.currentUserId;
        console.log('👤 [API] User ID header:', this.currentUserId);
      }
      
      // Create AbortController for timeout (React Native compatible)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('⏱️ [API] Request timeout triggered after 10s');
        controller.abort();
      }, 10000); // 10 second timeout
      
      let response;
      try {
        console.log('📤 [API] Sending request...');
        response = await fetch(fullUrl, {
          ...options,
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        const duration = Date.now() - startTime;
        console.log('📥 [API] Response received:', {
          status: response.status,
          statusText: response.statusText,
          duration: `${duration}ms`,
          ok: response.ok,
        });
      } catch (fetchError) {
        clearTimeout(timeoutId); // Clean up timeout on error
        const duration = Date.now() - startTime;
        console.error('❌ [API] Fetch failed:', {
          error: fetchError instanceof Error ? fetchError.message : fetchError,
          duration: `${duration}ms`,
        });
        throw fetchError;
      }

      let data: any;
      try {
        const responseText = await response.text();
        console.log('📄 [API] Response text length:', responseText.length);
        
        if (responseText) {
          data = JSON.parse(responseText);
          console.log('📄 [API] Parsed response:', {
            hasData: !!data,
            dataType: typeof data,
            isArray: Array.isArray(data),
            dataPreview: JSON.stringify(data).substring(0, 200),
          });
        }
      } catch (parseError) {
        console.error('❌ [API] Failed to parse response:', {
          error: parseError instanceof Error ? parseError.message : parseError,
          status: response.status,
        });
        return {
          success: false,
          error: 'Invalid response from server',
          statusCode: response.status,
        };
      }

      if (!response.ok) {
        const errorType = this.categorizeError(response.status);
        console.error('❌ [API] HTTP ERROR:', {
          status: response.status,
          statusText: response.statusText,
          errorType,
          data,
          detail: data.detail || data.message,
          errors: data.errors,
        });
        
        // Handle authentication failure (401)
        if (response.status === 401) {
          console.error('🔐 [API] Authentication failure detected - user not authenticated');
          if (this.onAuthenticationFailure) {
            console.log('🔐 [API] Triggering authentication failure handler (logout)');
            // Use setTimeout to avoid blocking the current API call
            setTimeout(() => {
              this.onAuthenticationFailure?.();
            }, 100);
          }
        }
        
        // Handle authorization failure (403) - user exists but lacks permission
        if (response.status === 403) {
          console.error('🚫 [API] Authorization failure - user lacks permission');
        }
        
        // Extract error message
        let errorMessage = data.detail || data.message || `Server error (${response.status})`;
        
        // Handle validation errors with multiple messages
        const errors = data.errors || [];
        if (errors.length > 0) {
          errorMessage = errors.join(', ');
        }
        
        return {
          success: false,
          error: errorMessage,
          statusCode: response.status,
          errors: errors.length > 0 ? errors : undefined,
        };
      }

      const duration = Date.now() - startTime;
      console.log('✅ [API] REQUEST SUCCESS:', {
        endpoint,
        duration: `${duration}ms`,
        hasData: !!data,
      });
      
      // Update activity after successful API call (except for activity endpoint itself)
      if (this.currentUserId && !endpoint.includes('/auth/activity')) {
        this.updateActivity(this.currentUserId).catch(err => 
          console.error('Failed to update activity:', err)
        );
      }
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] NETWORK ERROR:', {
        endpoint,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Handle different error types
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          console.error('⏱️ [API] Request timed out after 30 seconds');
          return {
            success: false,
            error: 'Request timed out. Please check your connection and try again.',
          };
        }
        
        if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
          console.error('🔌 [API] Network connection failed - cannot reach server');
          return {
            success: false,
            error: 'Cannot connect to server. Please check your connection and server settings.',
          };
        }
        
        return {
          success: false,
          error: `Network Error: ${error.message}`,
        };
      }
      
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      };
    }
  }

  // Update user activity (called automatically after each API request)
  private async updateActivity(userId: string): Promise<void> {
    try {
      await fetch(`${this.getBaseUrl()}/auth/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch (error) {
      // Silent fail - activity tracking is not critical
    }
  }

  // Check connection to backend server
  async checkConnection(): Promise<ApiResponse<{ status: string; message: string }>> {
    const serverUrl = ServerConfig.getServerUrl();
    console.log('🔌 [API] Testing connection to backend...');
    console.log(`🌐 [API] Backend URL: ${serverUrl}`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(`${serverUrl}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ [API] Connection successful! Response time: ${responseTime}ms`);
        return {
          success: true,
          data: {
            status: 'connected',
            message: `Connected to backend (${responseTime}ms)`,
          },
        };
      } else {
        console.error(`❌ [API] Connection failed with status: ${response.status}`);
        return {
          success: false,
          error: `Server responded with status ${response.status}`,
        };
      }
    } catch (error) {
      console.error('❌ [API] Connection failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cannot reach backend server',
      };
    }
  }

  // Get all available players
  async getPlayers() {
    console.log('📊 [API] Fetching all players');
    return this.fetch('/players', {
      method: 'GET',
    });
  }

  // Get current round information
  async getRounds() {
    console.log('📅 [API] Fetching all rounds');
    return this.fetch('/rounds', {
      method: 'GET',
    });
  }

  // Get current active round
  async getCurrentRound() {
    console.log('📅 [API] Fetching current round');
    return this.fetch('/rounds/current', {
      method: 'GET',
    });
  }

  // Get qualified players for a specific round
  async getQualifiedPlayers(round: number) {
    console.log(`📊 [API] Fetching qualified players for round ${round}`);
    return this.fetch(`/players/${round}`, {
      method: 'GET',
    });
  }

  // Submit team selection
  async submitTeam(teamData: {
    userId: string;
    round: number;
    selectedPlayers: number[];
    captainId?: number;
  }) {
    console.log(`💾 [API] Submitting team for user ${teamData.userId}, round ${teamData.round}`);
    console.log(`📋 [API] Players:`, teamData.selectedPlayers);
    console.log(`⭐ [API] Captain:`, teamData.captainId || 'None');
    return this.fetch('/team', {
      method: 'POST',
      body: JSON.stringify(teamData),
    });
  }

  // Apply a transfer
  async applyTransfer(transferData: {
    userId: string;
    round: number;
    playerId: number;
    action: 'add' | 'remove';
  }) {
    console.log(`🔄 [API] Applying transfer: ${transferData.action} player ${transferData.playerId}`);
    return this.fetch('/transfer', {
      method: 'POST',
      body: JSON.stringify(transferData),
    });
  }

  // Get leaderboard
  async getLeaderboard(round?: number) {
    console.log(`🏆 [API] Fetching leaderboard${round ? ` for round ${round}` : ''}`);
    const endpoint = round ? `/leaderboard?round_number=${round}` : '/leaderboard';
    return this.fetch(endpoint, {
      method: 'GET',
    });
  }

  // Get user's team for a specific round
  async getUserTeam(userId: string, round: number) {
    console.log(`📂 [API] Fetching team for user ${userId}, round ${round}`);
    return this.fetch(`/team/${userId}/${round}`, {
      method: 'GET',
    });
  }

  // Update player scores (admin only)
  async updatePlayerScores(scoresData: {
    round: number;
    scores: Array<{ playerId: number; points: number }>;
  }) {
    console.log(`👑 [API] Updating scores for round ${scoresData.round}`);
    console.log(`📊 [API] Updating ${scoresData.scores.length} player scores`);
    return this.fetch('/admin/update-scores', {
      method: 'POST',
      body: JSON.stringify(scoresData),
    });
  }

  // Get points configuration
  async getPointsConfig() {
    console.log('⚙️ [API] Fetching points configuration');
    return this.fetch('/config/points', {
      method: 'GET',
    });
  }

  // Get detailed leaderboard with round-by-round standings
  async getDetailedLeaderboard() {
    console.log('📊 [API] Fetching detailed leaderboard');
    return this.fetch('/leaderboard/detailed', {
      method: 'GET',
    });
  }

  // Round Management (Admin only)
  async createRound(roundData: {
    round: number;
    deadline: string;
    team_size: number;
    budget?: number | null;
    free_transfers?: number;
    transfer_penalty?: number;
  }) {
    console.log(`👑 [API] Creating round ${roundData.round}`);
    return this.fetch('/admin/rounds', {
      method: 'POST',
      body: JSON.stringify(roundData),
    });
  }

  async updateRound(roundNumber: number, roundData: {
    deadline?: string;
    team_size?: number;
    budget?: number | null;
    free_transfers?: number;
    transfer_penalty?: number;
  }) {
    console.log(`👑 [API] Updating round ${roundNumber}`);
    return this.fetch(`/admin/rounds/${roundNumber}`, {
      method: 'PUT',
      body: JSON.stringify(roundData),
    });
  }

  async deleteRound(roundNumber: number) {
    console.log(`👑 [API] Deleting round ${roundNumber}`);
    return this.fetch(`/admin/rounds/${roundNumber}`, {
      method: 'DELETE',
    });
  }

  async closeRound(roundNumber: number) {
    console.log(`🔒 [API] Closing round ${roundNumber}`);
    return this.fetch(`/admin/rounds/${roundNumber}/close`, {
      method: 'POST',
    });
  }

  // Download database backup
  async downloadDatabaseBackup(): Promise<ApiResponse<string>> {
    console.log('💾 [API] Downloading database backup...');
    
    try {
      const fullUrl = `${this.getBaseUrl()}/admin/backup/database`;
      
      const headers: Record<string, string> = {};
      
      // Add user ID header for admin verification
      if (this.currentUserId) {
        headers['X-User-Id'] = this.currentUserId;
      }
      
      const response = await fetch(fullUrl, { headers });

      if (!response.ok) {
        console.error(`❌ [API] Error ${response.status}`);
        return {
          success: false,
          error: `Failed to download backup (${response.status})`,
        };
      }

      // Get the blob
      const blob = await response.blob();
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'fantasy_competition_backup.db';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      console.log(`✅ [API] Database backup downloaded: ${filename}`);
      
      // Return the blob URL and filename
      const blobUrl = URL.createObjectURL(blob);
      return {
        success: true,
        data: JSON.stringify({ url: blobUrl, filename }),
      };
    } catch (error) {
      console.error('❌ [API] Network error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  // Upload database backup to restore
  async uploadDatabaseBackup(fileUri: string): Promise<ApiResponse<any>> {
    console.log('📤 [API] Uploading database backup...');
    
    try {
      const fullUrl = `${this.getBaseUrl()}/admin/backup/upload`;
      
      // Create form data
      const formData = new FormData();
      
      // Add the file to form data
      // @ts-ignore - React Native FormData handles file URIs
      formData.append('file', {
        uri: fileUri,
        type: 'application/octet-stream',
        name: 'database.db',
      });

      const headers: Record<string, string> = {
        // Don't set Content-Type - let fetch set it with boundary
      };
      
      // Add user ID header for admin verification
      if (this.currentUserId) {
        headers['X-User-Id'] = this.currentUserId;
      }

      const response = await fetch(fullUrl, {
        method: 'POST',
        body: formData,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`❌ [API] Error ${response.status}:`, data);
        return {
          success: false,
          error: data.detail || `Upload failed (${response.status})`,
        };
      }

      console.log('✅ [API] Database backup uploaded successfully');
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('❌ [API] Network error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  // ==================== MATCHES API ====================
  
  // Get all matches for a specific round
  async getMatches(roundNumber: number): Promise<ApiResponse<any[]>> {
    return this.fetch<any[]>(`/matches/${roundNumber}`);
  }

  // Admin: Create a new match
  async createMatch(matchData: {
    round: number;
    player1Id: number;
    player2Id: number;
    matchOrder?: number;
  }): Promise<ApiResponse<any>> {
    return this.fetch<any>('/admin/matches', {
      method: 'POST',
      body: JSON.stringify(matchData),
    });
  }

  // Admin: Update a match
  async updateMatch(matchId: number, matchData: {
    player1Id?: number;
    player2Id?: number;
    matchOrder?: number;
  }): Promise<ApiResponse<any>> {
    return this.fetch<any>(`/admin/matches/${matchId}`, {
      method: 'PUT',
      body: JSON.stringify(matchData),
    });
  }

  // Admin: Delete a match
  async deleteMatch(matchId: number): Promise<ApiResponse<any>> {
    return this.fetch<any>(`/admin/matches/${matchId}`, {
      method: 'DELETE',
    });
  }

  // ==================== PLAYER MANAGEMENT API ====================
  
  // Admin: Create a new player
  async createPlayer(playerData: {
    name: string;
    price: number;
    qualified: boolean;
    points?: number;
  }): Promise<ApiResponse<any>> {
    return this.fetch<any>('/admin/players', {
      method: 'POST',
      body: JSON.stringify(playerData),
    });
  }

  // Admin: Update a player
  async updatePlayer(playerId: number, playerData: {
    name?: string;
    price?: number;
    qualified?: boolean;
    points?: number;
  }): Promise<ApiResponse<any>> {
    return this.fetch<any>(`/admin/players/${playerId}`, {
      method: 'PUT',
      body: JSON.stringify(playerData),
    });
  }

  // Admin: Delete a player
  async deletePlayer(playerId: number): Promise<ApiResponse<any>> {
    return this.fetch<any>(`/admin/players/${playerId}`, {
      method: 'DELETE',
    });
  }

  // ==================== USER ACCOUNT MANAGEMENT ====================
  
  // Delete user's own account
  async deleteAccount(): Promise<ApiResponse<any>> {
    console.log('🗑️ [API] Deleting user account');
    return this.fetch<any>('/auth/account', {
      method: 'DELETE',
    });
  }

  // Get all users (for profile editing and admin transfer)
  async getAllUsers(): Promise<ApiResponse<any>> {
    console.log('👥 [API] Fetching all users');
    return this.fetch<any>('/auth/users', {
      method: 'GET',
    });
  }

  // Update user profile
  async updateProfile(data: {
    name?: string;
    email?: string;
    current_password?: string;
    new_password?: string;
  }): Promise<ApiResponse<any>> {
    console.log('✏️ [API] Updating user profile');
    return this.fetch<any>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Transfer admin rights
  async transferAdmin(targetUserId: string): Promise<ApiResponse<any>> {
    console.log('👑 [API] Transferring admin rights to:', targetUserId);
    return this.fetch<any>('/auth/transfer-admin', {
      method: 'POST',
      body: JSON.stringify({ target_user_id: targetUserId }),
    });
  }
}

export default new ApiService();
