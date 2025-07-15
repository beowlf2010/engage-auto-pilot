import { supabase } from '@/integrations/supabase/client';

export interface TroubleshootingStep {
  step: string;
  description: string;
  action?: () => Promise<void>;
  autoFix?: boolean;
  actionLabel?: string;
}

export interface SystemCheck {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  details?: any;
  error?: string;
  critical?: boolean;
  troubleshootingSteps?: TroubleshootingStep[];
  remediationSuggestions?: string[];
  canAutoFix?: boolean;
}

export interface SystemHealthReport {
  overallStatus: 'pending' | 'running' | 'success' | 'error';
  checks: SystemCheck[];
  canStart: boolean;
  summary: string;
  healthScore: number;
  recommendations: string[];
  criticalIssues: string[];
  warnings: string[];
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
      summary: 'Running system health checks...',
      healthScore: 0,
      recommendations: [],
      criticalIssues: [],
      warnings: []
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

      // Calculate health score and generate recommendations
      const successCount = checks.filter(c => c.status === 'success').length;
      report.healthScore = Math.round((successCount / checks.length) * 100);
      report.criticalIssues = checks.filter(c => c.status === 'error' && c.critical).map(c => c.name);
      report.warnings = checks.filter(c => c.status === 'error' && !c.critical).map(c => c.name);
      report.recommendations = this.generateRecommendations(checks);

    } catch (error) {
      report.overallStatus = 'error';
      report.canStart = false;
      report.summary = `System check failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      report.healthScore = 0;
      report.criticalIssues = ['System Check Failed'];
      report.recommendations = ['Contact technical support for assistance'];
    }

    return report;
  }

  private generateRecommendations(checks: SystemCheck[]): string[] {
    const recommendations: string[] = [];
    
    const failedChecks = checks.filter(c => c.status === 'error');
    if (failedChecks.length === 0) {
      recommendations.push('All systems are functioning optimally');
      return recommendations;
    }

    // Critical issues first
    const criticalFailures = failedChecks.filter(c => c.critical);
    if (criticalFailures.length > 0) {
      recommendations.push('🚨 Critical Issues Found:');
      criticalFailures.forEach(check => {
        recommendations.push(`• Fix ${check.name}: ${check.error}`);
        if (check.remediationSuggestions) {
          check.remediationSuggestions.forEach(suggestion => {
            recommendations.push(`  - ${suggestion}`);
          });
        }
      });
    }

    // Non-critical warnings
    const warnings = failedChecks.filter(c => !c.critical);
    if (warnings.length > 0) {
      recommendations.push('⚠️ Non-Critical Warnings:');
      warnings.forEach(check => {
        recommendations.push(`• ${check.name}: ${check.error}`);
      });
    }

    return recommendations;
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
      check.troubleshootingSteps = [
        { step: 'Verify Network Connection', description: 'Check if you can access the internet and Supabase dashboard' },
        { step: 'Check Supabase Status', description: 'Visit status.supabase.com to verify service availability' },
        { step: 'Verify Project Settings', description: 'Ensure project URL and API keys are correct' },
        { step: 'Check RLS Policies', description: 'Verify Row Level Security policies allow access to leads table' }
      ];
      check.remediationSuggestions = [
        'Check your internet connection',
        'Verify Supabase project is active',
        'Ensure API keys are valid and not expired',
        'Check if RLS policies are properly configured'
      ];
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
      check.troubleshootingSteps = [
        { step: 'Check Table Existence', description: 'Verify all required tables exist in the database' },
        { step: 'Verify RLS Policies', description: 'Check that Row Level Security policies are properly configured' },
        { step: 'Test User Permissions', description: 'Ensure current user has proper access to critical tables' },
        { step: 'Run Database Migration', description: 'Check if database schema is up to date' }
      ];
      check.remediationSuggestions = [
        'Run database migrations to ensure schema is current',
        'Check RLS policies for critical tables',
        'Verify user authentication and permissions',
        'Contact administrator if tables are missing'
      ];
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
      check.troubleshootingSteps = [
        { step: 'Verify API Key', description: 'Check if OpenAI API key is properly configured in Supabase secrets' },
        { step: 'Test API Connectivity', description: 'Verify OpenAI API is accessible from your location' },
        { step: 'Check API Limits', description: 'Ensure you have sufficient API credits and rate limits' },
        { step: 'Verify Edge Function', description: 'Check if trigger-ai-test edge function is deployed and working' }
      ];
      check.remediationSuggestions = [
        'Configure OpenAI API key in Supabase dashboard under Settings > Edge Functions',
        'Verify API key has proper permissions and billing is active',
        'Check OpenAI API status at status.openai.com',
        'Test edge function deployment'
      ];
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
      check.troubleshootingSteps = [
        { step: 'Check Function Deployment', description: 'Verify edge functions are properly deployed' },
        { step: 'Test Function Logs', description: 'Check edge function logs for errors' },
        { step: 'Verify Permissions', description: 'Ensure functions have proper permissions' },
        { step: 'Test Network Connectivity', description: 'Verify functions can connect to external services' }
      ];
      check.remediationSuggestions = [
        'Redeploy edge functions',
        'Check function logs in Supabase dashboard',
        'Verify function permissions and secrets',
        'Test network connectivity from edge functions'
      ];
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
      check.troubleshootingSteps = [
        { step: 'Verify OpenAI Integration', description: 'Check if OpenAI API is properly configured' },
        { step: 'Test AI Functions', description: 'Verify AI edge functions are working' },
        { step: 'Check Templates', description: 'Ensure AI message templates are available' },
        { step: 'Test Lead Context', description: 'Verify AI can access lead data for generation' }
      ];
      check.remediationSuggestions = [
        'Fix OpenAI API configuration',
        'Verify AI edge functions are deployed',
        'Check AI message templates in database',
        'Test lead data access permissions'
      ];
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
        check.troubleshootingSteps = [
          { step: 'Check Twilio Configuration', description: 'Verify Twilio API credentials are configured' },
          { step: 'Test Twilio Connectivity', description: 'Check if Twilio services are accessible' },
          { step: 'Verify Phone Numbers', description: 'Ensure Twilio phone numbers are active' },
          { step: 'Check Rate Limits', description: 'Verify SMS rate limits are not exceeded' }
        ];
        check.remediationSuggestions = [
          'Configure Twilio API credentials in Settings',
          'Verify Twilio account is active and funded',
          'Check Twilio phone number configuration',
          'Test SMS sending with test numbers'
        ];
        return;
      }

      // Handle enhanced response format with success/warning cases
      if (data?.success === true) {
        if (data.warning) {
          // Success with warning - still operational but with issues
          check.status = 'success';
          check.message = `SMS service operational (with warnings)`;
          check.details = { 
            smsTest: 'passed_with_warnings',
            warningMessage: data.error || data.message,
            credentialsStatus: data.credentialsStatus || 'unknown',
            troubleshooting: data.troubleshooting
          };
          // Add warning info for monitoring
          check.error = `Warning: ${data.error || 'SMS service has non-critical issues'}`;
        } else {
          // Full success
          check.status = 'success';
          check.message = 'SMS service fully operational';
          check.details = { 
            smsTest: 'passed',
            twilioAccountName: data.twilioAccountName,
            twilioPhoneNumber: data.twilioPhoneNumber,
            credentialsStatus: data.credentialsStatus || 'valid'
          };
        }
      } else {
        // Failure case
        check.status = 'error';
        check.error = data?.error || 'SMS service test failed';
        check.message = 'SMS service test failed (non-critical)';
        check.details = {
          smsTest: 'failed',
          twilioError: data?.twilioError,
          troubleshooting: data?.troubleshooting,
          credentialsStatus: data?.credentialsStatus || 'unknown'
        };
        check.troubleshootingSteps = [
          { step: 'Check Twilio Configuration', description: data?.troubleshooting || 'Verify Twilio API credentials are configured' },
          { step: 'Test Twilio Connectivity', description: 'Check if Twilio services are accessible' },
          { step: 'Verify Phone Numbers', description: 'Ensure Twilio phone numbers are active' },
          { step: 'Check Rate Limits', description: 'Verify SMS rate limits are not exceeded' }
        ];
        check.remediationSuggestions = [
          'Configure Twilio API credentials in Settings',
          'Verify Twilio account is active and funded',
          'Check Twilio phone number configuration',
          'Test SMS sending with test numbers'
        ];
      }

    } catch (error) {
      check.status = 'error';
      check.error = error instanceof Error ? error.message : 'Unknown SMS service error';
      check.message = 'SMS service test failed (non-critical)';
      check.troubleshootingSteps = [
        { step: 'Check Twilio Configuration', description: 'Verify Twilio API credentials are configured' },
        { step: 'Test Twilio Connectivity', description: 'Check if Twilio services are accessible' },
        { step: 'Verify Phone Numbers', description: 'Ensure Twilio phone numbers are active' },
        { step: 'Check Rate Limits', description: 'Verify SMS rate limits are not exceeded' }
      ];
      check.remediationSuggestions = [
        'Configure Twilio API credentials in Settings',
        'Verify Twilio account is active and funded',
        'Check Twilio phone number configuration',
        'Test SMS sending with test numbers'
      ];
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
      check.troubleshootingSteps = [
        { step: 'Check Emergency Tables', description: 'Verify emergency system tables exist and are accessible' },
        { step: 'Test RLS Policies', description: 'Check Row Level Security policies for emergency tables' },
        { step: 'Verify User Permissions', description: 'Ensure current user can access emergency controls' },
        { step: 'Test Emergency Functions', description: 'Verify emergency stop/start functions work' }
      ];
      check.remediationSuggestions = [
        'Verify emergency system tables exist',
        'Check RLS policies for emergency tables',
        'Ensure user has proper emergency permissions',
        'Test emergency stop/start functionality'
      ];
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
      check.troubleshootingSteps = [
        { step: 'Check Environment Variables', description: 'Verify all required environment variables are set' },
        { step: 'Test Authentication', description: 'Verify user authentication is working' },
        { step: 'Check API Keys', description: 'Ensure all API keys are valid and not expired' },
        { step: 'Verify Project Settings', description: 'Check Supabase project configuration' }
      ];
      check.remediationSuggestions = [
        'Verify environment variables are properly set',
        'Check authentication configuration',
        'Ensure API keys are valid',
        'Review project settings in Supabase dashboard'
      ];
    }
  }

  // Auto-fix methods
  async autoFixDatabaseConnection(): Promise<boolean> {
    try {
      // Attempt to reconnect to database
      await supabase.from('leads').select('count').limit(1);
      return true;
    } catch {
      return false;
    }
  }

  async autoFixEmergencySettings(): Promise<boolean> {
    try {
      // Ensure emergency settings exist
      const { error } = await supabase
        .from('ai_emergency_settings')
        .upsert({ ai_disabled: false });
      return !error;
    } catch {
      return false;
    }
  }
}

export const systemHealthService = SystemHealthService.getInstance();