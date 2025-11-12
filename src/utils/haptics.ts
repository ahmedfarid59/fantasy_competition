import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptic feedback types for different interactions
 */
export enum HapticFeedback {
  // Light impacts
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
  
  // Selection feedback
  SELECTION = 'selection',
  
  // Notification feedback
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  
  // Custom patterns
  TAP = 'tap',
  LONG_PRESS = 'long_press',
  SWIPE = 'swipe',
}

class HapticManager {
  private enabled: boolean = true;

  /**
   * Trigger haptic feedback
   */
  async trigger(feedback: HapticFeedback): Promise<void> {
    if (!this.enabled || Platform.OS === 'web') {
      return;
    }

    try {
      switch (feedback) {
        case HapticFeedback.LIGHT:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        
        case HapticFeedback.MEDIUM:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        
        case HapticFeedback.HEAVY:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        
        case HapticFeedback.SELECTION:
          await Haptics.selectionAsync();
          break;
        
        case HapticFeedback.SUCCESS:
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        
        case HapticFeedback.WARNING:
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        
        case HapticFeedback.ERROR:
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        
        case HapticFeedback.TAP:
          // Quick light tap
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        
        case HapticFeedback.LONG_PRESS:
          // Medium impact for long press
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        
        case HapticFeedback.SWIPE:
          // Selection for swipe gestures
          await Haptics.selectionAsync();
          break;
        
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.warn('⚠️ [HAPTIC] Failed to trigger haptic feedback:', error);
    }
  }

  /**
   * Enable or disable haptic feedback
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`📳 [HAPTIC] Haptics ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if haptics are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Trigger success feedback (convenience method)
   */
  async success(): Promise<void> {
    await this.trigger(HapticFeedback.SUCCESS);
  }

  /**
   * Trigger error feedback (convenience method)
   */
  async error(): Promise<void> {
    await this.trigger(HapticFeedback.ERROR);
  }

  /**
   * Trigger warning feedback (convenience method)
   */
  async warning(): Promise<void> {
    await this.trigger(HapticFeedback.WARNING);
  }

  /**
   * Trigger selection feedback (convenience method)
   */
  async selection(): Promise<void> {
    await this.trigger(HapticFeedback.SELECTION);
  }

  /**
   * Trigger light impact (convenience method)
   */
  async light(): Promise<void> {
    await this.trigger(HapticFeedback.LIGHT);
  }

  /**
   * Trigger medium impact (convenience method)
   */
  async medium(): Promise<void> {
    await this.trigger(HapticFeedback.MEDIUM);
  }

  /**
   * Trigger heavy impact (convenience method)
   */
  async heavy(): Promise<void> {
    await this.trigger(HapticFeedback.HEAVY);
  }
}

// Export singleton instance
export const hapticManager = new HapticManager();

// Convenience functions for common haptic patterns
export const haptic = {
  // Basic impacts
  light: () => hapticManager.light(),
  medium: () => hapticManager.medium(),
  heavy: () => hapticManager.heavy(),
  
  // Notifications
  success: () => hapticManager.success(),
  error: () => hapticManager.error(),
  warning: () => hapticManager.warning(),
  
  // Selections
  selection: () => hapticManager.selection(),
  
  // Interaction patterns
  tap: () => hapticManager.trigger(HapticFeedback.TAP),
  longPress: () => hapticManager.trigger(HapticFeedback.LONG_PRESS),
  swipe: () => hapticManager.trigger(HapticFeedback.SWIPE),
  
  // Settings
  setEnabled: (enabled: boolean) => hapticManager.setEnabled(enabled),
  isEnabled: () => hapticManager.isEnabled(),
};

// Export default for convenient importing
export default haptic;
