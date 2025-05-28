import { KasinaType } from './types';
import { useSessionLogger } from './stores/useSessionLogger';

interface SessionData {
  kasinaType: KasinaType;
  startTime: number;
  lastUpdate: number;
  duration: number;
  sessionId: string;
}

const SESSION_STORAGE_KEY = 'kasina_active_session';
const SESSION_HISTORY_KEY = 'kasina_session_history';

export class SessionRecovery {
  private static instance: SessionRecovery;
  private currentSession: SessionData | null = null;
  private recoveryInterval: number | null = null;

  static getInstance(): SessionRecovery {
    if (!SessionRecovery.instance) {
      SessionRecovery.instance = new SessionRecovery();
    }
    return SessionRecovery.instance;
  }

  startSession(kasinaType: KasinaType): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    this.currentSession = {
      kasinaType,
      startTime: now,
      lastUpdate: now,
      duration: 0,
      sessionId
    };

    // Save to localStorage immediately
    this.saveToStorage();
    
    // Start periodic updates every 30 seconds
    this.startRecoveryTracking();

    console.log(`🛡️ Session recovery started for ${kasinaType} (${sessionId})`);
    return sessionId;
  }

  updateSession(duration: number): void {
    if (!this.currentSession) return;
    
    this.currentSession.duration = duration;
    this.currentSession.lastUpdate = Date.now();
    this.saveToStorage();
  }

  private startRecoveryTracking(): void {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
    }

    // Update localStorage every 30 seconds during active session
    this.recoveryInterval = window.setInterval(() => {
      if (this.currentSession) {
        const elapsed = Math.floor((Date.now() - this.currentSession.startTime) / 1000);
        this.updateSession(elapsed);
        console.log(`🔄 Session recovery checkpoint: ${elapsed}s elapsed`);
      }
    }, 30000);
  }

  async completeSession(finalDuration?: number): Promise<boolean> {
    if (!this.currentSession) return false;

    const sessionToSave = { ...this.currentSession };
    if (finalDuration) {
      sessionToSave.duration = finalDuration;
    }

    // Round down to nearest minute (same logic as regular breath sessions)
    const durationInMinutes = Math.floor(sessionToSave.duration / 60);
    const roundedDuration = durationInMinutes * 60;

    console.log(`💾 Completing session: ${sessionToSave.kasinaType} for ${sessionToSave.duration}s (rounded to ${durationInMinutes} minutes)`);

    // Only save if at least 1 minute of meditation
    if (durationInMinutes < 1) {
      console.log(`⏱️ Session too short (${sessionToSave.duration}s) - not saving via recovery`);
      this.clearSession();
      return true; // Consider this successful completion, just no saving needed
    }

    try {
      // Try to save the session with rounded duration
      const { logSession } = useSessionLogger.getState();
      const success = await logSession({
        kasinaType: sessionToSave.kasinaType,
        duration: roundedDuration,
        showToast: true
      });

      if (success) {
        this.clearSession();
        return true;
      } else {
        // If immediate save fails, store in recovery history
        this.storeForRetry(sessionToSave);
        return false;
      }
    } catch (error) {
      console.error('Session completion failed:', error);
      this.storeForRetry(sessionToSave);
      return false;
    }
  }

  private storeForRetry(session: SessionData): void {
    try {
      const existing = JSON.parse(localStorage.getItem(SESSION_HISTORY_KEY) || '[]');
      existing.push({
        ...session,
        failedAt: Date.now()
      });
      localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(existing));
      console.log(`📋 Session stored for retry: ${session.kasinaType} (${session.duration}s)`);
    } catch (error) {
      console.error('Failed to store session for retry:', error);
    }
  }

  async checkForRecovery(): Promise<void> {
    try {
      // First check for emergency checkpoints (from fullscreen exits)
      await this.checkEmergencyCheckpoints();
      
      // Check for active session recovery
      const activeSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (activeSession) {
        const session: SessionData = JSON.parse(activeSession);
        const timeSinceUpdate = Date.now() - session.lastUpdate;
        
        // If session was active within last 2 minutes, try to recover
        if (timeSinceUpdate < 120000) {
          const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
          const elapsedMinutes = Math.floor(elapsed / 60);
          console.log(`🔄 Recovering interrupted session: ${session.kasinaType} (${elapsed}s = ${elapsedMinutes} minutes)`);
          
          // Attempt to save the recovered session
          const success = await this.completeSession(elapsed);
          if (success) {
            console.log(`✅ Recovered session successfully saved`);
          }
        } else {
          console.log(`⚠️ Session too old to recover (${Math.floor(timeSinceUpdate / 1000)}s ago)`);
          this.clearSession();
        }
      }

      // Check for failed sessions to retry
      await this.retryFailedSessions();
    } catch (error) {
      console.error('Session recovery check failed:', error);
    }
  }

  private async checkEmergencyCheckpoints(): Promise<void> {
    try {
      const emergencyCheckpoint = localStorage.getItem('kasina_emergency_checkpoint');
      if (!emergencyCheckpoint) return;

      const checkpoint = JSON.parse(emergencyCheckpoint);
      const timeSinceCheckpoint = Date.now() - new Date(checkpoint.timestamp).getTime();
      
      // If checkpoint was created within last 5 minutes, try to recover
      if (timeSinceCheckpoint < 300000) {
        console.log(`🚨 Found emergency checkpoint from ${checkpoint.reason}: ${checkpoint.kasinaType} (${checkpoint.duration}s)`);
        
        // Try to save the emergency checkpoint session
        const { logSession } = useSessionLogger.getState();
        
        // Round down to nearest minute like regular sessions
        const durationInMinutes = Math.floor(checkpoint.duration / 60);
        if (durationInMinutes >= 1) {
          const success = await logSession({
            kasinaType: checkpoint.kasinaType,
            duration: durationInMinutes * 60,
            showToast: true
          });

          if (success) {
            console.log(`✅ Emergency checkpoint session recovered: ${durationInMinutes} minutes`);
            localStorage.removeItem('kasina_emergency_checkpoint');
          } else {
            console.log(`❌ Emergency checkpoint save failed - keeping for retry`);
          }
        } else {
          console.log(`⏱️ Emergency checkpoint too short (${checkpoint.duration}s) - discarding`);
          localStorage.removeItem('kasina_emergency_checkpoint');
        }
      } else {
        console.log(`⚠️ Emergency checkpoint too old (${Math.floor(timeSinceCheckpoint / 1000)}s ago) - discarding`);
        localStorage.removeItem('kasina_emergency_checkpoint');
      }
    } catch (error) {
      console.error('Emergency checkpoint recovery failed:', error);
    }
  }

  private async retryFailedSessions(): Promise<void> {
    try {
      const failedSessions = JSON.parse(localStorage.getItem(SESSION_HISTORY_KEY) || '[]');
      if (failedSessions.length === 0) return;

      console.log(`🔄 Attempting to retry ${failedSessions.length} failed sessions`);
      
      const { logSession } = useSessionLogger.getState();
      const stillFailed = [];

      for (const session of failedSessions) {
        try {
          const success = await logSession({
            kasinaType: session.kasinaType,
            duration: session.duration,
            showToast: false // Don't spam notifications during recovery
          });

          if (success) {
            console.log(`✅ Retried session saved: ${session.kasinaType} (${session.duration}s)`);
          } else {
            stillFailed.push(session);
          }
        } catch (error) {
          console.error(`Failed to retry session ${session.sessionId}:`, error);
          stillFailed.push(session);
        }
      }

      // Update storage with only the sessions that still failed
      localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(stillFailed));
      
      if (stillFailed.length < failedSessions.length) {
        console.log(`✅ Successfully recovered ${failedSessions.length - stillFailed.length} failed sessions`);
      }
    } catch (error) {
      console.error('Failed session retry failed:', error);
    }
  }

  clearSession(): void {
    this.currentSession = null;
    localStorage.removeItem(SESSION_STORAGE_KEY);
    
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = null;
    }
    
    console.log(`🧹 Session recovery cleared`);
  }

  private saveToStorage(): void {
    if (this.currentSession) {
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.currentSession));
      } catch (error) {
        console.error('Failed to save session to storage:', error);
      }
    }
  }

  getCurrentSession(): SessionData | null {
    return this.currentSession;
  }
}

// Export singleton instance
export const sessionRecovery = SessionRecovery.getInstance();