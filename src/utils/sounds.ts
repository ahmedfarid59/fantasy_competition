import { Audio } from 'expo-av';

// Sound effect types
export enum SoundEffect {
  SUCCESS = 'success',
  ERROR = 'error',
  CLICK = 'click',
  NOTIFICATION = 'notification',
  SWIPE = 'swipe',
  CELEBRATION = 'celebration',
  WARNING = 'warning',
  LOGIN = 'login',
  LOGOUT = 'logout',
  SAVE = 'save',
  DELETE = 'delete',
  TRANSFER = 'transfer',
}

class SoundManager {
  private sounds: Map<SoundEffect, Audio.Sound> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    this.initializeSounds();
  }

  private async initializeSounds() {
    try {
      // Set audio mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      console.log('🔊 [SOUND] Sound manager initialized');
    } catch (error) {
      console.error('❌ [SOUND] Failed to initialize audio:', error);
    }
  }

  // Load a sound from a URI or local asset
  private async loadSound(soundEffect: SoundEffect, uri: string): Promise<void> {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false, volume: this.volume }
      );
      this.sounds.set(soundEffect, sound);
      console.log(`✅ [SOUND] Loaded ${soundEffect}`);
    } catch (error) {
      console.error(`❌ [SOUND] Failed to load ${soundEffect}:`, error);
    }
  }

  // Use web-based sound effects (hosted URLs) since we don't have local audio files
  async preloadSounds() {
    // Using free sound effect URLs from various sources
    // In production, you'd want to host these yourself or use local assets
    const soundUrls: Record<SoundEffect, string> = {
      [SoundEffect.SUCCESS]: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
      [SoundEffect.ERROR]: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3',
      [SoundEffect.CLICK]: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
      [SoundEffect.NOTIFICATION]: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
      [SoundEffect.SWIPE]: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
      [SoundEffect.CELEBRATION]: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
      [SoundEffect.WARNING]: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
      [SoundEffect.LOGIN]: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
      [SoundEffect.LOGOUT]: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
      [SoundEffect.SAVE]: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
      [SoundEffect.DELETE]: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
      [SoundEffect.TRANSFER]: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
    };

    // Load sounds in parallel
    const loadPromises = Object.entries(soundUrls).map(([effect, url]) =>
      this.loadSound(effect as SoundEffect, url).catch(err =>
        console.warn(`⚠️ [SOUND] Could not preload ${effect}:`, err)
      )
    );

    await Promise.all(loadPromises);
    console.log('✅ [SOUND] All sounds preloaded');
  }

  // Play a sound effect
  async play(soundEffect: SoundEffect) {
    if (!this.enabled) {
      return;
    }

    try {
      const sound = this.sounds.get(soundEffect);
      if (sound) {
        // Reset to beginning and play
        await sound.setPositionAsync(0);
        await sound.playAsync();
        console.log(`🔊 [SOUND] Playing ${soundEffect}`);
      } else {
        console.warn(`⚠️ [SOUND] Sound ${soundEffect} not loaded`);
      }
    } catch (error) {
      console.error(`❌ [SOUND] Failed to play ${soundEffect}:`, error);
    }
  }

  // Enable/disable sounds
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    console.log(`🔊 [SOUND] Sounds ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Set volume (0.0 to 1.0)
  async setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    
    // Update volume for all loaded sounds
    const promises = Array.from(this.sounds.values()).map(sound =>
      sound.setVolumeAsync(this.volume)
    );
    
    await Promise.all(promises);
    console.log(`🔊 [SOUND] Volume set to ${this.volume}`);
  }

  // Get current volume
  getVolume(): number {
    return this.volume;
  }

  // Check if sounds are enabled
  isEnabled(): boolean {
    return this.enabled;
  }

  // Unload all sounds
  async unloadAll() {
    const promises = Array.from(this.sounds.values()).map(sound =>
      sound.unloadAsync()
    );
    await Promise.all(promises);
    this.sounds.clear();
    console.log('🔇 [SOUND] All sounds unloaded');
  }
}

// Export singleton instance
export const soundManager = new SoundManager();

// Convenience functions
export const playSound = (effect: SoundEffect) => soundManager.play(effect);
export const enableSounds = (enabled: boolean) => soundManager.setEnabled(enabled);
export const setSoundVolume = (volume: number) => soundManager.setVolume(volume);
export const preloadSounds = () => soundManager.preloadSounds();
export const isSoundEnabled = () => soundManager.isEnabled();
export const getSoundVolume = () => soundManager.getVolume();
