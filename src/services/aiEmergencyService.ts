
import { supabase } from '@/integrations/supabase/client';

interface AIEmergencySettings {
  aiDisabled: boolean;
  disabledAt?: string;
  disabledBy?: string;
  disableReason?: string;
  lastChecked: string;
}

class AIEmergencyService {
  private static instance: AIEmergencyService;
  private settings: AIEmergencySettings | null = null;
  private listeners: Set<(disabled: boolean) => void> = new Set();

  static getInstance(): AIEmergencyService {
    if (!AIEmergencyService.instance) {
      AIEmergencyService.instance = new AIEmergencyService();
    }
    return AIEmergencyService.instance;
  }

  async initialize(): Promise<void> {
    await this.loadSettings();
    this.startPeriodicCheck();
  }

  private async loadSettings(): Promise<void> {
    try {
      // Try to load from database first
      const { data } = await supabase
        .from('ai_emergency_settings')
        .select('*')
        .single();

      if (data) {
        this.settings = {
          aiDisabled: data.ai_disabled,
          disabledAt: data.disabled_at,
          disabledBy: data.disabled_by,
          disableReason: data.disable_reason,
          lastChecked: new Date().toISOString()
        };
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem('ai_emergency_settings');
        if (stored) {
          this.settings = JSON.parse(stored);
        } else {
          this.settings = {
            aiDisabled: false,
            lastChecked: new Date().toISOString()
          };
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load AI emergency settings, using defaults:', error);
      this.settings = {
        aiDisabled: false,
        lastChecked: new Date().toISOString()
      };
    }
  }

  private async saveSettings(): Promise<void> {
    if (!this.settings) return;

    try {
      // Save to database
      await supabase
        .from('ai_emergency_settings')
        .upsert({
          ai_disabled: this.settings.aiDisabled,
          disabled_at: this.settings.disabledAt,
          disabled_by: this.settings.disabledBy,
          disable_reason: this.settings.disableReason,
          updated_at: new Date().toISOString()
        });

      // Also save to localStorage as backup
      localStorage.setItem('ai_emergency_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('❌ Error saving AI emergency settings:', error);
      // Fallback to localStorage only
      localStorage.setItem('ai_emergency_settings', JSON.stringify(this.settings));
    }
  }

  async disableAI(reason: string = 'Emergency shutdown', userId?: string): Promise<void> {
    if (!this.settings) await this.initialize();

    this.settings = {
      ...this.settings!,
      aiDisabled: true,
      disabledAt: new Date().toISOString(),
      disabledBy: userId,
      disableReason: reason,
      lastChecked: new Date().toISOString()
    };

    await this.saveSettings();
    this.notifyListeners(true);

    console.log('🚨 AI EMERGENCY SHUTDOWN ACTIVATED:', reason);
  }

  async enableAI(userId?: string): Promise<void> {
    if (!this.settings) await this.initialize();

    this.settings = {
      ...this.settings!,
      aiDisabled: false,
      disabledAt: undefined,
      disabledBy: undefined,
      disableReason: undefined,
      lastChecked: new Date().toISOString()
    };

    await this.saveSettings();
    this.notifyListeners(false);

    console.log('✅ AI Re-enabled by user:', userId);
  }

  isAIDisabled(): boolean {
    return this.settings?.aiDisabled || false;
  }

  getDisableInfo(): { reason?: string; disabledAt?: string; disabledBy?: string } | null {
    if (!this.settings?.aiDisabled) return null;
    
    return {
      reason: this.settings.disableReason,
      disabledAt: this.settings.disabledAt,
      disabledBy: this.settings.disabledBy
    };
  }

  onStatusChange(callback: (disabled: boolean) => void): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(disabled: boolean): void {
    this.listeners.forEach(callback => {
      try {
        callback(disabled);
      } catch (error) {
        console.error('❌ Error in AI emergency status listener:', error);
      }
    });
  }

  private startPeriodicCheck(): void {
    // Check for settings changes every 30 seconds
    setInterval(async () => {
      try {
        const oldDisabled = this.settings?.aiDisabled;
        await this.loadSettings();
        const newDisabled = this.settings?.aiDisabled;
        
        if (oldDisabled !== newDisabled) {
          this.notifyListeners(newDisabled || false);
        }
      } catch (error) {
        console.error('❌ Error in periodic AI settings check:', error);
      }
    }, 30000);
  }

  // Safety check before any AI action
  async checkBeforeAIAction(action: string): Promise<boolean> {
    if (!this.settings) await this.initialize();
    
    if (this.isAIDisabled()) {
      const info = this.getDisableInfo();
      console.log(`🚨 AI Action blocked (${action}):`, info?.reason || 'Emergency shutdown active');
      return false;
    }
    
    return true;
  }
}

export const aiEmergencyService = AIEmergencyService.getInstance();
