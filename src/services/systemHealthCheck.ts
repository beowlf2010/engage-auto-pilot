import { supabase } from '@/integrations/supabase/client';

export interface SystemCheck {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  details?: any;
  error?: string;
}

export interface SystemHealthReport {
  overallStatus: 'pending' | 'running' | 'success' | 'error';
  checks: SystemCheck[];
  canStart: boolean;
  summary: string;
}

export class SystemHealthService {
  private static instance: SystemHealthService;
  
  static getInstance(): SystemHealthService {
    if (!SystemHealthService.instance) {
      SystemHealthService.instance = new SystemHealthService();
    }
    return SystemHealthService.instance;
  }

  async runComprehensiveSystemCheck(): Promise<SystemHealthReport> {
    const checks: SystemCheck[] = [
      { name: 'Database Connection', status: 'pending', message: 'Testing database connectivity...' },
      { name: 'Edge Functions', status: 'pending', message: 'Testing edge function health...' },
      { name: 'AI System', status: 'pending', message: 'Testing AI generation capabilities...' },
      { name: 'Emergency Systems', status: 'pending', message: 'Testing emergency stop/start controls...' },
      { name: 'Configuration', status: 'pending', message: 'Verifying system configuration...' }
    ];

    const report: SystemHealthReport = {
      overallStatus: 'running',
      checks,
      canStart: false,
      summary: 'Running system health checks...'
    };

    try {
      // Test 1: Database Connection
      await this.testDatabaseConnection(checks[0]);
      
      // Test 2: Edge Functions
      await this.testEdgeFunctions(checks[1]);
      
      // Test 3: AI System
      await this.testAISystem(checks[2]);
      
      // Test 4: Emergency Systems
      await this.testEmergencySystems(checks[3]);
      
      // Test 5: Configuration
      await this.testConfiguration(checks[4]);

      // Determine overall status
      const hasErrors = checks.some(check => check.status === 'error');
      const allComplete = checks.every(check => check.status === 'success' || check.status === 'error');

      if (hasErrors) {
        report.overallStatus = 'error';
        report.canStart = false;
        report.summary = `System check failed. ${checks.filter(c => c.status === 'error').length} error(s) found.`;
      } else if (allComplete) {
        report.overallStatus = 'success';
        report.canStart = true;
        report.summary = 'All systems operational. Ready to start AI operations.';
      }

    } catch (error) {
      report.overallStatus = 'error';
      report.canStart = false;
      report.summary = `System check failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return report;
  }

  private async testDatabaseConnection(check: SystemCheck): Promise<void> {
    try {
      check.status = 'running';
      check.message = 'Testing database connection...';

      // Test basic connection
      const { data: connectionTest, error: connectionError } = await supabase
        .from('leads')
        .select('count')
        .limit(1);

      if (connectionError) {
        throw new Error(`Database connection failed: ${connectionError.message}`);
      }

      // Test critical tables
      const { data: aiSettings, error: aiError } = await supabase
        .from('ai_emergency_settings')
        .select('*')
        .limit(1);

      if (aiError) {
        throw new Error(`AI settings table inaccessible: ${aiError.message}`);
      }

      check.status = 'success';
      check.message = 'Database connection successful';
      check.details = { tablesChecked: ['leads', 'ai_emergency_settings'] };

    } catch (error) {
      check.status = 'error';
      check.error = error instanceof Error ? error.message : 'Unknown database error';
      check.message = 'Database connection failed';
    }
  }

  private async testEdgeFunctions(check: SystemCheck): Promise<void> {
    try {
      check.status = 'running';
      check.message = 'Testing edge functions...';

      // Test a simple edge function
      const { data, error } = await supabase.functions.invoke('test-simple', {
        body: { test: true }
      });

      if (error) {
        throw new Error(`Edge function test failed: ${error.message}`);
      }

      check.status = 'success';
      check.message = 'Edge functions operational';
      check.details = { testFunction: 'test-simple', response: data };

    } catch (error) {
      check.status = 'error';
      check.error = error instanceof Error ? error.message : 'Unknown edge function error';
      check.message = 'Edge functions failed';
    }
  }

  private async testAISystem(check: SystemCheck): Promise<void> {
    try {
      check.status = 'running';
      check.message = 'Testing AI system...';

      // Test AI automation trigger
      const { data, error } = await supabase.functions.invoke('trigger-ai-test', {
        body: { systemCheck: true }
      });

      if (error) {
        throw new Error(`AI system test failed: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(`AI system test returned failure: ${data?.error || 'Unknown error'}`);
      }

      check.status = 'success';
      check.message = 'AI system operational';
      check.details = data?.results || {};

    } catch (error) {
      check.status = 'error';
      check.error = error instanceof Error ? error.message : 'Unknown AI system error';
      check.message = 'AI system failed';
    }
  }

  private async testEmergencySystems(check: SystemCheck): Promise<void> {
    try {
      check.status = 'running';
      check.message = 'Testing emergency systems...';

      // Test emergency settings access
      const { data, error } = await supabase
        .from('ai_emergency_settings')
        .select('*')
        .limit(1);

      if (error) {
        throw new Error(`Emergency settings inaccessible: ${error.message}`);
      }

      // Test automation control
      const { data: automationData, error: automationError } = await supabase
        .from('ai_automation_control')
        .select('*')
        .limit(1);

      if (automationError) {
        throw new Error(`Automation control inaccessible: ${automationError.message}`);
      }

      check.status = 'success';
      check.message = 'Emergency systems operational';
      check.details = { emergencySettings: data, automationControl: automationData };

    } catch (error) {
      check.status = 'error';
      check.error = error instanceof Error ? error.message : 'Unknown emergency system error';
      check.message = 'Emergency systems failed';
    }
  }

  private async testConfiguration(check: SystemCheck): Promise<void> {
    try {
      check.status = 'running';
      check.message = 'Testing configuration...';

      // Test basic configuration without accessing protected properties
      const config = {
        hasSupabaseClient: !!supabase,
        hasAuth: !!supabase.auth,
        canConnect: true,
      };

      // Test actual connectivity instead of inspecting properties
      const { error } = await supabase.from('profiles').select('count').limit(1);
      if (error && error.message.includes('JWT')) {
        config.canConnect = false;
        throw new Error('Authentication configuration issue');
      }

      check.status = 'success';
      check.message = 'Configuration valid';
      check.details = config;

    } catch (error) {
      check.status = 'error';
      check.error = error instanceof Error ? error.message : 'Unknown configuration error';
      check.message = 'Configuration failed';
    }
  }
}

export const systemHealthService = SystemHealthService.getInstance();