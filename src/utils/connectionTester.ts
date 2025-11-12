/**
 * Connection Test Utility
 * Simple script to test backend connection from different environments
 */

import { ServerConfig } from './serverConfig';

export class ConnectionTester {
  /**
   * Test connection to backend server
   */
  static async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    const serverUrl = ServerConfig.getServerUrl();
    console.log('🧪 [CONNECTION TEST] Starting connection test...');
    console.log('🌐 [CONNECTION TEST] Server URL:', serverUrl);

    // Test 1: Root endpoint
    console.log('\n📝 [TEST 1] Testing root endpoint...');
    const test1 = await this.testEndpoint(`${serverUrl}/`);
    
    // Test 2: Health endpoint
    console.log('\n📝 [TEST 2] Testing health endpoint...');
    const test2 = await this.testEndpoint(`${serverUrl}/health`);
    
    // Test 3: API players endpoint
    console.log('\n📝 [TEST 3] Testing API players endpoint...');
    const test3 = await this.testEndpoint(`${serverUrl}/api/players`);

    // Summary
    console.log('\n📊 [CONNECTION TEST] Summary:');
    console.log('Root endpoint:', test1.success ? '✅ Pass' : '❌ Fail');
    console.log('Health endpoint:', test2.success ? '✅ Pass' : '❌ Fail');
    console.log('Players endpoint:', test3.success ? '✅ Pass' : '❌ Fail');

    if (test1.success && test2.success) {
      return {
        success: true,
        message: 'Backend connection successful! All tests passed.',
        details: {
          root: test1,
          health: test2,
          players: test3,
        },
      };
    } else if (test1.success) {
      return {
        success: false,
        message: 'Backend reachable but some endpoints failed. Check backend logs.',
        details: {
          root: test1,
          health: test2,
          players: test3,
        },
      };
    } else {
      return {
        success: false,
        message: `Cannot connect to backend at ${serverUrl}. Check:\n• Backend is running\n• Server URL is correct\n• Both devices on same network`,
        details: {
          root: test1,
          health: test2,
          players: test3,
        },
      };
    }
  }

  /**
   * Test a specific endpoint
   */
  private static async testEndpoint(
    url: string
  ): Promise<{ success: boolean; message: string; data?: any; error?: string }> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 [TEST] Fetching: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ [TEST] Success (${responseTime}ms):`, data);
        return {
          success: true,
          message: `Connected in ${responseTime}ms`,
          data,
        };
      } else {
        console.error(`❌ [TEST] HTTP ${response.status}:`, response.statusText);
        return {
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
          error: `Server returned status ${response.status}`,
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ [TEST] Failed (${responseTime}ms):`, error);

      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'Request timed out after 10 seconds',
          error: 'Timeout - server not responding',
        };
      }

      if (error.message?.includes('Network request failed') || 
          error.message?.includes('Failed to fetch')) {
        return {
          success: false,
          message: 'Network error - cannot reach server',
          error: 'Check server URL and network connection',
        };
      }

      return {
        success: false,
        message: 'Connection failed',
        error: error.message || String(error),
      };
    }
  }

  /**
   * Get diagnostic information
   */
  static getDiagnostics(): {
    serverUrl: string;
    defaultUrl: string;
    platform: string;
  } {
    return {
      serverUrl: ServerConfig.getServerUrl(),
      defaultUrl: ServerConfig.getDefaultServerUrl(),
      platform: 'React Native', // You can enhance this with Platform.OS
    };
  }

  /**
   * Suggest server URL based on platform
   */
  static suggestServerUrl(): {
    suggestions: string[];
    note: string;
  } {
    return {
      suggestions: [
        'http://localhost:5000',
        'http://10.0.2.2:5000 (Android Emulator)',
        'http://YOUR_IP:5000 (Replace YOUR_IP with your computer IP)',
      ],
      note: 'Use ipconfig (Windows) or ifconfig (Mac/Linux) to find your IP address',
    };
  }
}
