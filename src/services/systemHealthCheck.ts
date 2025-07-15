import { supabase } from '@/integrations/supabase/client';

export interface SystemCheck {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  details?: any;
  error?: string;
  critical?: boolean;
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
      { name: 'Database Connection', status: 'pending', message: 'Testing database connectivity...', critical: true },
      { name: 'Database Integrity', status: 'pending', message: 'Verifying critical tables and data...', critical: true },
      { name: 'OpenAI API', status: 'pending', message: 'Testing OpenAI API connection...', critical: true },
      { name: 'Edge Functions', status: 'pending', message: 'Testing edge function health...', critical: true },
      { name: 'AI Generation', status: 'pending', message: 'Testing AI message generation...', critical: true },
      { name: 'SMS Service', status: 'pending', message: 'Testing SMS communication...', critical: false },
      { name: 'Emergency Systems', status: 'pending', message: 'Testing emergency controls...', critical: true },
      { name: 'Configuration', status: 'pending', message: 'Verifying system configuration...', critical: true }
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
      
      // Test 2: Database Integrity
      await this.testDatabaseIntegrity(checks[1]);
      
      // Test 3: OpenAI API
      await this.testOpenAIAPI(checks[2]);
      
      // Test 4: Edge Functions
      await this.testEdgeFunctions(checks[3]);
      
      // Test 5: AI Generation
      await this.testAIGeneration(checks[4]);
      
      // Test 6: SMS Service
      await this.testSMSService(checks[5]);
      
      // Test 7: Emergency Systems
      await this.testEmergencySystems(checks[6]);
      
      // Test 8: Configuration
      await this.testConfiguration(checks[7]);

      // Determine overall status
      const criticalErrors = checks.filter(check => check.status === 'error' && check.critical).length;
      const nonCriticalErrors = checks.filter(check => check.status === 'error' && !check.critical).length;
      const allComplete = checks.every(check => check.status === 'success' || check.status === 'error');

      if (criticalErrors > 0) {
        report.overallStatus = 'error';
        report.canStart = false;
        report.summary = `System check failed. ${criticalErrors} critical error(s) found that prevent startup.`;
      } else if (nonCriticalErrors > 0 && allComplete) {
        report.overallStatus = 'success';
        report.canStart = true;
        report.summary = `System ready with ${nonCriticalErrors} non-critical warning(s). Safe to start.`;
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

      check.status = 'success';
      check.message = 'Database connection successful';
      check.details = { connectionTest: 'passed' };

    } catch (error) {
      check.status = 'error';
      check.error = error instanceof Error ? error.message : 'Unknown database error';
      check.message = 'Database connection failed';
    }
  }

  private async testDatabaseIntegrity(check: SystemCheck): Promise<void> {
    try {
      check.status = 'running';
      check.message = 'Testing database integrity...';

      const results = [];
      
      // Test critical tables individually to avoid TypeScript issues
      const criticalTables = [
        { name: 'leads', test: () => supabase.from('leads').select('count').limit(1) },
        { name: 'conversations', test: () => supabase.from('conversations').select('count').limit(1) },
        { name: 'ai_emergency_settings', test: () => supabase.from('ai_emergency_settings').select('count').limit(1) },
        { name: 'ai_automation_control', test: () => supabase.from('ai_automation_control').select('count').limit(1) },
        { name: 'ai_lead_scores', test: () => supabase.from('ai_lead_scores').select('count').limit(1) },
        { name: 'profiles', test: () => supabase.from('profiles').select('count').limit(1) },
      ];

      for (const table of criticalTables) {
        const { data, error } = await table.test();
        results.push({ table: table.name, accessible: !error, error: error?.message });
        if (error && ['leads', 'ai_emergency_settings', 'ai_automation_control'].includes(table.name)) {
          throw new Error(`Critical table ${table.name} inaccessible: ${error.message}`);
        }
      }

      check.status = 'success';
      check.message = 'Database integrity verified';
      check.details = { tablesChecked: results };

    } catch (error) {
      check.status = 'error';
      check.error = error instanceof Error ? error.message : 'Unknown database integrity error';
      check.message = 'Database integrity check failed';
    }
  }

  private async testOpenAIAPI(check: SystemCheck): Promise<void> {
    try {
      check.status = 'running';
      check.message = 'Testing OpenAI API connection...';

      // Test OpenAI through edge function to avoid exposing API key
      const { data, error } = await supabase.functions.invoke('trigger-ai-test', {
        body: { systemCheck: true, testType: 'openai' }
      });

      if (error) {
        throw new Error(`OpenAI API test failed: ${error.message}`);
      }

      if (!data?.results?.openAIConnection) {
        throw new Error('OpenAI API connection failed - check API key configuration');
      }

      check.status = 'success';
      check.message = 'OpenAI API connection successful';
      check.details = { apiTest: 'passed', generation: data.results.aiGeneration };

    } catch (error) {
      check.status = 'error';
      check.error = error instanceof Error ? error.message : 'Unknown OpenAI API error';
      check.message = 'OpenAI API test failed';
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

  private async testAIGeneration(check: SystemCheck): Promise<void> {
    try {
      check.status = 'running';
      check.message = 'Testing AI generation capabilities...';

      // Test AI automation trigger
      const { data, error } = await supabase.functions.invoke('trigger-ai-test', {
        body: { systemCheck: true, testType: 'generation' }
      });

      if (error) {
        throw new Error(`AI generation test failed: ${error.message}`);
      }

      if (!data?.results?.aiGeneration) {
        throw new Error('AI generation test failed - system cannot generate responses');
      }

      check.status = 'success';
      check.message = 'AI generation system operational';
      check.details = data?.results || {};

    } catch (error) {
      check.status = 'error';
      check.error = error instanceof Error ? error.message : 'Unknown AI generation error';
      check.message = 'AI generation test failed';
    }
  }

  private async testSMSService(check: SystemCheck): Promise<void> {
    try {
      check.status = 'running';
      check.message = 'Testing SMS service...';

      // Test SMS configuration and connectivity
      const { data, error } = await supabase.functions.invoke('test-sms', {
        body: { systemCheck: true, testMode: true }
      });

      if (error) {
        // SMS is non-critical, so we warn but don't fail
        check.status = 'error';
        check.error = `SMS service unavailable: ${error.message}`;
        check.message = 'SMS service test failed (non-critical)';
        return;
      }

      check.status = 'success';
      check.message = 'SMS service operational';
      check.details = { smsTest: 'passed' };

    } catch (error) {
      check.status = 'error';
      check.error = error instanceof Error ? error.message : 'Unknown SMS service error';
      check.message = 'SMS service test failed (non-critical)';
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