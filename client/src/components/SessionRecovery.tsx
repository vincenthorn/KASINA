import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../lib/stores/useAuth';

/**
 * SessionRecovery - Automatically attempts to recover unsaved meditation sessions
 * This component silently works in the background to recover any sessions
 * that failed to save due to network issues or other errors.
 */
const SessionRecovery: React.FC = () => {
  const [isRecovering, setIsRecovering] = useState(false);
  const { email, isAuthenticated } = useAuth();
  
  // Check for and attempt to recover unsaved sessions
  useEffect(() => {
    // Only run recovery if the user is authenticated
    if (!isAuthenticated || !email) return;
    
    const checkForUnsavedSessions = async () => {
      try {
        // Check if we have a pending session in localStorage
        const backupStatus = localStorage.getItem('sessionBackupStatus');
        const backupData = localStorage.getItem('lastSessionBackup');
        
        if (backupStatus === 'pending' && backupData) {
          console.log("🔄 Found unsaved session backup, attempting recovery");
          setIsRecovering(true);
          
          // Parse the backup data
          const sessionData = JSON.parse(backupData);
          
          // Ensure the session has the current user's email
          sessionData.userEmail = email;
          
          console.log("🔄 Recovering session:", sessionData);
          
          // Make API call to save the recovered session
          const response = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...sessionData,
              _recoveredSession: true,
              _critical: true,
              _guaranteedSession: true
            })
          });
          
          if (response.ok) {
            console.log("✅ Session recovery successful");
            toast.success("A previous meditation session was recovered", {
              id: "session-recovery-success"
            });
            
            // Update the backup status
            localStorage.setItem('sessionBackupStatus', 'recovered');
            
            // Trigger session list refresh
            window.dispatchEvent(new Event('session-saved'));
          } else {
            throw new Error(`Failed to recover session: ${response.status}`);
          }
        }
      } catch (error) {
        console.error("❌ Session recovery failed:", error);
        // We don't show an error toast to avoid confusion
        // The backup will remain in localStorage for next attempt
      } finally {
        setIsRecovering(false);
      }
    };
    
    // Wait a bit after page load before checking for recovery
    // This allows the app to fully initialize first
    const timer = setTimeout(() => {
      checkForUnsavedSessions();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [email, isAuthenticated]);
  
  // This component doesn't render anything visible
  return null;
};

export default SessionRecovery;