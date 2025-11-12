import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL_KEY = '@fantasy_server_url';
const DEFAULT_SERVER_URL = 'http://10.40.47.201:5000';

export class ServerConfig {
  private static serverUrl: string = DEFAULT_SERVER_URL;

  static async loadServerUrl(): Promise<string> {
    try {
      const saved = await AsyncStorage.getItem(SERVER_URL_KEY);
      if (saved) {
        this.serverUrl = saved;
        console.log('🌐 [SERVER CONFIG] Loaded server URL:', saved);
      } else {
        console.log('🌐 [SERVER CONFIG] Using default server URL:', DEFAULT_SERVER_URL);
      }
    } catch (error) {
      console.error('❌ [SERVER CONFIG] Error loading server URL:', error);
    }
    return this.serverUrl;
  }

  static async saveServerUrl(url: string): Promise<void> {
    try {
      await AsyncStorage.setItem(SERVER_URL_KEY, url);
      this.serverUrl = url;
      console.log('✅ [SERVER CONFIG] Server URL saved:', url);
    } catch (error) {
      console.error('❌ [SERVER CONFIG] Error saving server URL:', error);
      throw error;
    }
  }

  static getServerUrl(): string {
    return this.serverUrl;
  }

  static getDefaultServerUrl(): string {
    return DEFAULT_SERVER_URL;
  }
}
