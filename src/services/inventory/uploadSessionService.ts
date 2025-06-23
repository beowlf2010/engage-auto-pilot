
import { supabase } from '@/integrations/supabase/client';

export interface UploadSession {
  id: string;
  userId: string;
  sessionStart: Date;
  lastActivity: Date;
  uploadCount: number;
  status: 'active' | 'completed' | 'expired';
  autoCleanupDisabled: boolean;
}

class UploadSessionService {
  private readonly SESSION_TIMEOUT_MINUTES = 30;
  private readonly SESSION_KEY = 'inventory_upload_session';

  async startSession(userId: string): Promise<UploadSession> {
    const session: UploadSession = {
      id: crypto.randomUUID(),
      userId,
      sessionStart: new Date(),
      lastActivity: new Date(),
      uploadCount: 0,
      status: 'active',
      autoCleanupDisabled: true
    };

    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    console.log('📁 [UPLOAD SESSION] Started new session:', session.id);
    return session;
  }

  getActiveSession(): UploadSession | null {
    try {
      const stored = localStorage.getItem(this.SESSION_KEY);
      if (!stored) return null;

      const session: UploadSession = JSON.parse(stored);
      
      // Check if session has expired
      const now = new Date();
      const lastActivity = new Date(session.lastActivity);
      const minutesSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60);

      if (minutesSinceActivity > this.SESSION_TIMEOUT_MINUTES) {
        console.log('📁 [UPLOAD SESSION] Session expired, removing');
        this.endSession();
        return null;
      }

      return session;
    } catch (error) {
      console.warn('📁 [UPLOAD SESSION] Error getting session:', error);
      return null;
    }
  }

  updateSessionActivity(uploadId?: string): void {
    const session = this.getActiveSession();
    if (!session) return;

    session.lastActivity = new Date();
    session.uploadCount += 1;

    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    console.log(`📁 [UPLOAD SESSION] Updated activity - ${session.uploadCount} uploads in session`);
  }

  shouldSkipAutoCleanup(): boolean {
    const session = this.getActiveSession();
    return session?.autoCleanupDisabled ?? false;
  }

  endSession(): void {
    const session = this.getActiveSession();
    if (session) {
      console.log(`📁 [UPLOAD SESSION] Ending session ${session.id} after ${session.uploadCount} uploads`);
    }
    localStorage.removeItem(this.SESSION_KEY);
  }

  completeSession(): void {
    const session = this.getActiveSession();
    if (session) {
      session.status = 'completed';
      session.autoCleanupDisabled = false;
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      console.log(`📁 [UPLOAD SESSION] Completed session ${session.id}`);
    }
  }
}

export const uploadSessionService = new UploadSessionService();
