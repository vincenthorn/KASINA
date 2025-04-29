/**
 * Global Notification Manager
 * 
 * This utility prevents duplicate toast notifications by tracking
 * when notifications are shown and enforcing a cooldown period.
 */

// Store recent notifications with timestamp
const recentNotifications = new Map<string, number>();

// Cooldown period in milliseconds (default: 3000ms = 3 seconds)
const NOTIFICATION_COOLDOWN = 3000;

/**
 * Checks if a notification with the given key was recently shown
 * and is still within the cooldown period
 * 
 * @param key Unique identifier for the notification
 * @returns boolean indicating if notification is in cooldown
 */
export function isInCooldown(key: string): boolean {
  const lastShown = recentNotifications.get(key);
  if (!lastShown) return false;
  
  const now = Date.now();
  return (now - lastShown) < NOTIFICATION_COOLDOWN;
}

/**
 * Records that a notification was shown, starting its cooldown period
 * 
 * @param key Unique identifier for the notification
 */
export function markAsShown(key: string): void {
  recentNotifications.set(key, Date.now());
}

/**
 * Combine check and mark in one function for convenience
 * Returns true if the notification should be shown (not in cooldown)
 * 
 * @param key Unique identifier for the notification 
 * @returns boolean indicating if notification should be shown
 */
export function shouldShowNotification(key: string): boolean {
  if (isInCooldown(key)) {
    console.log(`🔔 DUPLICATE NOTIFICATION PREVENTED: "${key}" is in cooldown`);
    return false;
  }
  
  markAsShown(key);
  return true;
}

/**
 * Clear all notification cooldowns
 */
export function clearAllCooldowns(): void {
  recentNotifications.clear();
}

// Make the notification manager available globally
if (typeof window !== 'undefined') {
  // Initialize global notification tracker if it doesn't exist
  if (!(window as any).__KASINA_NOTIFICATIONS) {
    (window as any).__KASINA_NOTIFICATIONS = recentNotifications;
  }
}

export default {
  isInCooldown,
  markAsShown,
  shouldShowNotification,
  clearAllCooldowns
};